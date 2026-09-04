import { Request, Response } from 'express';
import * as messageService from '../services/message.service.js';
import * as scheduledService from '../services/scheduled-message.service.js';
import * as recipientService from '../services/message-recipient.service.js';
import * as schedulingService from '../services/message-scheduling.service.js';
import { getMessageHistoryWithType, getMessageHistoryDetail as getMessageHistoryDetailService } from '../services/message-history-filter.service.js';
import { RequestWithUser } from '../types/index.js';

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(',')).filter(Boolean);
  if (value == null || value === '') return [];
  return String(value).split(',').filter(Boolean);
}

function numberValues(value: unknown): number[] {
  return values(value).map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

function attachmentsFromRequest(req: Request): Array<{ file_name: string; file_url: string; file_type: string; file_size: number }> {
  return (req.files as any[] || []).map((f) => ({ file_name: f.originalname, file_url: f.path, file_type: f.mimetype?.startsWith('image') ? 'image' : f.mimetype === 'application/pdf' ? 'pdf' : 'other', file_size: Number(f.size) || 0 }));
}

function sendMessageError(res: Response, err: unknown): void {
  const error = err as Error;
  const message = error?.message || 'Erreur lors du traitement du message.';
  const clientError = /destinataire|groupe|date de programmation|contenu du message/i.test(message);
  if (!clientError) console.error('[Messages] Erreur interne:', err);
  res.status(clientError ? 400 : 500).json({ success: false, error: clientError ? message : 'Une erreur interne est survenue lors du traitement du message.' });
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const classId = req.query.class_id ? parseInt(req.query.class_id as string) : undefined;
    const priority = req.query.priority as string | undefined;
    const result = await messageService.getMessages(user.userId, user.role, { page, limit, status, class_id: classId, priority });
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getMessageById(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID de message invalide.' }); return; }
    const message = await messageService.getMessageById(messageId, user.userId, user.role, user.establishmentId);
    if (!message) { res.status(404).json({ success: false, error: 'Message non trouvé.' }); return; }
    res.status(200).json({ success: true, data: message });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function sendMessage(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const body = req.body as any;
    const content = String(body.content || '').trim();
    if (!content) { res.status(400).json({ success: false, error: 'Le contenu du message est requis.' }); return; }
    const recipientIds = await recipientService.resolveRecipientIds(user.establishmentId, body.groupIds ?? body.group_ids, body.classIds ?? body.class_ids, body.roleIds ?? body.roles, body.recipientIds ?? body.recipient_ids, user.userId);
    const attachments = attachmentsFromRequest(req);
    const result = await messageService.sendMessage({ group_ids: [], recipient_ids: recipientIds, title: body.title || undefined, content, message_type: body.type || body.message_type || 'text', priority: body.priority || 'normal', link_url: body.linkUrl || body.link_url || undefined }, user.userId, user.establishmentId, recipientIds, attachments.length ? attachments : undefined);
    res.status(201).json({ success: true, data: result, message: 'Message envoyé avec succès.' });
  } catch (err) { sendMessageError(res, err); }
}

export async function scheduleMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const body = req.body as any; const content = String(body.content || '').trim(); const scheduledFor = body.scheduledAt || body.scheduled_for;
    if (!content) { res.status(400).json({ success: false, error: 'Le contenu du message est requis.' }); return; }
    if (!scheduledFor) { res.status(400).json({ success: false, error: 'La date de programmation est requise.' }); return; }
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) { res.status(400).json({ success: false, error: 'Date de programmation invalide.' }); return; }
    if (scheduledDate <= new Date()) { res.status(400).json({ success: false, error: 'La date de programmation doit être dans le futur.' }); return; }
    const recipientIds = await recipientService.resolveRecipientIds(user.establishmentId, body.groupIds ?? body.group_ids, body.classIds ?? body.class_ids, body.roleIds ?? body.roles, body.recipientIds ?? body.recipient_ids, user.userId);
    const attachments = attachmentsFromRequest(req);
    const result = await schedulingService.createScheduledMessage({ title: body.title || undefined, content, message_type: body.type || body.message_type || 'text', priority: body.priority || 'normal', link_url: body.linkUrl || body.link_url || undefined }, user.userId, user.establishmentId, recipientIds, scheduledDate.toISOString(), attachments);
    res.status(201).json({ success: true, data: result, message: 'Message programmé avec succès.' });
  } catch (err) { sendMessageError(res, err); }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const messageId = parseInt(req.params.id); if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID de message invalide.' }); return; } await messageService.markAsRead(messageId, user.userId, user.establishmentId); res.status(200).json({ success: true, message: 'Message marqué comme lu.' }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function acknowledgeMessage(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const messageId = parseInt(req.params.id); if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID de message invalide.' }); return; } await messageService.acknowledgeMessage(messageId, user.userId, user.establishmentId); res.status(200).json({ success: true, message: 'Message acquitté avec succès.' }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getMessageStatistics(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const messageId = parseInt(req.params.id); if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID de message invalide.' }); return; } const stats = await messageService.getMessageStatistics(messageId, user.establishmentId); res.status(200).json({ success: true, data: stats }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getMessageRecipients(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const messageId = parseInt(req.params.id); if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID de message invalide.' }); return; } const page = parseInt(req.query.page as string) || 1; const limit = parseInt(req.query.limit as string) || 20; const result = await recipientService.getMessageRecipients(messageId, user.establishmentId, page, limit); res.status(200).json({ success: true, data: result.data, pagination: result.pagination }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getMessageRecipientStats(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const messageId = parseInt(req.params.id); if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID de message invalide.' }); return; } const stats = await recipientService.getMessageRecipientStats(messageId, user.establishmentId); res.status(200).json({ success: true, data: stats }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getMessageHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const date_from = req.query.date_from as string | undefined;
    const date_to = req.query.date_to as string | undefined;
    const class_id = req.query.class_id ? parseInt(req.query.class_id as string) : undefined;
    const priority = req.query.priority as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const filters = { date_from, date_to, class_id, priority, status, type };
    const result = await getMessageHistoryWithType(user.establishmentId, filters, { page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getMessageHistoryDetail(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }
    const detail = await getMessageHistoryDetailService(messageId, user.establishmentId);
    if (!detail) {
      res.status(404).json({ success: false, error: 'Élément d’historique non trouvé.' });
      return;
    }
    res.status(200).json({ success: true, data: detail });
  } catch (err) {
    console.error('[Messages] Erreur détail historique:', err);
    res.status(500).json({ success: false, error: 'Une erreur interne est survenue lors du chargement de l’historique.' });
  }
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const count = await messageService.getUnreadCount(user.userId); res.status(200).json({ success: true, data: { count } }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function cancelScheduledMessage(req: Request, res: Response): Promise<void> {
  try { const user = req.user as any; const messageId = parseInt(req.params.id); if (isNaN(messageId)) { res.status(400).json({ success: false, error: 'ID invalide.' }); return; } await scheduledService.cancelScheduledMessage(messageId, user.establishmentId); res.status(200).json({ success: true, message: 'Message programmé annulé.' }); }
  catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}
