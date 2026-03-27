import { pool } from '../config/db.js';
import crypto from 'crypto';
import { verifyPaymentWithRetry } from '../services/interswitchService.js';
import { getElectricityPaymentCode, makePayment } from '../services/billsPaymentService.js';
import { createGroupNotification } from '../services/notificationService.js';

const hasUserPaidInCycle = async (client, groupId, userId) => {
  const paidResult = await client.query(
    `SELECT
       COUNT(*)::int AS payment_count,
       COALESCE(SUM(amount), 0) AS total_paid
     FROM payments
     WHERE group_id = $1
       AND user_id = $2
       AND status = 'Successful'
       AND created_at >= COALESCE(
         (SELECT cycle_started_at FROM meter_groups WHERE id = $1),
         TIMESTAMP '1970-01-01'
       )`,
    [groupId, userId]
  );

  const row = paidResult.rows[0] || { payment_count: 0, total_paid: 0 };
  return {
    hasPaid: Number(row.payment_count) > 0,
    paymentCount: Number(row.payment_count) || 0,
    totalPaid: Number(row.total_paid) || 0
  };
};

export const getPaymentStatusForUser = async (req, res) => {
  const { group_id } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    const memberCheck = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const groupResult = await client.query(
      'SELECT id, target_amount, current_balance, cycle_started_at FROM meter_groups WHERE id = $1',
      [group_id]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    const group = groupResult.rows[0];

    const cyclePayment = await hasUserPaidInCycle(client, group_id, userId);
    const targetAmount = Number(group.target_amount) || 0;
    const currentBalance = Number(group.current_balance) || 0;

    return res.status(200).json({
      has_paid_in_cycle: cyclePayment.hasPaid,
      payment_count_in_cycle: cyclePayment.paymentCount,
      paid_amount_in_cycle: cyclePayment.totalPaid,
      is_fully_funded: targetAmount > 0 ? currentBalance >= targetAmount : false,
      cycle_started_at: group.cycle_started_at
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    return res.status(500).json({ error: 'Internal server error while fetching payment status.' });
  } finally {
    client.release();
  }
};

export const initializePayment = async (req, res) => {
  const { group_id, amount } = req.body;
  const user_id = req.user.id;
  const paymentAmount = Number(amount);

  if (!group_id || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: 'Valid group ID and amount are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const memberCheck = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );
    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const paymentState = await hasUserPaidInCycle(client, group_id, user_id);
    if (paymentState.hasPaid) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'You already paid for this meter cycle. Wait for the next cycle before paying again.'
      });
    }

    const txn_ref = `MM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();

    await client.query(
      `INSERT INTO payments (user_id, group_id, amount, interswitch_ref, status, payment_type)
       VALUES ($1, $2, $3, $4, 'Pending', 'session_payment')`,
      [user_id, group_id, paymentAmount, txn_ref]
    );

    await client.query('COMMIT');
    return res.status(200).json({
      message: 'Payment initialized.',
      txn_ref,
      amount: paymentAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing payment:', error);
    return res.status(500).json({ error: 'Internal server error while setting up payment.' });
  } finally {
    client.release();
  }
};

const triggerAutomaticElectricityPurchase = async (group_id, amount_to_buy, user_id, meter_number) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const latestGroup = await client.query(
      'SELECT id, meter_number, current_balance FROM meter_groups WHERE id = $1 FOR UPDATE',
      [group_id]
    );
    if (latestGroup.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    const lockedGroup = latestGroup.rows[0];

    const currentBalance = Number(lockedGroup.current_balance) || 0;
    const amountToBuy = Math.min(Number(amount_to_buy) || 0, currentBalance);
    if (amountToBuy <= 0) {
      await client.query('ROLLBACK');
      return;
    }

    const vas_req_ref = `VAS-AUTO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const codeResult = await getElectricityPaymentCode();
    const paymentCode = codeResult.paymentCode;

    const vasResponse = await makePayment(
      meter_number,
      Math.round(amountToBuy * 100),
      vas_req_ref,
      paymentCode
    );

    if (!vasResponse.success) {
      await client.query('ROLLBACK');
      return;
    }

    const token = vasResponse.data?.pin || vasResponse.data?.token || vasResponse.transactionRef;

    await client.query(
      `UPDATE meter_groups
       SET current_balance = current_balance - $1,
           cycle_started_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [amountToBuy, group_id]
    );

    await client.query(
      `INSERT INTO transaction_history (group_id, user_id, transaction_type, amount, description, created_at)
       VALUES ($1, $2, 'electricity_purchase', $3, $4, CURRENT_TIMESTAMP)`,
      [group_id, user_id, amountToBuy, `Automatic electricity purchase completed. Token: ${token}`]
    );

    await createGroupNotification({
      groupId: group_id,
      actorUserId: user_id,
      eventType: 'electricity_purchased',
      message: `Meter ${lockedGroup.meter_number} was recharged automatically.`,
      metadata: { amount: amountToBuy, token },
      client
    });

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Automatic electricity purchase failed:', error);
  } finally {
    client.release();
  }
};

export const verifyPayment = async (req, res) => {
  const { txn_ref } = req.body;

  if (!txn_ref) {
    return res.status(400).json({ error: 'Transaction reference is required.' });
  }

  const strictVerification = process.env.INTERSWITCH_DEMO_MODE !== 'true';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentCheck = await client.query(
      'SELECT * FROM payments WHERE interswitch_ref = $1 FOR UPDATE',
      [txn_ref]
    );
    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment reference not found.' });
    }
    const payment = paymentCheck.rows[0];

    if (payment.status === 'Successful') {
      await client.query('ROLLBACK');
      return res.status(200).json({ message: 'Payment already verified.' });
    }

    const verificationResult = await verifyPaymentWithRetry(txn_ref, 1);
    if (!verificationResult?.success && strictVerification) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Unable to verify payment with gateway.',
        details: verificationResult?.error || 'Verification failed'
      });
    }

    await client.query(
      "UPDATE payments SET status = 'Successful', updated_at = CURRENT_TIMESTAMP WHERE interswitch_ref = $1",
      [txn_ref]
    );

    const groupUpdate = await client.query(
      `UPDATE meter_groups
       SET current_balance = current_balance + $1
       WHERE id = $2
       RETURNING id, current_balance, target_amount, meter_number`,
      [payment.amount, payment.group_id]
    );
    const group = groupUpdate.rows[0];

    await client.query(
      `INSERT INTO transaction_history (group_id, user_id, transaction_type, amount, description, created_at)
       VALUES ($1, $2, 'payment', $3, $4, CURRENT_TIMESTAMP)`,
      [payment.group_id, payment.user_id, payment.amount, `Wallet funded via Webpay - Ref: ${txn_ref}`]
    );

    await createGroupNotification({
      groupId: payment.group_id,
      actorUserId: payment.user_id,
      eventType: 'payment_received',
      message: `A payment of NGN ${Number(payment.amount).toLocaleString()} was made to meter ${group.meter_number}.`,
      metadata: { amount: Number(payment.amount), txn_ref },
      client
    });

    await client.query('COMMIT');

    if (Number(group.current_balance) >= Number(group.target_amount)) {
      triggerAutomaticElectricityPurchase(group.id, group.target_amount, payment.user_id, group.meter_number)
        .catch((error) => {
          console.error('Automatic electricity purchase crash:', error);
        });
    }

    return res.status(200).json({
      message: 'Payment verified and balance updated.',
      success: true,
      gateway_status: verificationResult?.status || 'unknown'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Internal server error during verification.' });
  } finally {
    client.release();
  }
};

export const purchaseElectricity = async (req, res) => {
  const { group_id, amount } = req.body;
  const user_id = req.user.id;
  const purchaseAmount = Number(amount);

  if (!group_id || !Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
    return res.status(400).json({ error: 'Valid group ID and amount are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const memberCheck = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );
    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    const groupCheck = await client.query(
      'SELECT id, meter_number, current_balance FROM meter_groups WHERE id = $1 FOR UPDATE',
      [group_id]
    );
    if (groupCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Group not found.' });
    }
    const group = groupCheck.rows[0];

    if (Number(group.current_balance) < purchaseAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient group funds.' });
    }

    const vas_req_ref = `VAS-MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const codeResult = await getElectricityPaymentCode();

    const vasResponse = await makePayment(
      group.meter_number,
      Math.round(purchaseAmount * 100),
      vas_req_ref,
      codeResult.paymentCode
    );

    if (!vasResponse.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Grid payment failed.', details: vasResponse.error });
    }

    await client.query(
      `UPDATE meter_groups
       SET current_balance = current_balance - $1,
           cycle_started_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [purchaseAmount, group_id]
    );

    const token = vasResponse.data?.pin || vasResponse.data?.token || vasResponse.transactionRef;
    await client.query(
      `INSERT INTO transaction_history (group_id, user_id, transaction_type, amount, description, created_at)
       VALUES ($1, $2, 'electricity_purchase', $3, $4, CURRENT_TIMESTAMP)`,
      [group_id, user_id, purchaseAmount, `Manual electricity purchase completed. Token: ${token}`]
    );

    await createGroupNotification({
      groupId: group_id,
      actorUserId: user_id,
      eventType: 'electricity_purchased',
      message: `Meter ${group.meter_number} was recharged manually.`,
      metadata: { amount: purchaseAmount, token },
      client
    });

    await client.query('COMMIT');
    return res.status(200).json({ success: true, token });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error purchasing electricity:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  } finally {
    client.release();
  }
};
