import { pool } from '../config/db.js';
import { validateCustomer } from '../services/billsPaymentService.js';
import { createGroupNotification, getGroupNotifications } from '../services/notificationService.js';

const toPositiveAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const createGroup = async (req, res) => {
  const { meter_number, target_amount, payment_code } = req.body;
  const host_id = req.user.id;
  const amount = toPositiveAmount(target_amount);

  if (!meter_number || !payment_code || !amount) {
    return res.status(400).json({ error: 'Meter number, valid target amount, and disco payment code are required.' });
  }

  let validatedCustomerName = '';
  const allowMockValidation = process.env.INTERSWITCH_DEMO_MODE === 'true';

  try {
    const validationResult = await validateCustomer(meter_number, payment_code);
    if (!validationResult.success) {
      if (!allowMockValidation) {
        return res.status(400).json({ error: validationResult.error || 'Invalid meter number.' });
      }
      validatedCustomerName = 'Sandbox Customer (Mock Validation)';
    } else {
      validatedCustomerName = validationResult.customerName;
    }
  } catch (error) {
    if (!allowMockValidation) {
      return res.status(500).json({ error: 'Meter validation failed. Please try again.' });
    }
    validatedCustomerName = 'Sandbox Customer (Mock Validation)';
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO meter_groups (host_id, meter_number, target_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [host_id, meter_number, amount]
    );
    const newGroup = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)`,
      [newGroup.id, host_id]
    );

    await createGroupNotification({
      groupId: newGroup.id,
      actorUserId: host_id,
      eventType: 'group_created',
      message: `Meter ${newGroup.meter_number} was created and funding started.`,
      metadata: { meter_number: newGroup.meter_number },
      client
    });

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Meter group created and verified successfully.',
      group: newGroup,
      registered_to: validatedCustomerName
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Internal server error while creating group.' });
  } finally {
    client.release();
  }
};

export const getMyGroups = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT mg.*
       FROM meter_groups mg
       JOIN group_members gm ON mg.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY mg.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      message: 'Groups retrieved successfully.',
      groups: result.rows
    });
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return res.status(500).json({ error: 'Internal server error while fetching groups.' });
  }
};

export const inviteMember = async (req, res) => {
  const { group_id, email } = req.body;
  const requester_id = req.user.id;

  if (!group_id || !email) {
    return res.status(400).json({ error: 'Group ID and member email are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const groupCheck = await client.query(
      'SELECT id, meter_number FROM meter_groups WHERE id = $1 AND host_id = $2',
      [group_id, requester_id]
    );

    if (groupCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the host can add members to this group.' });
    }
    const group = groupCheck.rows[0];

    const userCheck = await client.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found. Ask them to register first.' });
    }

    const invitee = userCheck.rows[0];
    const insertResult = await client.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [group_id, invitee.id]
    );

    if (insertResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `${invitee.name} is already in this meter group.` });
    }

    await createGroupNotification({
      groupId: group_id,
      actorUserId: requester_id,
      eventType: 'member_added',
      message: `${invitee.name} was added to meter ${group.meter_number}.`,
      metadata: { member_name: invitee.name, meter_number: group.meter_number },
      client
    });

    await client.query('COMMIT');
    return res.status(200).json({ message: `${invitee.name} has been added to the group.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inviting member:', error);
    return res.status(500).json({ error: 'Internal server error while adding member.' });
  } finally {
    client.release();
  }
};

export const getGroupDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const membershipCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    const groupResult = await pool.query('SELECT * FROM meter_groups WHERE id = $1', [id]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.name, gm.joined_at
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [id]
    );

    return res.status(200).json({
      group: groupResult.rows[0],
      members: membersResult.rows
    });
  } catch (error) {
    console.error('Error fetching group details:', error);
    return res.status(500).json({ error: 'Internal server error while fetching group.' });
  }
};

export const updateGroupTarget = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { target_amount } = req.body;
  const amount = toPositiveAmount(target_amount);

  if (!amount) {
    return res.status(400).json({ error: 'Target amount must be greater than zero.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      `UPDATE meter_groups
       SET target_amount = $1
       WHERE id = $2 AND host_id = $3
       RETURNING id, meter_number, target_amount`,
      [amount, id, userId]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the group host can edit target amount.' });
    }

    const updatedGroup = updateResult.rows[0];

    await createGroupNotification({
      groupId: id,
      actorUserId: userId,
      eventType: 'target_updated',
      message: `Target for meter ${updatedGroup.meter_number} was updated to NGN ${Number(updatedGroup.target_amount).toLocaleString()}.`,
      metadata: { target_amount: Number(updatedGroup.target_amount) },
      client
    });

    await client.query('COMMIT');
    return res.status(200).json({
      message: 'Target amount updated.',
      group: updatedGroup
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating target amount:', error);
    return res.status(500).json({ error: 'Internal server error while updating target amount.' });
  } finally {
    client.release();
  }
};

export const getGroupNotificationsForMember = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { limit } = req.query;

  try {
    const membershipCheck = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const notifications = await getGroupNotifications({ groupId: id, limit });
    return res.status(200).json({
      message: 'Notifications retrieved.',
      notifications
    });
  } catch (error) {
    console.error('Error fetching group notifications:', error);
    return res.status(500).json({ error: 'Internal server error while fetching notifications.' });
  }
};

export const reopenPaymentRound = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hostCheck = await client.query(
      'SELECT id, meter_number FROM meter_groups WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (hostCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the group host can reopen a payment round.' });
    }

    const updated = await client.query(
      `UPDATE meter_groups
       SET current_balance = 0,
           status = 'Funding',
           cycle_started_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, meter_number, target_amount, current_balance, status, cycle_started_at`,
      [id]
    );

    await createGroupNotification({
      groupId: id,
      actorUserId: userId,
      eventType: 'payment_round_reopened',
      message: `A new payment round was started for meter ${updated.rows[0].meter_number}.`,
      metadata: { meter_number: updated.rows[0].meter_number },
      client
    });

    await client.query('COMMIT');
    return res.status(200).json({
      message: 'New payment round started.',
      group: updated.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reopening payment round:', error);
    return res.status(500).json({ error: 'Internal server error while reopening payment round.' });
  } finally {
    client.release();
  }
};

export const deleteGroup = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const hostCheck = await pool.query(
      'SELECT id FROM meter_groups WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (hostCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only the group host can delete the group.' });
    }

    await pool.query('DELETE FROM meter_groups WHERE id = $1', [id]);
    return res.status(200).json({ message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ error: 'Internal server error while deleting group.' });
  }
};

export const leaveGroup = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const memberCheck = await client.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'You are not a member of this group.' });
    }

    const groupResult = await client.query(
      'SELECT id, host_id, meter_number FROM meter_groups WHERE id = $1',
      [id]
    );
    if (groupResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Group not found.' });
    }
    const group = groupResult.rows[0];

    if (group.host_id === userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Host cannot leave the group. Delete it instead.' });
    }

    const userResult = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows[0]?.name || 'A member';

    await client.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [id, userId]
    );

    await createGroupNotification({
      groupId: id,
      actorUserId: userId,
      eventType: 'member_left',
      message: `${userName} left meter ${group.meter_number}.`,
      metadata: { member_name: userName, meter_number: group.meter_number },
      client
    });

    await client.query('COMMIT');
    return res.status(200).json({ message: 'You have left the group.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error leaving group:', error);
    return res.status(500).json({ error: 'Internal server error while leaving group.' });
  } finally {
    client.release();
  }
};
