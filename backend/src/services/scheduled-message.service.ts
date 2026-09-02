import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function scheduleMessage(messageId: number, establishmentId: number, scheduledFor: string): Promise<any> {
  const pool = getPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id, status FROM messages WHERE id = ? AND establishment_id = ?',
    [messageId, establishmentId]
  );
  if (existing.length === 0) throw new Error('Message non trouvé.');
  if (existing[0].status === 'sent') throw new Error('Un message déjà envoyé ne peut pas être programmé.');

  await pool.query(
    `UPDATE messages SET status = 'scheduled', scheduled_at = ? WHERE id = ? AND establishment_id = ?`,
    [scheduledFor, messageId, establishmentId]
  );

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO scheduled_messages (establishment_id, message_id, scheduled_for, status, retry_count)
     VALUES (?, ?, ?, 'pending', 0)`,
    [establishmentId, messageId, scheduledFor]
  );

  return { id: result.insertId, message_id: messageId, scheduled_for: scheduledFor, status: 'pending' };
}

export async function processScheduledMessages(): Promise<{ processed: number; failed: number }> {
  const pool = getPool();
  const [due] = await pool.query<RowDataPacket[]>(
    `SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.establishment_id
     FROM scheduled_messages sm JOIN messages m ON m.id = sm.message_id
     WHERE sm.status = 'pending' AND sm.scheduled_for <= NOW() AND sm.retry_count < 3
       AND sm.establishment_id = m.establishment_id LIMIT 50`
  );
  let processed = 0;
  let failed = 0;
  for (const scheduled of due) {
    await pool.query(`UPDATE scheduled_messages SET status = 'processing', last_attempt_at = NOW() WHERE id = ? AND establishment_id = ?`, [scheduled.id, scheduled.establishment_id]);
    try {
      await pool.query(`UPDATE messages SET status = 'sent', sent_at = NOW() WHERE id = ? AND establishment_id = ?`, [scheduled.message_id, scheduled.establishment_id]);
      await pool.query(`UPDATE scheduled_messages SET status = 'sent', last_attempt_at = NOW() WHERE id = ? AND establishment_id = ?`, [scheduled.id, scheduled.establishment_id]);
      const [recipients] = await pool.query<RowDataPacket[]>(
        `SELECT mr.user_id FROM message_recipients mr JOIN users u ON u.id = mr.user_id
         WHERE mr.message_id = ? AND u.establishment_id = ?`,
        [scheduled.message_id, scheduled.establishment_id]
      );
      if (recipients.length > 0) {
        const { sendBulkPushNotifications } = await import('../config/firebase.js');
        await sendBulkPushNotifications(recipients.map((r) => r.user_id), scheduled.title || 'Message programmé', (scheduled.content || '').substring(0, 100), {
          messageId: scheduled.message_id.toString(), type: 'MESSAGE',
        });
      }
      processed++;
    } catch (err) {
      const errorMsg = (err as Error).message;
      const newRetryCount = (scheduled.retry_count as number) + 1;
      if (newRetryCount >= 3) {
        await pool.query(`UPDATE scheduled_messages SET status = 'failed', retry_count = retry_count + 1, last_attempt_at = NOW(), error_message = ? WHERE id = ? AND establishment_id = ?`, [errorMsg, scheduled.id, scheduled.establishment_id]);
        await pool.query(`UPDATE messages SET status = 'draft' WHERE id = ? AND establishment_id = ?`, [scheduled.message_id, scheduled.establishment_id]);
      } else {
        await pool.query(`UPDATE scheduled_messages SET status = 'pending', retry_count = retry_count + 1, last_attempt_at = NOW(), error_message = ? WHERE id = ? AND establishment_id = ?`, [errorMsg, scheduled.id, scheduled.establishment_id]);
      }
      failed++;
    }
  }
  return { processed, failed };
}

export async function cancelScheduledMessage(scheduleId: number, establishmentId: number): Promise<boolean> {
  const pool = getPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM scheduled_messages WHERE id = ? AND establishment_id = ?',
    [scheduleId, establishmentId]
  );
  if (existing.length === 0) return false;
  const record = existing[0];
  if (record.status !== 'pending') throw new Error('Seuls les messages en attente peuvent être annulés.');

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE scheduled_messages SET status = 'cancelled' WHERE id = ? AND establishment_id = ? AND status = 'pending'`,
    [scheduleId, establishmentId]
  );
  if (result.affectedRows > 0) {
    await pool.query(
      `UPDATE messages SET status = 'draft', scheduled_at = NULL WHERE id = ? AND establishment_id = ?`,
      [record.message_id, establishmentId]
    );
  }
  return result.affectedRows > 0;
}

export async function getScheduledMessages(establishmentId: number, pagination: { page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
  const pool = getPool();
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM scheduled_messages WHERE establishment_id = ?', [establishmentId]);
  const total = countRows[0].total as number;
  const [messages] = await pool.query<RowDataPacket[]>(
    `SELECT sm.*, m.title, m.content, m.message_type, m.priority FROM scheduled_messages sm
     JOIN messages m ON m.id = sm.message_id AND m.establishment_id = sm.establishment_id
     WHERE sm.establishment_id = ? ORDER BY sm.scheduled_for DESC LIMIT ? OFFSET ?`,
    [establishmentId, limit, offset]
  );
  return { data: messages, total, page, limit, totalPages: Math.ceil(total / limit) };
}
