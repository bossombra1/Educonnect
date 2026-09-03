import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getPool } from '../config/database.js';
import { uploadDir } from '../middleware/upload.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = req.user.establishmentId;
    const [rows] = await getPool().query<RowDataPacket[]>('SELECT id, name, slug, logo_url, address, phone, email, max_students, is_active FROM establishments WHERE id = ?', [establishmentId]);
    if (!rows.length) { res.status(404).json({ success: false, error: 'Établissement non trouvé.' }); return; }
    res.json({ success: true, data: rows[0] });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = req.user.establishmentId;
    const { name, address, phone, email } = req.body as Record<string, unknown>;
    if (!String(name || '').trim()) { res.status(400).json({ success: false, error: 'Le nom de l’établissement est requis.' }); return; }
    const [result] = await getPool().query<ResultSetHeader>('UPDATE establishments SET name = ?, address = ?, phone = ?, email = ? WHERE id = ?', [String(name).trim(), address ? String(address).trim() : null, phone ? String(phone).trim() : null, email ? String(email).trim() : null, establishmentId]);
    if (!result.affectedRows) { res.status(404).json({ success: false, error: 'Établissement non trouvé.' }); return; }
    const [rows] = await getPool().query<RowDataPacket[]>('SELECT id, name, slug, logo_url, address, phone, email, max_students, is_active FROM establishments WHERE id = ?', [establishmentId]);
    res.json({ success: true, data: rows[0], message: 'Paramètres sauvegardés.' });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}

export async function uploadEstablishmentLogo(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = req.user.establishmentId;
    const file = req.file;
    if (!file) { res.status(400).json({ success: false, error: 'Aucun logo fourni.' }); return; }

    const [rows] = await getPool().query<RowDataPacket[]>('SELECT logo_url FROM establishments WHERE id = ?', [establishmentId]);
    if (!rows.length) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ success: false, error: 'Établissement non trouvé.' });
      return;
    }

    const previousLogo = typeof rows[0].logo_url === 'string' ? rows[0].logo_url : null;
    const logoUrl = `/uploads/${file.filename}`;
    await getPool().query<ResultSetHeader>('UPDATE establishments SET logo_url = ? WHERE id = ?', [logoUrl, establishmentId]);

    if (previousLogo?.startsWith('/uploads/')) {
      const previousFilename = path.basename(previousLogo);
      const previousPath = path.join(uploadDir, previousFilename);
      if (fs.existsSync(previousPath) && previousFilename !== file.filename) fs.unlinkSync(previousPath);
    }

    const [updated] = await getPool().query<RowDataPacket[]>('SELECT id, name, slug, logo_url, address, phone, email, max_students, is_active FROM establishments WHERE id = ?', [establishmentId]);
    res.status(201).json({ success: true, data: updated[0], message: 'Logo de l’établissement mis à jour.' });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}

export async function removeEstablishmentLogo(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = req.user.establishmentId;
    const [rows] = await getPool().query<RowDataPacket[]>('SELECT logo_url FROM establishments WHERE id = ?', [establishmentId]);
    if (!rows.length) { res.status(404).json({ success: false, error: 'Établissement non trouvé.' }); return; }

    const previousLogo = typeof rows[0].logo_url === 'string' ? rows[0].logo_url : null;
    await getPool().query<ResultSetHeader>('UPDATE establishments SET logo_url = NULL WHERE id = ?', [establishmentId]);

    if (previousLogo?.startsWith('/uploads/')) {
      const filename = path.basename(previousLogo);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const [updated] = await getPool().query<RowDataPacket[]>('SELECT id, name, slug, logo_url, address, phone, email, max_students, is_active FROM establishments WHERE id = ?', [establishmentId]);
    res.json({ success: true, data: updated[0], message: 'Logo supprimé.' });
  } catch (error) { res.status(500).json({ success: false, error: (error as Error).message }); }
}
