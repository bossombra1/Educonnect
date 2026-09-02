import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const DEFAULT_SCHOOL_YEAR = '2025-2026';

export async function getClasses(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const pool = getPool();

    const schoolYear = (req.query.school_year as string) || DEFAULT_SCHOOL_YEAR;

    const [classes] = await pool.query<RowDataPacket[]>(
      `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
       FROM classes c
       WHERE c.establishment_id = ? AND c.school_year = ?
       ORDER BY c.name ASC`,
      [user.establishmentId, schoolYear]
    );

    res.status(200).json({ success: true, data: classes });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createClass(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const { name, level, section, capacity, school_year } = req.body;
    const sy = school_year || DEFAULT_SCHOOL_YEAR;

    if (!name) {
      res.status(400).json({ success: false, error: 'Le nom de la classe est requis.' });
      return;
    }

    const pool = getPool();

    // Unique check includes school_year (matches unique key uk_classes_establishment_name_year)
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM classes WHERE name = ? AND establishment_id = ? AND school_year = ?',
      [name, user.establishmentId, sy]
    );

    if (existing.length > 0) {
      res.status(409).json({ success: false, error: 'Une classe avec ce nom existe déjà pour cette année scolaire.' });
      return;
    }

    // school_year is NOT NULL — must include it
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO classes (establishment_id, name, level, section, capacity, school_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.establishmentId, name, level || null, section || null, capacity || null, sy]
    );

    const [newClass] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM classes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: newClass[0], message: 'Classe créée avec succès.' });
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes('existe déjà') ? 409 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

export async function updateClass(req: Request, res: Response): Promise<void> {
  try {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) {
      res.status(400).json({ success: false, error: 'ID de classe invalide.' });
      return;
    }

    const { name, level, section, capacity, is_active } = req.body;
    const pool = getPool();

    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM classes WHERE id = ?', [classId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, error: 'Classe non trouvée.' });
      return;
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (level !== undefined) { fields.push('level = ?'); params.push(level); }
    if (section !== undefined) { fields.push('section = ?'); params.push(section); }
    if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour.' });
      return;
    }

    params.push(classId);
    await pool.query(`UPDATE classes SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query<RowDataPacket[]>('SELECT * FROM classes WHERE id = ?', [classId]);
    res.status(200).json({ success: true, data: updated[0], message: 'Classe mise à jour.' });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteClass(req: Request, res: Response): Promise<void> {
  try {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) {
      res.status(400).json({ success: false, error: 'ID de classe invalide.' });
      return;
    }

    const pool = getPool();

    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ? AND status = \'active\'',
      [classId]
    );

    if (Number(students[0].count) > 0) {
      res.status(409).json({ success: false, error: 'Impossible de supprimer une classe contenant des élèves actifs.' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM classes WHERE id = ?', [classId]);

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: 'Classe non trouvée.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Classe supprimée.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
