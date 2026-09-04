import { Request, Response } from 'express';
import * as draftService from '../services/message-draft.service.js';
import * as recipientService from '../services/message-recipient.service.js';
import { RequestWithUser } from '../types/index.js';

function values(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(',')).filter(Boolean);
  if (value == null || value === '') return [];
  return String(value).split(',').filter(Boolean);
}

function hasRecipientTargets(body: any): boolean {
  return [body.groupIds ?? body.group_ids, body.classIds ?? body.class_ids, body.roleIds ?? body.roles, body.recipientIds ?? body.recipient_ids]
    .some((value) => values(value).length > 0);
}

function attachmentsFromRequest(req: Request): draftService.DraftAttachment[] {
  return (req.files as any[] || []).map((file) => ({
    file_name: file.originalname,
    file_url: file.path,
    file_type: file.mimetype?.startsWith('image') ? 'image' : file.mimetype === 'application/pdf' ? 'pdf' : 'other',
    file_size: Number(file.size) || 0,
  }));
}

export async function createDraftMessage(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const body = req.body as any;
    const content = String(body.content || '').trim();
    if (!content) {
      res.status(400).json({ success: false, error: 'Le contenu du message est requis pour un brouillon.' });
      return;
    }

    let recipientIds: number[] = [];
    if (hasRecipientTargets(body)) {
      recipientIds = await recipientService.resolveRecipientIds(
        user.establishmentId,
        body.groupIds ?? body.group_ids,
        body.classIds ?? body.class_ids,
        body.roleIds ?? body.roles,
        body.recipientIds ?? body.recipient_ids,
        user.userId,
      );
    }

    const attachments = attachmentsFromRequest(req);
    const result = await draftService.createDraftMessage(
      {
        title: body.title || undefined,
        content,
        message_type: body.type || body.message_type || 'text',
        priority: body.priority || 'normal',
        link_url: body.linkUrl || body.link_url || undefined,
      },
      user.userId,
      user.establishmentId,
      recipientIds,
      attachments,
    );

    res.status(201).json({ success: true, data: result, message: 'Brouillon enregistré avec succès.' });
  } catch (error) {
    console.error('[Messages] Erreur enregistrement brouillon:', error);
    const message = (error as Error)?.message || 'Impossible d’enregistrer le brouillon.';
    res.status(400).json({ success: false, error: message });
  }
}
