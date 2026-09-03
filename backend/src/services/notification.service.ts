import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { sendPushNotification } from '../config/firebase.js';
import { PaginationOptions, PaginationResult } from '../types/index.js';

const VALID_DEVICE_TYPES = new Set(['android', 'ios', 'web']);

export async function getUserNotifications(userId: number, options: PaginationOptions): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?', [userId]);
  const total = Number(countRows[0]?.total || 0);
  const [notifications] = await pool.query<RowDataPacket[]>(`SELECT n.* FROM notifications n WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ? OFFSET ?`, [userId, limit, offset]);
  return { data: notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function registerFcmToken(userId: number, token: string, deviceType: string): Promise<void> {
  const pool = getPool();
  const safeType = VALID_DEVICE_TYPES.has(deviceType) ? deviceType : 'android';
  await pool.query('UPDATE users SET fcm_token = ?, device_type = ? WHERE id = ?', [token, safeType, userId]);
}

export async function sendNotificationToUsers(userIds: number[], title: string, body: string, messageId?: number, data?: Record<string, string>): Promise<number> {
  const pool = getPool();
  const uniqueUserIds = [...new Set(userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueUserIds.length === 0) return 0;
  const placeholders = uniqueUserIds.map(() => '(?, ?, ?, ?, ?, ?, NOW())').join(',');
  const params: any[] = [];
  for (const userId of uniqueUserIds) params.push(userId, messageId || null, title, body, data ? JSON.stringify(data) : null, 'pending');
  await pool.query(`INSERT INTO notifications (user_id, message_id, title, body, data, fcm_status, sent_at) VALUES ${placeholders}`, params);
  const { sendBulkPushNotifications } = await import('../config/firebase.js');
  return sendBulkPushNotifications(uniqueUserIds, title, body, data);
}

export async function sendSingleNotification(userId: number, title: string, body: string, messageId?: number, data?: Record<string, string>): Promise<boolean> {
  const pool = getPool();
  await pool.query<ResultSetHeader>(`INSERT INTO notifications (user_id, message_id, title, body, data, fcm_status, sent_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())`, [userId, messageId || null, title, body, data ? JSON.stringify(data) : null]);
  return sendPushNotification(userId, title, body, data);
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as count FROM message_recipients mr JOIN messages m ON m.id = mr.message_id WHERE mr.user_id = ? AND m.status = 'sent' AND NOT EXISTS (SELECT 1 FROM message_reads rd WHERE rd.message_id = mr.message_id AND rd.user_id = ?)`, [userId, userId]);
  return Number(rows[0]?.count || 0);
}

export async function getAdminNotificationStats(establishmentId: number): Promise<{ today: number; week: number; deliveryRate: number; failureRate: number }> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total, SUM(CASE WHEN n.created_at >= CURDATE() THEN 1 ELSE 0 END) AS today, SUM(CASE WHEN n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS week, SUM(CASE WHEN n.fcm_status = 'delivered' THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN n.fcm_status = 'failed' THEN 1 ELSE 0 END) AS failed FROM notifications n JOIN users u ON u.id = n.user_id WHERE u.establishment_id = ?`, [establishmentId]);
  const row = rows[0] || {};
  const total = Number(row.total || 0);
  return { today: Number(row.today || 0), week: Number(row.week || 0), deliveryRate: total ? (Number(row.delivered || 0) / total) * 100 : 0, failureRate: total ? (Number(row.failed || 0) / total) * 100 : 0 };
}

export async function getAdminNotifications(establishmentId: number, options: PaginationOptions & { search?: string }): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const search = options.search?.trim() || '';
  const searchClause = search ? ' AND (n.title LIKE ? OR CONCAT(u.first_name, \' \', u.last_name) LIKE ?)' : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`] : [];
  const baseParams = [establishmentId, ...searchParams];
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM notifications n JOIN users u ON u.id = n.user_id WHERE u.establishment_id = ?${searchClause}`, baseParams);
  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT n.id,n.user_id,n.title,n.body,n.fcm_status,n.fcm_message_id,n.created_at,n.sent_at,CONCAT(u.first_name, ' ', u.last_name) AS user_name FROM notifications n JOIN users u ON u.id = n.user_id WHERE u.establishment_id = ?${searchClause} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`, [...baseParams, limit, offset]);
  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function resolveAdminNotificationRecipients(establishmentId: number, userIds: number[] = [], groupIds: number[] = []): Promise<number[]> {
  const pool = getPool();
  const directIds = [...new Set(userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const normalizedGroupIds = [...new Set(groupIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const groupMembers: number[] = [];
  if (normalizedGroupIds.length) {
    const placeholders = normalizedGroupIds.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT gm.user_id FROM group_members gm JOIN \`groups\` g ON g.id = gm.group_id JOIN users u ON u.id = gm.user_id WHERE g.establishment_id = ? AND u.establishment_id = g.establishment_id AND g.id IN (${placeholders})`, [establishmentId, ...normalizedGroupIds]);
    groupMembers.push(...rows.map((row) => Number(row.user_id)));
  }
  const requested = [...new Set([...directIds, ...groupMembers])];
  if (!requested.length) return [];
  const placeholders = requested.map(() => '?').join(',');
  const [validRows] = await pool.query<RowDataPacket[]>(`SELECT id FROM users WHERE establishment_id = ? AND is_active = 1 AND id IN (${placeholders})`, [establishmentId, ...requested]);
  if (validRows.length !== requested.length) throw new Error('Un ou plusieurs destinataires sont invalides ou appartiennent à un autre établissement.');
  return validRows.map((row) => Number(row.id));
}
