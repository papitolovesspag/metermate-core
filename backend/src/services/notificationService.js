import { pool } from '../config/db.js';

const DEFAULT_LIMIT = 40;

export const createGroupNotification = async ({
  groupId,
  actorUserId = null,
  eventType,
  message,
  metadata = {},
  client = null
}) => {
  if (!groupId || !eventType || !message) {
    return null;
  }

  const db = client || pool;
  const result = await db.query(
    `INSERT INTO meter_notifications (group_id, actor_user_id, event_type, message, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [groupId, actorUserId, eventType, message, metadata]
  );

  return result.rows[0];
};

export const getGroupNotifications = async ({ groupId, limit = DEFAULT_LIMIT, client = null }) => {
  const db = client || pool;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 100) : DEFAULT_LIMIT;

  const result = await db.query(
    `SELECT
       n.id,
       n.group_id,
       n.actor_user_id,
       n.event_type,
       n.message,
       n.metadata,
       n.created_at,
       u.name AS actor_name
     FROM meter_notifications n
     LEFT JOIN users u ON u.id = n.actor_user_id
     WHERE n.group_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [groupId, safeLimit]
  );

  return result.rows;
};
