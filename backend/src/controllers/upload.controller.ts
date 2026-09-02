import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { uploadDir } from '../middleware/upload.js';

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'Aucun fichier fourni.' });
      return;
    }

    const fileUrl = `/uploads/${file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        url: fileUrl,
        filename: file.filename,
        original_name: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params;

    if (!filename || filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ success: false, error: 'Nom de fichier invalide.' });
      return;
    }

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Fichier non trouvé.' });
      return;
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ success: true, message: 'Fichier supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
