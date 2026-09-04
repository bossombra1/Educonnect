import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function scheduleMessage(messageId: number, establishmentId: number, scheduledFor: string): Promise<any> {
  const pool = getPool();
  const [existing] = await pool.query<RowDataPacket[]>('SELECT id, status FROM messages WHERE id = ? AND establishment_id = ?', [messageId, establishmentId]);
  if (existing.length === 0) throw new Error('Message non trouvé.');
  if (existing[0].status === 'sent') throw new Error('Un message déjà envoyé ne peut pas être programmé.');
  await pool.query(`UPDATE messages SET status = 'scheduled', scheduled_at = ? WHERE id = ? AND establishment_id = ?`, [scheduledFor, messageId, establishmentId]);
  const [result] = await pool.query<ResultSetHeader>(`INSERT INTO scheduled_messages (establishment_id, message_id, scheduled_for, status, retry_count) VALUES (?, ?, ?, 'pending', 0)`, [establishmentId, messageId, scheduledFor]);
  return { id: result.insertId, message_id: messageId, scheduled_for: scheduledFor, status: 'pending' };
}

export async function processScheduledMessages(): Promise<{ processed: number; failed: number }> {
  const pool = getPool();
  const [due] = await pool.query<RowDataPacket[]>(`SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.establishment_id FROM scheduled_messages sm JOIN messages m ON m.id = sm.message_id WHERE sm.status = 'pending' AND sm.scheduled_for <= NOW() AND sm.retry_count < 3 AND sm.establishment_id = m.establishment_id LIMIT 50`);
  let processed = 0; let failed = 0;
  for (const scheduled of due) {
    await pool.query(`UPDATE scheduled_messages SET status = 'processing', last_attempt_at = NOW() WHERE id = ? AND establishment_id = ?`, [scheduled.id, scheduled.establishment_id]);
    try {
      await pool.query(`UPDATE messages SET status = 'sent', sent_at = NOW() WHERE id = ? AND establishment_id = ?`, [scheduled.message_id, scheduled.establishment_id]);
      await pool.query(`UPDATE scheduled_messages SET status = 'sent', last_attempt_at = NOW() WHERE id = ? AND establishment_id = ?`, [scheduled.id, scheduled.establishment_id]);
      const [recipients] = await pool.query<RowDataPacket[]>(`SELECT mr.user_id FROM message_recipients mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id = ? AND u.establishment_id = ?`, [scheduled.message_id, scheduled.establishment_id]);
      if (recipients.length > 0) {
        const { sendBulkPushNotifications } = await import('../config/firebase.js');
        await sendBulkPushNotifications(recipients.map((r) => r.user_id), scheduled.title || 'Message programmé', (scheduled.content || '').substring(0, 100), { messageId: scheduled.message_id.toString(), type: 'MESSAGE' });
      }
      processed++;
    } catch (err) {
      const errorMsg = (err as Error).message; const newRetryCount = Number(scheduled.retry_count || 0) + 1;
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
  const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM scheduled_messages WHERE id = ? AND establishment_id = ?', [scheduleId, establishmentId]);
  if (existing.length === 0) return false;
  const record = existing[0];
  if (record.status !== 'pending') throw new Error('Seuls les messages en attente peuvent être annulés.');
  const [result] = await pool.query<ResultSetHeader>(`UPDATE scheduled_messages SET status = 'cancelled' WHERE id = ? AND establishment_id = ? AND status = 'pending'`, [scheduleId, establishmentId]);
  if (result.affectedRows > 0) await pool.query(`UPDATE messages SET status = 'draft', scheduled_at = NULL WHERE id = ? AND establishment_id = ?`, [record.message_id, establishmentId]);
  return result.affectedRows > 0;
}

async function enrichScheduledRows(rows: RowDataPacket[], establishmentId: number): Promise<any[]> {
  const pool = getPool();
  if (!rows.length) return [];
  const messageIds = rows.map((r) => Number(r.message_id));
  const placeholders = messageIds.map(() => '?').join(',');
  const [recipientRows] = await pool.query<RowDataPacket[]>(`SELECT mr.message_id, COUNT(*) AS recipient_count FROM message_recipients mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id IN (${placeholders}) AND u.establishment_id = ? GROUP BY mr.message_id`, [...messageIds, establishmentId]);
  const [groupRows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT mr.message_id, g.id AS group_id, g.name AS group_name, g.group_type FROM message_recipients mr JOIN users u ON u.id = mr.user_id JOIN group_members gm ON gm.user_id = u.id JOIN \`groups\` g ON g.id = gm.group_id WHERE mr.message_id IN (${placeholders}) AND g.establishment_id = ? AND u.establishment_id = ? ORDER BY g.name`, [...messageIds, establishmentId, establishmentId]);
  const [classRows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT mr.message_id, c.id AS class_id, c.name AS class_name, c.level, c.section FROM message_recipients mr JOIN users u ON u.id = mr.user_id JOIN students s ON s.user_id = u.id JOIN classes c ON c.id = s.class_id WHERE mr.message_id IN (${placeholders}) AND c.establishment_id = ? AND s.establishment_id = ? AND u.establishment_id = ? ORDER BY c.name`, [...messageIds, establishmentId, establishmentId, establishmentId]);
  return rows.map((row) => ({
    ...row,
    recipient_count: Number(recipientRows.find((r) => Number(r.message_id) === Number(row.message_id))?.recipient_count || 0),
    target_groups: groupRows.filter((g) => Number(g.message_id) === Number(row.message_id)).map((g) => ({ id: Number(g.group_id), name: g.group_name, type: g.group_type })),
    target_classes: classRows.filter((c) => Number(c.message_id) === Number(row.message_id)).map((c) => ({ id: Number(c.class_id), name: c.class_name, level: c.level, section: c.section })),
  }));
}

export async function getScheduledMessages(establishmentId: number, pagination: { page?: number; limit?: number; status?: string }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
  const pool = getPool();
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = (page - 1) * limit;
  const status = pagination.status;

  let countSql = 'SELECT COUNT(*) AS total FROM scheduled_messages WHERE establishment_id = ?';
  const countParams: any[] = [establishmentId];
  if (status) { countSql += ' AND status = ?'; countParams.push(status); }
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, countParams);
  const total = Number(countRows[0]?.total || 0);

  let messagesSql = `SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.sender_id, u.first_name AS sender_first_name, u.last_name AS sender_last_name FROM scheduled_messages sm JOIN messages m ON m.id = sm.message_id AND m.establishment_id = sm.establishment_id LEFT JOIN users u ON u.id = m.sender_id AND u.establishment_id = sm.establishment_id WHERE sm.establishment_id = ?`;
  const messageParams: any[] = [establishmentId];
  if (status) { messagesSql += ' AND sm.status = ?'; messageParams.push(status); }
  messagesSql += ' ORDER BY sm.scheduled_for DESC LIMIT ? OFFSET ?';
  messageParams.push(limit, offset);
  const [messages] = await pool.query<RowDataPacket[]>(messagesSql, messageParams);

  return { data: await enrichScheduledRows(messages, establishmentId), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getScheduledMessageById(scheduleId: number, establishmentId: number): Promise<any | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.sender_id, m.created_at AS message_created_at, m.updated_at AS message_updated_at, u.first_name AS sender_first_name, u.last_name AS sender_last_name FROM scheduled_messages sm JOIN messages m ON m.id = sm.message_id AND m.establishment_id = sm.establishment_id LEFT JOIN users u ON u.id = m.sender_id AND u.establishment_id = sm.establishment_id WHERE sm.id = ? AND sm.establishment_id = ?`, [scheduleId, establishmentId]);
  if (!rows.length) return null;
  const [enriched] = await Promise.all([enrichScheduledRows(rows, establishmentId)]);
  return enriched[0] || null;
}
