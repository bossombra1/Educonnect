import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { sendPushNotification } from '../config/firebase.js';
import { PaginationOptions, PaginationResult } from '../types/index.js';

const VALID_DEVICE_TYPES = new Set(['android', 'ios', 'web']);

export async function getUserNotifications(
  userId: number,
  options: PaginationOptions
): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
    [userId]
  );
  const total = countRows[0].total as number;
  const totalPages = Math.ceil(total / limit);

  const [notifications] = await pool.query<RowDataPacket[]>(
    `SELECT n.* FROM notifications n
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return { data: notifications, total, page, limit, totalPages };
}

export async function registerFcmToken(
  userId: number,
  token: string,
  deviceType: string
): Promise<void> {
  const pool = getPool();

  // Validate device_type against ENUM('android','ios','web')
  const safeType = VALID_DEVICE_TYPES.has(deviceType) ? deviceType : 'android';

  await pool.query(
    'UPDATE users SET fcm_token = ?, device_type = ? WHERE id = ?',
    [token, safeType, userId]
  );
}

export async function sendNotificationToUsers(
  userIds: number[],
  title: string,
  body: string,
  messageId?: number,
  data?: Record<string, string>
): Promise<number> {
  const pool = getPool();

  if (userIds.length === 0) return 0;

  const placeholders = userIds.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
  const params: any[] = [];
  for (const userId of userIds) {
    params.push(
      userId,
      messageId || null,
      title,
      body,
      data ? JSON.stringify(data) : null,
      'pending'
    );
  }

  await pool.query(
    `INSERT INTO notifications (user_id, message_id, title, body, data, fcm_status, sent_at)
     VALUES ${placeholders}`,
    [...params, ...userIds.map(() => 'NOW()')]
  );

  const { sendBulkPushNotifications } = await import('../config/firebase.js');
  return sendBulkPushNotifications(userIds, title, body, data);
}

export async function sendSingleNotification(
  userId: number,
  title: string,
  body: string,
  messageId?: number,
  data?: Record<string, string>
): Promise<boolean> {
  const pool = getPool();

  // Insert notification record
  await pool.query<ResultSetHeader>(
    `INSERT INTO notifications (user_id, message_id, title, body, data, fcm_status, sent_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
    [userId, messageId || null, title, body, data ? JSON.stringify(data) : null]
  );

  // Send push
  return sendPushNotification(userId, title, body, data);
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count
     FROM message_recipients mr
     JOIN messages m ON m.id = mr.message_id
     WHERE mr.user_id = ? AND m.status = 'sent'
     AND NOT EXISTS (
       SELECT 1 FROM message_reads rd WHERE rd.message_id = mr.message_id AND rd.user_id = ?
     )`,
    [userId, userId]
  );
  return rows[0].count as number;
}
