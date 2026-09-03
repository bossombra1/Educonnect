import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service.js';

function getEstablishmentId(req: Request): number | null {
  const id = Number((req.user as any)?.establishmentId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await notificationService.getUserNotifications(user.userId, { page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getAdminNotifications(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    if (establishmentId === null) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await notificationService.getAdminNotifications(establishmentId, { page, limit, search });
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    if (establishmentId === null) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    const stats = await notificationService.getAdminNotificationStats(establishmentId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function sendAdminNotification(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    if (establishmentId === null) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    const { title, body, user_ids, group_ids } = req.body as { title?: string; body?: string; user_ids?: number[]; group_ids?: number[] };
    if (!title?.trim() || !body?.trim()) { res.status(400).json({ success: false, error: 'Le titre et le contenu sont requis.' }); return; }
    if (!Array.isArray(user_ids) && !Array.isArray(group_ids)) { res.status(400).json({ success: false, error: 'Sélectionnez des utilisateurs ou des groupes.' }); return; }
    const recipients = await notificationService.resolveAdminNotificationRecipients(establishmentId, Array.isArray(user_ids) ? user_ids : [], Array.isArray(group_ids) ? group_ids : []);
    if (!recipients.length) { res.status(400).json({ success: false, error: 'Aucun destinataire valide.' }); return; }
    const sent = await notificationService.sendNotificationToUsers(recipients, title.trim(), body.trim());
    res.status(201).json({ success: true, data: { recipients: recipients.length, sent }, message: 'Notification envoyée avec succès.' });
  } catch (err) { res.status(400).json({ success: false, error: (err as Error).message }); }
}

export async function registerFcmToken(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const { token, device_type } = req.body;
    if (!token) { res.status(400).json({ success: false, error: 'Le token FCM est requis.' }); return; }
    const safeType = (device_type && ['android', 'ios', 'web'].includes(device_type)) ? device_type : 'android';
    await notificationService.registerFcmToken(user.userId, token, safeType);
    res.status(200).json({ success: true, message: 'Token FCM enregistré.' });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}
