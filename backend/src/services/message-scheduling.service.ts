import { getPool } from '../config/database.js';
import { ResultSetHeader } from 'mysql2/promise';

export async function createScheduledMessage(data: { title?: string; content: string; message_type?: string; priority?: string; link_url?: string }, senderId: number, establishmentId: number, recipientIds: number[], scheduledFor: string, attachments: Array<{ file_name: string; file_url: string; file_type: string; file_size: number }> = []): Promise<any> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [messageResult] = await conn.query<ResultSetHeader>(`INSERT INTO messages (establishment_id, sender_id, title, content, message_type, priority, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`, [establishmentId, senderId, data.title || null, data.content, data.message_type || 'text', data.priority || 'normal', scheduledFor]);
    const messageId = messageResult.insertId;
    const recipientValues = recipientIds.map((userId) => [messageId, userId, 'pending']);
    await conn.query(`INSERT INTO message_recipients (message_id, user_id, delivery_status) VALUES ?`, [recipientValues]);
    if (data.link_url) await conn.query(`INSERT INTO message_attachments (message_id, file_name, file_url, file_type) VALUES (?, ?, ?, 'other')`, [messageId, 'link', data.link_url]);
    if (attachments.length) {
      const values = attachments.map((a) => [messageId, a.file_name, a.file_url, a.file_type || 'other', a.file_size || null]);
      await conn.query(`INSERT INTO message_attachments (message_id, file_name, file_url, file_type, file_size) VALUES ?`, [values]);
    }
    const [scheduleResult] = await conn.query<ResultSetHeader>(`INSERT INTO scheduled_messages (establishment_id, message_id, scheduled_for, status, retry_count) VALUES (?, ?, ?, 'pending', 0)`, [establishmentId, messageId, scheduledFor]);
    await conn.commit();
    return { id: scheduleResult.insertId, message_id: messageId, scheduled_for: scheduledFor, status: 'pending', recipient_count: recipientIds.length };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
