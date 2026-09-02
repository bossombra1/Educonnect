import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import * as scheduledMessageService from '../services/scheduled-message.service.js';
import { success, error, paginated } from '../utils/response.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const VALID_STATUSES = new Set(['pending', 'processing', 'sent', 'failed', 'cancelled']);

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['sent', 'failed', 'pending'],
  failed: ['pending'],
  cancelled: ['pending'],
};

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;

    if (status && !VALID_STATUSES.has(status)) {
      error(
        res,
        'Statut invalide. Valeurs acceptées : pending, processing, sent, failed, cancelled.'
      );
      return;
    }

    if (status) {
      // Service does not support status filtering, so query directly
      const pool = getPool();

      const [countRows] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM scheduled_messages WHERE establishment_id = ? AND status = ?',
        [user.establishmentId, status]
      );
      const total = countRows[0].total as number;
      const totalPages = Math.ceil(total / limit);

      const offset = (page - 1) * limit;
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT sm.*, m.title, m.content, m.message_type, m.priority
         FROM scheduled_messages sm
         JOIN messages m ON m.id = sm.message_id
         WHERE sm.establishment_id = ? AND sm.status = ?
         ORDER BY sm.scheduled_for DESC
         LIMIT ? OFFSET ?`,
        [user.establishmentId, status, limit, offset]
      );

      paginated(res, { data: rows, total, page, limit, totalPages });
    } else {
      const result = await scheduledMessageService.getScheduledMessages(
        user.establishmentId,
        { page, limit }
      );
      paginated(res, result);
    }
  } catch (err) {
    error(res, 'Erreur lors de la récupération des messages programmés.');
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      error(res, 'Identifiant invalide.');
      return;
    }

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.sender_id
       FROM scheduled_messages sm
       JOIN messages m ON m.id = sm.message_id
       WHERE sm.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      error(res, 'Message programmé non trouvé.', 404);
      return;
    }

    success(res, rows[0]);
  } catch (err) {
    error(res, 'Erreur lors de la récupération du message programmé.');
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      error(res, 'Identifiant invalide.');
      return;
    }

    const { status, scheduled_for } = req.body;

    if (!status && !scheduled_for) {
      error(res, 'Au moins un champ (status ou scheduled_for) est requis.');
      return;
    }

    const pool = getPool();

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM scheduled_messages WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      error(res, 'Message programmé non trouvé.', 404);
      return;
    }

    const record = existing[0];

    // Handle cancellation via the existing service method
    if (status === 'cancelled') {
      if (record.status !== 'pending') {
        error(res, 'Seuls les messages en attente peuvent être annulés.');
        return;
      }

      await scheduledMessageService.cancelScheduledMessage(id);

      const [updated] = await pool.query<RowDataPacket[]>(
        `SELECT sm.*, m.title, m.content, m.message_type, m.priority
         FROM scheduled_messages sm
         JOIN messages m ON m.id = sm.message_id
         WHERE sm.id = ?`,
        [id]
      );

      success(res, updated[0]);
      return;
    }

    // Validate status transition
    if (status) {
      const allowed = VALID_TRANSITIONS[record.status as string] || [];
      if (!allowed.includes(status)) {
        error(
          res,
          `Transition de statut invalide de « ${record.status} » vers « ${status } ».`
        );
        return;
      }
    }

    // Build dynamic update
    const setParts: string[] = [];
    const params: any[] = [];

    if (status) {
      setParts.push('status = ?');
      params.push(status);
    }

    if (scheduled_for) {
      const newDate = new Date(scheduled_for);
      if (isNaN(newDate.getTime())) {
        error(res, 'Date de programmation invalide.');
        return;
      }

      setParts.push('scheduled_for = ?');
      params.push(newDate);

      // Also update the associated message scheduled_at
      await pool.query(
        'UPDATE messages SET scheduled_at = ? WHERE id = ?',
        [newDate, record.message_id]
      );
    }

    setParts.push('updated_at = NOW()');
    params.push(id);

    await pool.query(
      `UPDATE scheduled_messages SET ${setParts.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await pool.query<RowDataPacket[]>(
      `SELECT sm.*, m.title, m.content, m.message_type, m.priority
       FROM scheduled_messages sm
       JOIN messages m ON m.id = sm.message_id
       WHERE sm.id = ?`,
      [id]
    );

    success(res, updated[0]);
  } catch (err) {
    const msg = (err as Error).message;
    error(res, msg || 'Erreur lors de la mise à jour du message programmé.');
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      error(res, 'Identifiant invalide.');
      return;
    }

    const pool = getPool();

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM scheduled_messages WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      error(res, 'Message programmé non trouvé.', 404);
      return;
    }

    const record = existing[0];

    if (record.status === 'sent' || record.status === 'processing') {
      error(
        res,
        'Impossible de supprimer un message en cours de traitement ou déjà envoyé.'
      );
      return;
    }

    // Revert the associated message back to draft if it was pending
    if (record.status === 'pending') {
      await pool.query(
        "UPDATE messages SET status = 'draft', scheduled_at = NULL WHERE id = ?",
        [record.message_id]
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM scheduled_messages WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      error(res, 'Message programmé non trouvé.', 404);
      return;
    }

    success(res, { deleted: true });
  } catch (err) {
    error(res, 'Erreur lors de la suppression du message programmé.');
  }
}

export async function processNow(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      error(res, 'Identifiant invalide.');
      return;
    }

    const pool = getPool();

    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT sm.*, m.title, m.content, m.message_type, m.priority, m.establishment_id
       FROM scheduled_messages sm
       JOIN messages m ON m.id = sm.message_id
       WHERE sm.id = ?`,
      [id]
    );

    if (existing.length === 0) {
      error(res, 'Message programmé non trouvé.', 404);
      return;
    }

    const record = existing[0];

    if (record.status !== 'pending') {
      error(res, 'Seuls les messages en attente peuvent être traités immédiatement.');
      return;
    }

    // Mark as processing
    await pool.query(
      "UPDATE scheduled_messages SET status = 'processing', last_attempt_at = NOW() WHERE id = ?",
      [id]
    );

    try {
      // Update message status to sent
      await pool.query(
        "UPDATE messages SET status = 'sent', sent_at = NOW() WHERE id = ?",
        [record.message_id]
      );

      // Mark scheduled message as sent
      await pool.query(
        "UPDATE scheduled_messages SET status = 'sent', last_attempt_at = NOW() WHERE id = ?",
        [id]
      );

      // Send push notifications to recipients
      const [recipients] = await pool.query<RowDataPacket[]>(
        'SELECT user_id FROM message_recipients WHERE message_id = ?',
        [record.message_id]
      );

      if (recipients.length > 0) {
        try {
          const { sendBulkPushNotifications } = await import('../config/firebase.js');
          const userIds = recipients.map((r) => r.user_id as number);
          await sendBulkPushNotifications(
            userIds,
            (record.title as string) || 'Message programmé',
            ((record.content as string) || '').substring(0, 100),
            { messageId: record.message_id.toString(), type: 'MESSAGE' }
          );
        } catch {
          // L'échec de l'envoi de notification push ne doit pas bloquer le traitement
        }
      }

      // Return the updated record
      const [updated] = await pool.query<RowDataPacket[]>(
        `SELECT sm.*, m.title, m.content, m.message_type, m.priority
         FROM scheduled_messages sm
         JOIN messages m ON m.id = sm.message_id
         WHERE sm.id = ?`,
        [id]
      );

      success(res, updated[0]);
    } catch (processErr) {
      const errorMsg = (processErr as Error).message;
      const newRetryCount = (record.retry_count as number) + 1;

      if (newRetryCount >= 3) {
        await pool.query(
          'UPDATE scheduled_messages SET status = ?, retry_count = ?, error_message = ? WHERE id = ?',
          ['failed', newRetryCount, errorMsg, id]
        );
        await pool.query(
          "UPDATE messages SET status = 'draft' WHERE id = ?",
          [record.message_id]
        );
      } else {
        await pool.query(
          'UPDATE scheduled_messages SET status = ?, retry_count = ?, error_message = ? WHERE id = ?',
          ['pending', newRetryCount, errorMsg, id]
        );
      }

      error(res, `Échec du traitement du message programmé : ${errorMsg}`);
    }
  } catch (err) {
    error(res, 'Erreur lors du traitement du message programmé.');
  }
}
