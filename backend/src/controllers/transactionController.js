// src/controllers/transactionController.js
import { pool } from '../config/db.js';

export const getTransactionHistory = async (req, res) => {
  const { group_id } = req.params;
  const user_id = req.user.id;
  const { limit = 50 } = req.query;

  try {
    // Verify user is a member
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get transaction history (payments only)
    const result = await pool.query(`
      SELECT
        p.id,
        p.amount,
        p.status,
        p.payment_type,
        p.description,
        p.created_at,
        u.name as user_name,
        u.id as user_id
      FROM payments p
      JOIN users u ON p.user_id = u.id
      WHERE p.group_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [group_id, parseInt(limit)]);

    res.status(200).json({
      message: 'Transaction history retrieved',
      transactions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Internal server error while fetching history.' });
  }
};

export const recordTransaction = async (req, res) => {
  const { group_id, amount, transaction_type, description } = req.body;
  const user_id = req.user.id;

  if (!group_id || !amount || !transaction_type) {
    return res.status(400).json({
      error: 'Group ID, amount, and transaction type are required.'
    });
  }

  try {
    // Verify user is a member
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Record transaction
    const result = await pool.query(`
      INSERT INTO transaction_history (group_id, user_id, transaction_type, amount, description, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [group_id, user_id, transaction_type, amount, description || null]);

    res.status(201).json({
      message: 'Transaction recorded',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({ error: 'Internal server error while recording transaction.' });
  }
};
