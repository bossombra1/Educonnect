import { getPool } from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';

export async function getMessageRecipients(messageId: number, establishmentId: number, page = 1, limit = 20): Promise<any> {
  const pool = getPool();
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM message_recipients mr JOIN messages m ON m.id = mr.message_id WHERE mr.message_id = ? AND m.establishment_id = ?', [messageId, establishmentId]);
  const total = Number(countRows[0]?.total || 0);
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT mr.id, mr.user_id, mr.delivery_status, mr.delivered_at, u.first_name, u.last_name, u.matricule, CASE WHEN mr2.id IS NULL THEN 0 ELSE 1 END AS is_read, CASE WHEN ma.id IS NULL THEN 0 ELSE 1 END AS is_acknowledged FROM message_recipients mr JOIN messages m ON m.id = mr.message_id JOIN users u ON u.id = mr.user_id LEFT JOIN message_reads mr2 ON mr2.message_id = mr.message_id AND mr2.user_id = mr.user_id LEFT JOIN message_acknowledgements ma ON ma.message_id = mr.message_id AND ma.user_id = mr.user_id WHERE mr.message_id = ? AND m.establishment_id = ? ORDER BY u.last_name, u.first_name LIMIT ? OFFSET ?`, [messageId, establishmentId, safeLimit, offset]);
  return { data: rows, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

export async function getMessageRecipientStats(messageId: number, establishmentId: number): Promise<any> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total, SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN mr.delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed, COUNT(DISTINCT mr2.user_id) AS read_count, COUNT(DISTINCT ma.user_id) AS acknowledged_count FROM message_recipients mr JOIN messages m ON m.id = mr.message_id LEFT JOIN message_reads mr2 ON mr2.message_id = mr.message_id AND mr2.user_id = mr.user_id LEFT JOIN message_acknowledgements ma ON ma.message_id = mr.message_id AND ma.user_id = mr.user_id WHERE mr.message_id = ? AND m.establishment_id = ?`, [messageId, establishmentId]);
  const row = rows[0] || {};
  const total = Number(row.total) || 0;
  const readCount = Number(row.read_count) || 0;
  return { total, delivered: Number(row.delivered) || 0, failed: Number(row.failed) || 0, read_count: readCount, acknowledged_count: Number(row.acknowledged_count) || 0, read_rate: total ? Math.round((readCount / total) * 100) : 0 };
}
