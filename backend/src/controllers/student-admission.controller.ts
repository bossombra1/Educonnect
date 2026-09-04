import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

function establishmentId(req: Request): number | null {
  const id = Number((req.user as any)?.establishmentId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAdmissionDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('La date d’admission doit être au format AAAA-MM-JJ.');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('La date d’admission est invalide.');
  return date;
}

export async function updateStudentAdmissionDate(req: Request, res: Response): Promise<void> {
  try {
    const establishment = establishmentId(req);
    const studentUserId = Number(req.params.studentId);
    if (!establishment) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) { res.status(400).json({ success: false, error: 'ID élève invalide.' }); return; }

    const admissionDate = parseAdmissionDate(req.body?.admission_date ?? req.body?.admissionDate);
    if (admissionDate === undefined) { res.status(400).json({ success: false, error: 'La date d’admission est requise.' }); return; }

    const pool = getPool();
    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT s.id FROM students s JOIN users u ON u.id = s.user_id AND u.establishment_id = s.establishment_id WHERE s.user_id = ? AND s.establishment_id = ? LIMIT 1',
      [studentUserId, establishment]
    );
    if (!students.length) { res.status(404).json({ success: false, error: 'Élève non trouvé dans votre établissement.' }); return; }

    await pool.query<ResultSetHeader>(
      'UPDATE students SET admission_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND establishment_id = ?',
      [admissionDate, students[0].id, establishment]
    );

    res.status(200).json({ success: true, data: { studentId: studentUserId, admission_date: admissionDate }, message: 'Date d’admission mise à jour.' });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message || 'Impossible de mettre à jour la date d’admission.' });
  }
}
