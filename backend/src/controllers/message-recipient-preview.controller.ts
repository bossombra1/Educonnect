import { Request, Response } from 'express';
import * as recipientService from '../services/message-recipient.service.js';

export async function previewRecipients(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const body = req.body as any;
    const recipientIds = await recipientService.resolveRecipientIds(
      user.establishmentId,
      body.groupIds ?? body.group_ids,
      body.classIds ?? body.class_ids,
      body.roleIds ?? body.roles,
      body.recipientIds ?? body.recipient_ids,
      user.userId,
    );

    res.status(200).json({
      success: true,
      data: {
        recipient_count: recipientIds.length,
        recipient_ids: recipientIds.map(String),
      },
    });
  } catch (err) {
    const message = (err as Error)?.message || 'Impossible de calculer les destinataires.';
    if (message === 'Aucun destinataire spécifié.') {
      res.status(200).json({ success: true, data: { recipient_count: 0, recipient_ids: [] } });
      return;
    }
    res.status(400).json({ success: false, error: message });
  }
}
