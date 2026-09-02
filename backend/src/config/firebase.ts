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

    if (data) {
      message.data = data;
    }

    await admin.messaging().send(message);
    return true;
  } catch (err) {
    console.error(`[Firebase] Failed to send push to user ${userId}:`, (err as Error).message);
    return false;
  }
}

export async function sendBulkPushNotifications(
  userIds: number[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  if (!isFirebaseInitialized) return 0;

  try {
    const { getPool } = await import('../config/database.js');
    const pool = getPool();

    if (userIds.length === 0) return 0;

    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL AND fcm_token != ''`,
      userIds
    );

    const validTokens = rows.filter((r) => r.fcm_token);
    if (validTokens.length === 0) return 0;

    const tokens = validTokens.map((r) => r.fcm_token as string);
    const multicastMessage: admin.messaging.MulticastMessage = {
      notification: { title, body },
      tokens,
    };

    if (data) {
      multicastMessage.data = data;
    }

    const response = await admin.messaging().sendEachForMulticast(multicastMessage);
    return response.successCount;
  } catch (err) {
    console.error('[Firebase] Bulk push failed:', (err as Error).message);
    return 0;
  }
}

export { isFirebaseInitialized };
