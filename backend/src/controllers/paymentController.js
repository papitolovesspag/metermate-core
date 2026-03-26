// src/controllers/paymentController.js
import { pool } from '../config/db.js';
import crypto from 'crypto';
import { verifyPaymentWithRetry } from '../services/interswitchService.js';

export const initializePayment = async (req, res) => {
  const { group_id, amount } = req.body;
  const user_id = req.user.id;

  if (!group_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid group ID and amount are required.' });
  }

  // Verify user is member of group
  try {
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }
  } catch (error) {
    console.error('Error checking group membership:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }

  try {
    // 1. Generate a unique, secure Transaction Reference for Interswitch
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const txn_ref = `MM-${timestamp}-${randomString}`.toUpperCase();

    // 2. Log the intent in the database as 'Pending'
    const query = `
      INSERT INTO payments (user_id, group_id, amount, interswitch_ref, status, payment_type)
      VALUES ($1, $2, $3, $4, 'Pending', 'session_payment')
      RETURNING interswitch_ref;
    `;

    await pool.query(query, [user_id, group_id, amount, txn_ref]);

    // Send the reference to the frontend to pass into the Interswitch modal
    res.status(200).json({
      message: 'Payment initialized',
      txn_ref: txn_ref,
      amount: amount
    });

  } catch (error) {
    console.error('Error initializing payment:', error);
    res.status(500).json({ error: 'Internal server error while setting up payment.' });
  }
};

export const verifyPayment = async (req, res) => {
  const { txn_ref } = req.body;

  if (!txn_ref) {
    return res.status(400).json({ error: 'Transaction reference is required.' });
  }

  const client = await pool.connect();

  try {
    // Start Secure Transaction
    await client.query('BEGIN');

    // 1. Find the pending payment
    const paymentCheck = await client.query('SELECT * FROM payments WHERE interswitch_ref = $1', [txn_ref]);
    if (paymentCheck.rows.length === 0) {
      throw new Error('Payment reference not found.');
    }

    const payment = paymentCheck.rows[0];

    // Prevent double-crediting if this route gets hit twice accidentally
    if (payment.status === 'Successful') {
      await client.query('ROLLBACK');
      return res.status(200).json({ message: 'Payment was already verified and credited.' });
    }

    // ====================================================================
    // 🔒 REAL INTERSWITCH API VERIFICATION
    // Call the Interswitch service to verify the payment
    // ====================================================================
    const interswitchResult = await verifyPaymentWithRetry(txn_ref, 1);

    if (interswitchResult.success) {
      // 2. Mark the payment as Successful in the ledger
      await client.query(
        "UPDATE payments SET status = 'Successful', updated_at = CURRENT_TIMESTAMP WHERE interswitch_ref = $1",
        [txn_ref]
      );

      // 3. Add the money to the Meter Group's current balance!
      await client.query(
        "UPDATE meter_groups SET current_balance = current_balance + $1 WHERE id = $2",
        [payment.amount, payment.group_id]
      );

      // 4. Record transaction in history
      await client.query(`
        INSERT INTO transaction_history (group_id, user_id, transaction_type, amount, description, created_at)
        VALUES ($1, $2, 'payment', $3, $4, CURRENT_TIMESTAMP)
      `, [
        payment.group_id,
        payment.user_id,
        payment.amount,
        `Payment for meter group - Ref: ${txn_ref}`
      ]);

      await client.query('COMMIT');
      return res.status(200).json({
        message: 'Payment verified and balance updated!',
        success: true
      });
    } else {
      // Payment failed at Interswitch
      await client.query(
        "UPDATE payments SET status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE interswitch_ref = $1",
        [txn_ref]
      );
      await client.query('COMMIT');
      return res.status(400).json({
        error: 'Payment failed at gateway.',
        details: interswitchResult.error
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error during verification.' });
  } finally {
    client.release();
  }
};