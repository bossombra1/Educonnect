import type { RowDataPacket } from 'mysql2/promise';
import admin from 'firebase-admin';
import { env } from './env.js';

let isFirebaseInitialized = false;

function initializeFirebase(): void {
  if (isFirebaseInitialized) return;

  if (!env.firebase.projectId || !env.firebase.privateKey || !env.firebase.clientEmail) {
    console.log('[Firebase] Not configured — push notifications disabled');
    return;
  }

  try {
    const credential = admin.credential.cert({
      projectId: env.firebase.projectId,
      privateKey: env.firebase.privateKey,
      clientEmail: env.firebase.clientEmail,
    });

    if (admin.apps.length === 0) {
      admin.initializeApp({ credential });
    }

    isFirebaseInitialized = true;
    console.log('[Firebase] Initialized successfully');
  } catch (err) {
    console.error('[Firebase] Initialization failed:', (err as Error).message);
  }
}

initializeFirebase();

export async function sendPushNotification(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!isFirebaseInitialized) return false;

  try {
    const { getPool } = await import('../config/database.js');
    const pool = getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT fcm_token FROM users WHERE id = ? AND fcm_token IS NOT NULL AND fcm_token != ?',
      [userId, '']
    );

    if (!rows.length || !rows[0].fcm_token) return false;

    const fcmToken = rows[0].fcm_token as string;
    const message: admin.messaging.Message = {
      notification: { title, body },
      token: fcmToken,
    };

    if (data) message.data = data;

    const messageId = await admin.messaging().send(message);
    await pool.query(
      `UPDATE notifications
       SET fcm_message_id = ?, fcm_status = 'sent', sent_at = COALESCE(sent_at, NOW())
       WHERE user_id = ? AND title = ? AND body = ? AND fcm_status = 'pending'
       ORDER BY id DESC LIMIT 1`,
      [messageId, userId, title, body]
    );
    return true;
  } catch (err) {
    console.error(`[Firebase] Failed to send push to user ${userId}:`, (err as Error).message);
    return false;
  }
}

export interface BulkPushResult {
  successCount: number;
  results: Array<{ userId: number; success: boolean; messageId?: string; error?: string }>;
}

export async function sendBulkPushNotificationsDetailed(
  userIds: number[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<BulkPushResult> {
  if (!isFirebaseInitialized || userIds.length === 0) return { successCount: 0, results: [] };

  try {
    const { getPool } = await import('../config/database.js');
    const pool = getPool();
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL AND fcm_token != ''`,
      userIds
    );

    if (rows.length === 0) return { successCount: 0, results: [] };

    const multicastMessage: admin.messaging.MulticastMessage = {
      notification: { title, body },
      tokens: rows.map((r) => r.fcm_token as string),
    };
    if (data) multicastMessage.data = data;

    const response = await admin.messaging().sendEachForMulticast(multicastMessage);
    const results = response.responses.map((item, index) => ({
      userId: Number(rows[index].id),
      success: item.success,
      ...(item.success && item.messageId ? { messageId: item.messageId } : {}),
      ...(!item.success && item.error ? { error: item.error.message } : {}),
    }));

    for (const result of results) {
      if (result.success && result.messageId) {
        await pool.query(
          `UPDATE notifications
           SET fcm_message_id = ?, fcm_status = 'sent', sent_at = COALESCE(sent_at, NOW())
           WHERE user_id = ? AND title = ? AND body = ? AND fcm_status = 'pending'
           ORDER BY id DESC LIMIT 1`,
          [result.messageId, result.userId, title, body]
        );
      } else if (!result.success) {
        await pool.query(
          `UPDATE notifications
           SET fcm_status = 'failed'
           WHERE user_id = ? AND title = ? AND body = ? AND fcm_status = 'pending'
           ORDER BY id DESC LIMIT 1`,
          [result.userId, title, body]
        );
      }
    }

    return { successCount: response.successCount, results };
  } catch (err) {
    console.error('[Firebase] Bulk push failed:', (err as Error).message);
    return { successCount: 0, results: [] };
  }
}

export async function sendBulkPushNotifications(
  userIds: number[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  const result = await sendBulkPushNotificationsDetailed(userIds, title, body, data);
  return result.successCount;
}

export { isFirebaseInitialized };
