import { Request, Response } from 'express';
import * as statisticsService from '../services/statistics.service.js';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const stats = await statisticsService.getDashboardStats(user.establishmentId ?? null);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMessageStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const stats = await statisticsService.getMessageStatsForEstablishment(user.establishmentId ?? null);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMessageStatsById(req: Request, res: Response): Promise<void> {
  try {
    const messageId = Number(req.params.id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }
    const stats = await statisticsService.getMessageStats(messageId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getExportStats(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
    const stats = await statisticsService.getDailyMessageStats(user.establishmentId ?? null, days);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
