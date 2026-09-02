import { Request, Response } from 'express';
import * as statisticsService from '../services/statistics.service.js';

function getEstablishmentId(req: Request): number | null {
  const id = Number((req.user as any)?.establishmentId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    if (establishmentId === null) {
      res.status(403).json({ success: false, error: 'Établissement non identifié.' });
      return;
    }
    const stats = await statisticsService.getDashboardStats(establishmentId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMessageStats(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    if (establishmentId === null) {
      res.status(403).json({ success: false, error: 'Établissement non identifié.' });
      return;
    }
    const stats = await statisticsService.getMessageStatsForEstablishment(establishmentId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getMessageStatsById(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    const messageId = Number(req.params.id);
    if (establishmentId === null) {
      res.status(403).json({ success: false, error: 'Établissement non identifié.' });
      return;
    }
    if (!Number.isInteger(messageId) || messageId <= 0) {
      res.status(400).json({ success: false, error: 'ID de message invalide.' });
      return;
    }
    const stats = await statisticsService.getMessageStats(messageId, establishmentId);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getExportStats(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = getEstablishmentId(req);
    if (establishmentId === null) {
      res.status(403).json({ success: false, error: 'Établissement non identifié.' });
      return;
    }
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
    const stats = await statisticsService.getDailyMessageStats(establishmentId, days);
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
