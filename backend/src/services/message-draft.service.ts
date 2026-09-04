import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { sendBulkPushNotifications } from '../config/firebase.js';

export interface DraftMessageInput { title?: string; content: string; message_type?: string; priority?: string; link_url?: string; }
export interface DraftAttachment { file_name: string; file_url: string; file_type: string; file_size: number; }

function messageType(data: DraftMessageInput, attachments: DraftAttachment[]): string {
  const type = data.message_type || 'text';
  if (attachments.length && type === 'text') {
    const ext = attachments[0].file_name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
  }
  return type;
}

async function validateRecipients(conn: any, recipientIds: number[], establishmentId: number, senderId: number): Promise<number[]> {
  const unique = [...new Set(recipientIds.map(Number).filter((id) => Number.isInteger(id) && id > 0 && id !== senderId))];
  if (!unique.length) return [];
  const placeholders = unique.map(() => '?').join(',');
  const [rows] = await conn.query<RowDataPacket[]>(`SELECT id FROM users WHERE id IN (${placeholders}) AND establishment_id = ? AND is_active = 1`, [...unique, establishmentId]);
  if (rows.length !== unique.length) throw new Error('Un ou plusieurs destinataires appartiennent à un autre établissement ou n’existent pas.');
  return unique;
}

export async function createDraftMessage(data: DraftMessageInput, senderId: number, establishmentId: number, recipientIds: number[], attachments: DraftAttachment[] = []): Promise<any> {
  const pool = getPool(); const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const finalRecipients = await validateRecipients(conn, recipientIds, establishmentId, senderId);
    const [result] = await conn.query<ResultSetHeader>(`INSERT INTO messages (establishment_id, sender_id, title, content, message_type, priority, status, scheduled_at, sent_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', NULL, NULL)`, [establishmentId, senderId, data.title || null, data.content, messageType(data, attachments), data.priority || 'normal']);
    const messageId = result.insertId;
    if (finalRecipients.length) await conn.query(`INSERT INTO message_recipients (message_id, user_id, delivery_status) VALUES ?`, [finalRecipients.map((id) => [messageId, id, 'pending'])]);
    if (data.link_url) await conn.query(`INSERT INTO message_attachments (message_id, file_name, file_url, file_type) VALUES (?, 'link', ?, 'other')`, [messageId, data.link_url]);
    if (attachments.length) await conn.query(`INSERT INTO message_attachments (message_id, file_name, file_url, file_type, file_size) VALUES ?`, [attachments.map((a) => [messageId, a.file_name, a.file_url, a.file_type || 'other', a.file_size || null])]);
    await conn.commit(); return { id: messageId, recipient_count: finalRecipients.length, status: 'draft' };
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}

export async function getDrafts(establishmentId: number): Promise<any[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT m.*, u.first_name AS sender_first_name, u.last_name AS sender_last_name, (SELECT COUNT(*) FROM message_recipients mr WHERE mr.message_id = m.id) AS recipient_count FROM messages m LEFT JOIN users u ON u.id = m.sender_id AND u.establishment_id = m.establishment_id WHERE m.establishment_id = ? AND m.status = 'draft' ORDER BY m.updated_at DESC, m.created_at DESC`, [establishmentId]);
  return rows;
}

export async function getDraftById(draftId: number, establishmentId: number): Promise<any | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT m.*, u.first_name AS sender_first_name, u.last_name AS sender_last_name, (SELECT COUNT(*) FROM message_recipients mr WHERE mr.message_id = m.id) AS recipient_count FROM messages m LEFT JOIN users u ON u.id = m.sender_id AND u.establishment_id = m.establishment_id WHERE m.id = ? AND m.establishment_id = ? AND m.status = 'draft'`, [draftId, establishmentId]);
  if (!rows.length) return null;
  const [recipients] = await pool.query<RowDataPacket[]>(`SELECT mr.id, mr.user_id, mr.delivery_status, u.first_name, u.last_name, u.matricule, u.phone FROM message_recipients mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id = ? AND u.establishment_id = ? ORDER BY u.last_name, u.first_name`, [draftId, establishmentId]);
  const [attachments] = await pool.query<RowDataPacket[]>('SELECT * FROM message_attachments WHERE message_id = ?', [draftId]);
  return { ...rows[0], recipients, attachments };
}

export async function updateDraft(draftId: number, establishmentId: number, senderId: number, data: DraftMessageInput, recipientIds?: number[]): Promise<any | null> {
  const pool = getPool(); const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query<RowDataPacket[]>(`SELECT id FROM messages WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [draftId, establishmentId, senderId]);
    if (!existing.length) { await conn.rollback(); return null; }
    const recipients = recipientIds === undefined ? undefined : await validateRecipients(conn, recipientIds, establishmentId, senderId);
    await conn.query(`UPDATE messages SET title = ?, content = ?, message_type = ?, priority = ?, updated_at = NOW() WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [data.title || null, data.content, data.message_type || 'text', data.priority || 'normal', draftId, establishmentId, senderId]);
    if (recipients !== undefined) {
      await conn.query('DELETE FROM message_recipients WHERE message_id = ?', [draftId]);
      if (recipients.length) await conn.query(`INSERT INTO message_recipients (message_id, user_id, delivery_status) VALUES ?`, [recipients.map((id) => [draftId, id, 'pending'])]);
    }
    await conn.commit(); return getDraftById(draftId, establishmentId);
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}

export async function deleteDraft(draftId: number, establishmentId: number, senderId: number): Promise<boolean> {
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(`DELETE FROM messages WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [draftId, establishmentId, senderId]);
  return result.affectedRows > 0;
}

export async function sendDraft(draftId: number, establishmentId: number, senderId: number): Promise<any | null> {
  const pool = getPool(); const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(`SELECT id, title, content FROM messages WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [draftId, establishmentId, senderId]);
    if (!rows.length) { await conn.rollback(); return null; }
    const [recipients] = await conn.query<RowDataPacket[]>(`SELECT mr.user_id FROM message_recipients mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id = ? AND u.establishment_id = ? AND u.is_active = 1`, [draftId, establishmentId]);
    if (!recipients.length) throw new Error('Aucun destinataire spécifié.');
    await conn.query(`UPDATE messages SET status = 'sent', sent_at = NOW(), scheduled_at = NULL, updated_at = NOW() WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [draftId, establishmentId, senderId]);
    await conn.commit();
    const recipientIds = recipients.map((r) => Number(r.user_id));
    sendBulkPushNotifications(recipientIds, rows[0].title || 'Nouveau message', String(rows[0].content || '').substring(0, 100), { messageId: String(draftId), type: 'MESSAGE' }).catch(() => {});
    return { id: draftId, recipient_count: recipientIds.length, status: 'sent' };
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}

export async function scheduleDraft(draftId: number, establishmentId: number, senderId: number, scheduledFor: string): Promise<any | null> {
  const pool = getPool(); const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(`SELECT id FROM messages WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [draftId, establishmentId, senderId]);
    if (!rows.length) { await conn.rollback(); return null; }
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) throw new Error('La date de programmation doit être dans le futur.');
    const [recipients] = await conn.query<RowDataPacket[]>(`SELECT mr.user_id FROM message_recipients mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id = ? AND u.establishment_id = ? AND u.is_active = 1`, [draftId, establishmentId]);
    if (!recipients.length) throw new Error('Aucun destinataire spécifié.');
    const [existing] = await conn.query<RowDataPacket[]>(`SELECT id FROM scheduled_messages WHERE message_id = ? AND establishment_id = ? AND status = 'pending'`, [draftId, establishmentId]);
    if (existing.length) throw new Error('Ce brouillon est déjà programmé.');
    await conn.query(`UPDATE messages SET status = 'scheduled', scheduled_at = ?, updated_at = NOW() WHERE id = ? AND establishment_id = ? AND sender_id = ? AND status = 'draft'`, [scheduledFor, draftId, establishmentId, senderId]);
    const [scheduled] = await conn.query<ResultSetHeader>(`INSERT INTO scheduled_messages (establishment_id, message_id, scheduled_for, status, retry_count) VALUES (?, ?, ?, 'pending', 0)`, [establishmentId, draftId, scheduledFor]);
    await conn.commit(); return { id: scheduled.insertId, message_id: draftId, scheduled_for: scheduledFor, recipient_count: recipients.length, status: 'pending' };
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
}
