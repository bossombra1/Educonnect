import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
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
