// src/controllers/applianceController.js
import { pool } from '../config/db.js';

export const addAppliance = async (req, res) => {
  const { group_id, device_name, wattage, daily_hours } = req.body;
  const user_id = req.user.id;

  if (!group_id || !device_name || !wattage || !daily_hours) {
    return res.status(400).json({ error: 'All appliance fields are required.' });
  }

  try {
    // SECURITY CHECK: Verify the user is actually a member of this group
    const membershipCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }

    // Insert the appliance
    const query = `
      INSERT INTO appliances (user_id, group_id, device_name, wattage, daily_hours)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pool.query(query, [user_id, group_id, device_name, wattage, daily_hours]);

    res.status(201).json({
      message: 'Appliance logged successfully!',
      appliance: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding appliance:', error);
    res.status(500).json({ error: 'Internal server error while adding appliance.' });
  }
};

export const getGroupAppliances = async (req, res) => {
  const { group_id } = req.params;
  const user_id = req.user.id;

  try {
    // SECURITY CHECK: Verify the user is a member before showing them the group's data
    const membershipCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Fetch all appliances for this group, joined with the user's name so we know whose is whose
    const query = `
      SELECT a.*, u.name as owner_name
      FROM appliances a
      JOIN users u ON a.user_id = u.id
      WHERE a.group_id = $1 AND a.status = 'active'
      ORDER BY u.name, a.created_at DESC;
    `;
    const result = await pool.query(query, [group_id]);

    res.status(200).json({
      message: 'Appliances retrieved.',
      appliances: result.rows
    });
  } catch (error) {
    console.error('Error fetching appliances:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const deleteAppliance = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // Verify the user owns this appliance
    const applianceCheck = await pool.query(
      'SELECT id FROM appliances WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (applianceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only delete your own appliances.' });
    }

    // Mark appliance as inactive (soft delete)
    await pool.query(
      "UPDATE appliances SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    res.status(200).json({ message: 'Appliance deleted successfully.' });
  } catch (error) {
    console.error('Error deleting appliance:', error);
    res.status(500).json({ error: 'Internal server error while deleting appliance.' });
  }
};