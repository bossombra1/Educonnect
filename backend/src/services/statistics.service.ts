import { getPool } from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';

export async function getDashboardStats(establishmentId: number): Promise<any> {
  const pool = getPool();

  // User counts by role from roles table
  const [userStats] = await pool.query<RowDataPacket[]>(
    `SELECT r.name as role_name, COUNT(u.id) as count
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.establishment_id = ? AND u.is_active = 1
     GROUP BY r.name`,
    [establishmentId]
  );

  // Active classes count
  const [classStats] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM classes WHERE establishment_id = ? AND is_active = 1`,
    [establishmentId]
  );

  // Message counts by status
  const [messageStats] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
       SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
       SUM(CASE WHEN DATE(sent_at) = CURDATE() THEN 1 ELSE 0 END) as today_sent
     FROM messages
     WHERE establishment_id = ?`,
    [establishmentId]
  );

  // Pending scheduled messages
  const [scheduledStats] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as pending_count FROM scheduled_messages
     WHERE establishment_id = ? AND status = 'pending'`,
    [establishmentId]
  );

  // Read / delivery stats across all messages for this establishment
  const [readStats] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(DISTINCT mr.id) as total_recipients,
       SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END) as total_delivered,
       SUM(CASE WHEN mr.delivery_status = 'failed' THEN 1 ELSE 0 END) as total_failed
     FROM message_recipients mr
     JOIN messages m ON m.id = mr.message_id
     WHERE m.establishment_id = ?`,
    [establishmentId]
  );

  // Group count
  const [groupStats] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM groups WHERE establishment_id = ?`,
    [establishmentId]
  );

  const roles: Record<string, number> = {};
  for (const row of userStats) {
    roles[row.role_name] = Number(row.count);
  }

  return {
    users: roles,
    total_users: Object.values(roles).reduce((a, b) => a + b, 0),
    total_classes: Number(classStats[0]?.total || 0),
    total_messages: Number(messageStats[0]?.total || 0),
    messages_sent: Number(messageStats[0]?.sent || 0),
    messages_scheduled: Number(messageStats[0]?.scheduled || 0),
    messages_draft: Number(messageStats[0]?.draft || 0),
    messages_today: Number(messageStats[0]?.today_sent || 0),
    scheduled_pending: Number(scheduledStats[0]?.pending_count || 0),
    total_groups: Number(groupStats[0]?.total || 0),
    delivery_rate: readStats.length > 0 && Number(readStats[0].total_recipients) > 0
      ? Math.round((Number(readStats[0].total_delivered) / Number(readStats[0].total_recipients)) * 100)
      : 0,
  };
}

export async function getMessageStats(messageId: number): Promise<any> {
  const pool = getPool();

  const [stats] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
       SUM(CASE WHEN mr.delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
       (SELECT COUNT(DISTINCT mr2.user_id) FROM message_reads mr2 WHERE mr2.message_id = ?) as read_count,
       (SELECT COUNT(DISTINCT ma.user_id) FROM message_acknowledgements ma WHERE ma.message_id = ?) as acknowledged_count
     FROM message_recipients mr
     WHERE mr.message_id = ?`,
    [messageId, messageId, messageId]
  );

  if (stats.length === 0) return { total: 0, delivered: 0, failed: 0, read_count: 0, acknowledged_count: 0, read_rate: 0 };
  const row = stats[0];
  const total = Number(row.total) || 0;
  return {
    total,
    delivered: Number(row.delivered) || 0,
    failed: Number(row.failed) || 0,
    read_count: Number(row.read_count) || 0,
    acknowledged_count: Number(row.acknowledged_count) || 0,
    read_rate: total > 0 ? Math.round(((Number(row.read_count) || 0) / total) * 100) : 0,
  };
}

export async function getDailyMessageStats(
  establishmentId: number,
  days: number = 30
): Promise<any[]> {
  const pool = getPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(m.sent_at) as date, COUNT(*) as message_count,
       (SELECT COUNT(*) FROM message_recipients mr2
        JOIN messages m2 ON m2.id = mr2.message_id
        WHERE DATE(m2.sent_at) = DATE(m.sent_at)
        AND m2.establishment_id = ?) as recipient_count
     FROM messages m
     WHERE m.establishment_id = ?
       AND m.status = 'sent'
       AND m.sent_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(m.sent_at)
     ORDER BY date ASC`,
    [establishmentId, establishmentId, days]
  );

  return rows;
}
