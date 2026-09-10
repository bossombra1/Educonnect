import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { uploadDir } from '../middleware/upload.js';
import { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database.js';

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

function safeRelativePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  const relative = normalized.startsWith('uploads/') ? normalized.slice('uploads/'.length) : normalized;
  if (!relative || relative.split('/').some((segment) => segment === '..' || segment === '')) return '';
  return relative;
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  const user = req.user as { userId: number; role: string; establishmentId: number };
  const requested = String(req.params[0] || req.params.filename || '');
  const relative = safeRelativePath(requested);
  if (!relative) {
    res.status(400).json({ success: false, error: 'Nom de fichier invalide.' });
    return;
  }
  try {
    const pool = getPool();
    const filename = path.basename(relative);
    const [attachments] = await pool.query<RowDataPacket[]>(
      `SELECT ma.file_name, ma.file_url, ma.message_id
       FROM message_attachments ma JOIN messages m ON m.id = ma.message_id
       WHERE m.establishment_id = ? AND (ma.file_url = ? OR ma.file_url LIKE ?)
       LIMIT 1`,
      [user.establishmentId, `/uploads/${relative}`, `%/${filename}`],
    );
    const attachment = attachments[0];
    if (!attachment) {
      res.status(404).json({ success: false, error: 'Fichier non trouvé.' });
      return;
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      const [access] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM message_recipients WHERE message_id = ? AND user_id = ? LIMIT 1',
        [attachment.message_id, user.userId],
      );
      if (!access.length) {
        res.status(403).json({ success: false, error: 'Accès refusé à cette pièce jointe.' });
        return;
      }
    }
    const storedRelative = safeRelativePath(String(attachment.file_url || ''));
    const root = path.resolve(uploadDir);
    const candidates = [path.resolve(root, storedRelative || relative), path.resolve(root, filename)];
    const filePath = candidates.find((candidate) => candidate.startsWith(`${root}${path.sep}`) && fs.existsSync(candidate));
    if (!filePath) {
      res.status(404).json({ success: false, error: 'Fichier non trouvé sur le serveur.' });
      return;
    }
    res.download(filePath, String(attachment.file_name || filename), { dotfiles: 'deny' });
  } catch {
    res.status(500).json({ success: false, error: 'Impossible de télécharger le fichier.' });
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
