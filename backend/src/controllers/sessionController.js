// src/controllers/sessionController.js
import { pool } from '../config/db.js';
import { callCalculationEngine } from '../services/calculationService.js';

export const createBillingSession = async (req, res) => {
  const { group_id, total_cost } = req.body;
  const user_id = req.user.id;

  if (!group_id ||!total_cost || total_cost <= 0) {
    return res.status(400).json({ error: 'Group ID and valid total cost are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify user is a member of the group
    const memberCheck = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('User is not a member of this group.');
    }

    // Fetch all appliances for the group
    const appliancesResult = await client.query(`
      SELECT user_id, wattage, daily_hours, device_name
      FROM appliances
      WHERE group_id = $1 AND status = 'active'
    `, [group_id]);

    // Format appliances for Python engine
    const appliances = appliancesResult.rows.map(app => ({
      user_id: app.user_id,
      device_name: app.device_name,
      wattage: app.wattage,
      daily_hours: app.daily_hours
    }));

    // Get all group members
    const membersResult = await client.query(`
      SELECT user_id FROM group_members WHERE group_id = $1
    `, [group_id]);

    const memberIds = membersResult.rows.map(m => m.user_id);

    // Call Python calculation engine
    let costAllocation = {};
    try {
      const calculationResult = await callCalculationEngine(appliances, total_cost, memberIds);
      costAllocation = calculationResult.cost_per_user;
    } catch (engineError) {
      await client.query('ROLLBACK');
      console.error('Calculation engine failed:', engineError.message);
      return res.status(500).json({
        error: 'Failed to calculate costs. Please try again.',
        details: engineError.message
      });
    }

    // Create billing session
    const sessionResult = await client.query(`
      INSERT INTO billing_sessions (group_id, session_start, total_cost, status)
      VALUES ($1, CURRENT_TIMESTAMP, $2, 'active')
      RETURNING id
    `, [group_id, total_cost]);

    const sessionId = sessionResult.rows[0].id;

    // Create consumption breakdown for each member
    for (const memberId of memberIds) {
      const allocatedCost = costAllocation[memberId] || 0;
      const consumptionKwh = (appliances.filter(a => a.user_id === memberId).reduce((sum, a) => {
        return sum + ((a.wattage / 1000) * a.daily_hours);
      }, 0)).toFixed(4);

      await client.query(`
        INSERT INTO consumption_breakdown
        (session_id, user_id, group_id, consumption_kwh, cost_allocated, outstanding, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'calculated')
      `, [sessionId, memberId, group_id, consumptionKwh, allocatedCost, allocatedCost]);
    }

    // Update group's last_active_session
    await client.query(`
      UPDATE meter_groups SET last_active_session = $1 WHERE id = $2
    `, [sessionId, group_id]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Billing session created successfully',
      session_id: sessionId,
      total_cost,
      cost_allocation: costAllocation,
      member_count: memberIds.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating billing session:', error);
    res.status(500).json({ error: error.message || 'Internal server error while creating session.' });
  } finally {
    client.release();
  }
};

export const getBillingHistory = async (req, res) => {
  const { group_id } = req.params;
  const user_id = req.user.id;

  try {
    // Verify user is a member
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get all sessions for the group
    const sessionsResult = await pool.query(`
      SELECT id, session_start, session_end, total_cost, status
      FROM billing_sessions
      WHERE group_id = $1
      ORDER BY session_start DESC
    `, [group_id]);

    // For each session, get the consumption breakdown
    const sessionsWithBreakdown = await Promise.all(
      sessionsResult.rows.map(async (session) => {
        const breakdownResult = await pool.query(`
          SELECT u.name, cb.consumption_kwh, cb.cost_allocated, cb.cost_paid, cb.outstanding
          FROM consumption_breakdown cb
          JOIN users u ON cb.user_id = u.id
          WHERE cb.session_id = $1
          ORDER BY u.name
        `, [session.id]);

        return {
          ...session,
          breakdown: breakdownResult.rows
        };
      })
    );

    res.status(200).json({
      message: 'Billing history retrieved',
      sessions: sessionsWithBreakdown
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Internal server error while fetching history.' });
  }
};

export const settleSession = async (req, res) => {
  const { session_id } = req.body;
  const user_id = req.user.id;

  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get session details
    const sessionResult = await client.query(
      'SELECT id, group_id, status FROM billing_sessions WHERE id = $1',
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found.');
    }

    const session = sessionResult.rows[0];

    // Verify user is host or member
    const memberCheck = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [session.group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('Access denied.');
    }

    // Mark session as settled
    await client.query(
      "UPDATE billing_sessions SET status = 'settled', session_end = CURRENT_TIMESTAMP WHERE id = $1",
      [session_id]
    );

    // Update consumption breakdown status
    await client.query(
      "UPDATE consumption_breakdown SET status = 'settled' WHERE session_id = $1",
      [session_id]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: 'Session settled successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error settling session:', error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  } finally {
    client.release();
  }
};

/**
 * Calculate cost breakdown for a group WITHOUT creating a session
 * This is used by the Settlement Modal to show usage-based cost allocation
 */
export const calculateGroupCosts = async (req, res) => {
  const { group_id, total_cost } = req.body;
  const user_id = req.user.id;

  if (!group_id || !total_cost || total_cost <= 0) {
    return res.status(400).json({ error: 'Group ID and valid total cost are required.' });
  }

  try {
    // Verify user is a member of the group
    const memberCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    // Fetch all appliances for the group
    const appliancesResult = await pool.query(`
      SELECT user_id, wattage, daily_hours, device_name
      FROM appliances
      WHERE group_id = $1 AND status = 'active'
    `, [group_id]);

    // Format appliances for Python engine
    const appliances = appliancesResult.rows.map(app => ({
      user_id: app.user_id,
      device_name: app.device_name,
      wattage: app.wattage,
      daily_hours: app.daily_hours
    }));

    // Get all group members
    const membersResult = await pool.query(`
      SELECT user_id FROM group_members WHERE group_id = $1
    `, [group_id]);

    const memberIds = membersResult.rows.map(m => m.user_id);

    // Call Python calculation engine
    const calculationResult = await callCalculationEngine(appliances, total_cost, memberIds);

    console.log('✅ Cost calculation result:', calculationResult);

    // Return the breakdown
    res.status(200).json({
      message: 'Cost breakdown calculated',
      cost_per_user: calculationResult.cost_per_user,
      consumption_per_user: calculationResult.consumption_per_user,
      percentage_per_user: calculationResult.percentage_per_user,
      total_consumption_kwh: calculationResult.total_consumption_kwh,
      total_cost: total_cost
    });

  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({
      error: 'Failed to calculate costs.',
      details: error.message
    });
  }
};
