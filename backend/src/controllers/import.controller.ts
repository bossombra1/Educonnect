import { Request, Response } from 'express';
import * as importService from '../services/import.service.js';

export async function importStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'Aucun fichier fourni.' });
      return;
    }

    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      res.status(400).json({ success: false, error: 'Le fichier doit être un fichier Excel (.xlsx, .xls).' });
      return;
    }

    // file.buffer is available when using memoryStorage
    if (!file.buffer) {
      res.status(400).json({ success: false, error: 'Impossible de lire le fichier.' });
      return;
    }

    const result = await importService.importStudentsFromExcel(
      file.buffer,
      user.establishmentId,
      user.userId
    );

    res.status(201).json({
      success: true,
      data: result,
      message: `Import terminé: ${result.successCount} succès, ${result.failCount} échecs.`,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function previewImport(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'Aucun fichier fourni.' });
      return;
    }

    if (!file.buffer) {
      res.status(400).json({ success: false, error: 'Impossible de lire le fichier.' });
      return;
    }

    const result = await importService.previewImport(file.buffer);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function getImportHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await importService.getImportHistory(user.establishmentId, { page, limit });

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
