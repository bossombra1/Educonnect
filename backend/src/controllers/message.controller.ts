import { Request, Response } from 'express';
import * as messageService from '../services/message.service.js';
import * as scheduledService from '../services/scheduled-message.service.js';
import { RequestWithUser } from '../types/index.js';

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const classId = req.query.class_id ? parseInt(req.query.class_id as string) : undefined;
    const priority = req.query.priority as string | undefined;

    const result = await messageService.getMessages(user.userId, user.role, {
      page,
      limit,
      status,
      class_id: classId,
      priority,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMessageById(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }

    const message = await messageService.getMessageById(messageId, user.userId, user.role, user.establishmentId);

    if (!message) {
      res.status(404).json({ success: false, error: 'Message non trouvé.' });
      return;
    }

    res.status(200).json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function sendMessage(req: RequestWithUser, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const { group_ids, recipient_ids, title, content, message_type, priority, link_url } = req.body;

    if (!content) {
      res.status(400).json({ success: false, error: 'Le contenu du message est requis.' });
      return;
    }

    const attachments = (req.files as Express.Multer.File[] || []).map((f) => ({
      file_name: f.originalname,
      file_url: f.path,
      file_type: f.mimetype.startsWith('image') ? 'image' : f.mimetype === 'application/pdf' ? 'pdf' : 'other',
      file_size: f.size,
    }));

    const result = await messageService.sendMessage(
      { group_ids, recipient_ids, title, content, message_type, priority, link_url },
      user.userId,
      user.establishmentId,
      recipient_ids || [],
      attachments.length > 0 ? attachments : undefined
    );

    res.status(201).json({ success: true, data: result, message: 'Message envoyé avec succès.' });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function scheduleMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const { message_id, scheduled_for } = req.body;

    if (!message_id || !scheduled_for) {
      res.status(400).json({ success: false, error: 'message_id et scheduled_for sont requis.' });
      return;
    }

    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      res.status(400).json({ success: false, error: 'Date de programmation invalide.' });
      return;
    }

    if (scheduledDate <= new Date()) {
      res.status(400).json({ success: false, error: 'La date de programmation doit être dans le futur.' });
      return;
    }

    const result = await scheduledService.scheduleMessage(message_id, user.establishmentId, scheduled_for);
    res.status(201).json({ success: true, data: result, message: 'Message programmé avec succès.' });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }

    await messageService.markAsRead(messageId, user.userId, user.establishmentId);
    res.status(200).json({ success: true, message: 'Message marqué comme lu.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function acknowledgeMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }

    await messageService.acknowledgeMessage(messageId, user.userId, user.establishmentId);
    res.status(200).json({ success: true, message: 'Message acquitté avec succès.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMessageStatistics(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }

    const stats = await messageService.getMessageStatistics(messageId, user.establishmentId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
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

    const result = await messageService.getMessageHistory(user.establishmentId, {
      date_from,
      date_to,
      class_id,
      priority,
      status,
    }, { page, limit });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const count = await messageService.getUnreadCount(user.userId);
    res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function cancelScheduledMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      res.status(400).json({ success: false, error: 'ID invalide.' });
      return;
    }
    await scheduledService.cancelScheduledMessage(messageId, user.establishmentId);
    res.status(200).json({ success: true, message: 'Message programmé annulé.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
