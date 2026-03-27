// src/controllers/applianceController.js
import { pool } from '../config/db.js';
import { createGroupNotification } from '../services/notificationService.js';

export const addAppliance = async (req, res) => {
  const { group_id, device_name, wattage, daily_hours } = req.body;
  const user_id = req.user.id;

  if (!group_id || !device_name || !wattage || !daily_hours) {
    return res.status(400).json({ error: 'All appliance fields are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const membershipCheck = await client.query(
      `SELECT gm.id, mg.meter_number, u.name AS actor_name
       FROM group_members gm
       JOIN meter_groups mg ON mg.id = gm.group_id
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND gm.user_id = $2`,
      [group_id, user_id]
    );

    if (membershipCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of this group.' });
    }
    const memberData = membershipCheck.rows[0];

    const query = `
      INSERT INTO appliances (user_id, group_id, device_name, wattage, daily_hours)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await client.query(query, [user_id, group_id, device_name, wattage, daily_hours]);

    await createGroupNotification({
      groupId: group_id,
      actorUserId: user_id,
      eventType: 'device_added',
      message: `${memberData.actor_name} added ${device_name} to meter ${memberData.meter_number}.`,
      metadata: { device_name: device_name, meter_number: memberData.meter_number },
      client
    });

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Appliance logged successfully!',
      appliance: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding appliance:', error);
    return res.status(500).json({ error: 'Internal server error while adding appliance.' });
  } finally {
    client.release();
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

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const applianceCheck = await client.query(
      `SELECT a.id, a.group_id, a.device_name, mg.meter_number, u.name AS actor_name
       FROM appliances a
       JOIN meter_groups mg ON mg.id = a.group_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [id, user_id]
    );

    if (applianceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You can only delete your own appliances.' });
    }
    const appliance = applianceCheck.rows[0];

    await client.query(
      "UPDATE appliances SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    await createGroupNotification({
      groupId: appliance.group_id,
      actorUserId: user_id,
      eventType: 'device_removed',
      message: `${appliance.actor_name} removed ${appliance.device_name} from meter ${appliance.meter_number}.`,
      metadata: { device_name: appliance.device_name, meter_number: appliance.meter_number },
      client
    });

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Appliance deleted successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting appliance:', error);
    return res.status(500).json({ error: 'Internal server error while deleting appliance.' });
  } finally {
    client.release();
  }
};
