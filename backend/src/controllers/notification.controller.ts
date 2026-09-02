import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service.js';

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await notificationService.getUserNotifications(user.userId, { page, limit });

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

export async function registerFcmToken(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const { token, device_type } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Le token FCM est requis.' });
      return;
    }

    // Validate device_type against ENUM('android','ios','web'), default to 'android' if invalid
    const validDeviceTypes = new Set(['android', 'ios', 'web']);
    const safeType = (device_type && validDeviceTypes.has(device_type)) ? device_type : 'android';

    await notificationService.registerFcmToken(user.userId, token, safeType);
    res.status(200).json({ success: true, message: 'Token FCM enregistré.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
