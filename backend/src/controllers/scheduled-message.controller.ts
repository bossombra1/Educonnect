import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import * as scheduledMessageService from '../services/scheduled-message.service.js';
import { success, error, paginated } from '../utils/response.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const VALID_STATUSES = new Set(['pending', 'processing', 'sent', 'failed', 'cancelled']);
const VALID_TRANSITIONS: Record<string, string[]> = { pending: ['processing', 'cancelled'], processing: ['sent', 'failed', 'pending'], failed: ['pending'], cancelled: ['pending'] };

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;
    if (status && !VALID_STATUSES.has(status)) { error(res, 'Statut invalide. Valeurs acceptées : pending, processing, sent, failed, cancelled.'); return; }
    const result = await scheduledMessageService.getScheduledMessages(user.establishmentId, { page, limit, status });
    paginated(res, result);
  } catch { error(res, 'Erreur lors de la récupération des messages programmés.'); }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10); const user = req.user as any;
    if (isNaN(id)) { error(res, 'Identifiant invalide.'); return; }
    const scheduledMessage = await scheduledMessageService.getScheduledMessageById(id, user.establishmentId);
    if (!scheduledMessage) { error(res, 'Message programmé non trouvé.', 404); return; }
    success(res, scheduledMessage);
  } catch { error(res, 'Erreur lors de la récupération du message programmé.'); }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10); const user = req.user as any;
    if (isNaN(id)) { error(res, 'Identifiant invalide.'); return; }
    const { status, scheduled_for } = req.body;
    if (!status && !scheduled_for) { error(res, 'Au moins un champ (status ou scheduled_for) est requis.'); return; }
    const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM scheduled_messages WHERE id = ? AND establishment_id = ?', [id, user.establishmentId]);
    if (!existing.length) { error(res, 'Message programmé non trouvé.', 404); return; }
    const record = existing[0];
    if (status === 'cancelled') {
      if (record.status !== 'pending') { error(res, 'Seuls les messages en attente peuvent être annulés.'); return; }
      await scheduledMessageService.cancelScheduledMessage(id, user.establishmentId);
      const updated = await scheduledMessageService.getScheduledMessageById(id, user.establishmentId);
      success(res, updated); return;
    }
    if (status) {
      const allowed = VALID_TRANSITIONS[record.status as string] || [];
      if (!allowed.includes(status)) { error(res, `Transition de statut invalide de « ${record.status} » vers « ${status} ».`); return; }
    }
    const setParts: string[] = []; const params: any[] = [];
    if (status) { setParts.push('status = ?'); params.push(status); }
    if (scheduled_for) {
      const newDate = new Date(scheduled_for); if (isNaN(newDate.getTime())) { error(res, 'Date de programmation invalide.'); return; }
      setParts.push('scheduled_for = ?'); params.push(newDate);
      await pool.query('UPDATE messages SET scheduled_at = ? WHERE id = ? AND establishment_id = ?', [newDate, record.message_id, user.establishmentId]);
    }
    setParts.push('updated_at = NOW()'); params.push(id, user.establishmentId);
    await pool.query(`UPDATE scheduled_messages SET ${setParts.join(', ')} WHERE id = ? AND establishment_id = ?`, params);
    const updated = await scheduledMessageService.getScheduledMessageById(id, user.establishmentId);
    success(res, updated);
  } catch (err) { error(res, (err as Error).message || 'Erreur lors de la mise à jour du message programmé.'); }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10); const user = req.user as any;
    if (isNaN(id)) { error(res, 'Identifiant invalide.'); return; }
    const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM scheduled_messages WHERE id = ? AND establishment_id = ?', [id, user.establishmentId]);
    if (!existing.length) { error(res, 'Message programmé non trouvé.', 404); return; }
    const record = existing[0];
    if (record.status === 'sent' || record.status === 'processing') { error(res, 'Impossible de supprimer un message en cours de traitement ou déjà envoyé.'); return; }
    if (record.status === 'pending') await pool.query("UPDATE messages SET status = 'draft', scheduled_at = NULL WHERE id = ? AND establishment_id = ?", [record.message_id, user.establishmentId]);
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM scheduled_messages WHERE id = ? AND establishment_id = ?', [id, user.establishmentId]);
    if (!result.affectedRows) { error(res, 'Message programmé non trouvé.', 404); return; }
    success(res, { deleted: true });
  } catch { error(res, 'Erreur lors de la suppression du message programmé.'); }
}

export async function processNow(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10); const user = req.user as any;
    if (isNaN(id)) { error(res, 'Identifiant invalide.'); return; }
    const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>(`SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.establishment_id FROM scheduled_messages sm JOIN messages m ON m.id = sm.message_id AND m.establishment_id = sm.establishment_id WHERE sm.id = ? AND sm.establishment_id = ?`, [id, user.establishmentId]);
    if (!existing.length) { error(res, 'Message programmé non trouvé.', 404); return; }
    const record = existing[0];
    if (record.status !== 'pending') { error(res, 'Seuls les messages en attente peuvent être traités immédiatement.'); return; }
    await pool.query("UPDATE scheduled_messages SET status = 'processing', last_attempt_at = NOW() WHERE id = ? AND establishment_id = ?", [id, user.establishmentId]);
    try {
      await pool.query("UPDATE messages SET status = 'sent', sent_at = NOW() WHERE id = ? AND establishment_id = ?", [record.message_id, user.establishmentId]);
      await pool.query("UPDATE scheduled_messages SET status = 'sent', last_attempt_at = NOW() WHERE id = ? AND establishment_id = ?", [id, user.establishmentId]);
      const [recipients] = await pool.query<RowDataPacket[]>('SELECT mr.user_id FROM message_recipients mr JOIN users u ON u.id = mr.user_id AND u.establishment_id = ? WHERE mr.message_id = ?', [user.establishmentId, record.message_id]);
      if (recipients.length) {
        try {
          const { sendBulkPushNotifications } = await import('../config/firebase.js');
          await sendBulkPushNotifications(recipients.map((r) => r.user_id as number), (record.title as string) || 'Message programmé', ((record.content as string) || '').substring(0, 100), { messageId: record.message_id.toString(), type: 'MESSAGE' });
        } catch { /* Push failure does not fail message processing. */ }
      }
      const updated = await scheduledMessageService.getScheduledMessageById(id, user.establishmentId);
      success(res, updated);
    } catch (processErr) {
      const errorMsg = (processErr as Error).message; const newRetryCount = Number(record.retry_count || 0) + 1;
      if (newRetryCount >= 3) {
        await pool.query('UPDATE scheduled_messages SET status = ?, retry_count = ?, error_message = ? WHERE id = ? AND establishment_id = ?', ['failed', newRetryCount, errorMsg, id, user.establishmentId]);
        await pool.query("UPDATE messages SET status = 'draft' WHERE id = ? AND establishment_id = ?", [record.message_id, user.establishmentId]);
      } else {
        await pool.query('UPDATE scheduled_messages SET status = ?, retry_count = ?, error_message = ? WHERE id = ? AND establishment_id = ?', ['pending', newRetryCount, errorMsg, id, user.establishmentId]);
      }
      error(res, `Échec du traitement du message programmé : ${errorMsg}`);
    }
  } catch { error(res, 'Erreur lors du traitement du message programmé.'); }
}
