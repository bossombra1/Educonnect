import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const DEFAULT_SCHOOL_YEAR = '2025-2026';
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function getClasses(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const pool = getPool();
    const schoolYear = (req.query.school_year as string) || DEFAULT_SCHOOL_YEAR;
    const [classes] = await pool.query<RowDataPacket[]>(`SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active' AND s.establishment_id = c.establishment_id) as student_count FROM classes c WHERE c.establishment_id = ? AND c.school_year = ? ORDER BY c.name ASC`, [user.establishmentId, schoolYear]);
    res.status(200).json({ success: true, data: classes });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getClassById(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const classId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(classId)) {
      res.status(400).json({ success: false, error: 'ID de classe invalide.' });
      return;
    }

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*,
              e.name AS establishment_name,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.establishment_id = c.establishment_id) AS student_count,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.establishment_id = c.establishment_id AND s.status = 'active') AS active_student_count
       FROM classes c
       LEFT JOIN establishments e ON e.id = c.establishment_id
       WHERE c.id = ? AND c.establishment_id = ?
       LIMIT 1`,
      [classId, user.establishmentId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Classe non trouvée.' });
      return;
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getClassStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const classId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(classId)) {
      res.status(400).json({ success: false, error: 'ID de classe invalide.' });
      return;
    }

    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(String(req.query.limit || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    );
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const pool = getPool();
    const [classRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM classes WHERE id = ? AND establishment_id = ? LIMIT 1',
      [classId, user.establishmentId]
    );

    if (classRows.length === 0) {
      res.status(404).json({ success: false, error: 'Classe non trouvée.' });
      return;
    }

    const where: string[] = [
      's.class_id = ?',
      's.establishment_id = ?',
      'u.establishment_id = ?',
    ];
    const params: any[] = [classId, user.establishmentId, user.establishmentId];

    if (status) {
      where.push('s.status = ?');
      params.push(status);
    }

    if (search) {
      where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR s.matricule_scolaire LIKE ? OR u.matricule LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const whereSql = where.join(' AND ');
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM students s
       INNER JOIN users u ON u.id = s.user_id
       WHERE ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit);

    const [students] = await pool.query<RowDataPacket[]>(
      `SELECT s.id,
              s.user_id,
              s.matricule_scolaire,
              s.status,
              s.admission_date,
              u.first_name,
              u.last_name,
              u.matricule,
              u.phone
       FROM students s
       INNER JOIN users u ON u.id = s.user_id
       WHERE ${whereSql}
       ORDER BY u.last_name ASC, u.first_name ASC, s.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: students,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createClass(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const { name, level, section, capacity, school_year } = req.body; const sy = school_year || DEFAULT_SCHOOL_YEAR;
    if (!name) { res.status(400).json({ success: false, error: 'Le nom de la classe est requis.' }); return; }
    const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM classes WHERE name = ? AND establishment_id = ? AND school_year = ?', [name, user.establishmentId, sy]);
    if (existing.length > 0) { res.status(409).json({ success: false, error: 'Une classe avec ce nom existe déjà pour cette année scolaire.' }); return; }
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO classes (establishment_id, name, level, section, capacity, school_year) VALUES (?, ?, ?, ?, ?, ?)', [user.establishmentId, name, level || null, section || null, capacity || null, sy]);
    const [newClass] = await pool.query<RowDataPacket[]>('SELECT * FROM classes WHERE id = ? AND establishment_id = ?', [result.insertId, user.establishmentId]);
    res.status(201).json({ success: true, data: newClass[0], message: 'Classe créée avec succès.' });
  } catch (err) { const message = (err as Error).message; res.status(message.includes('existe déjà') ? 409 : 400).json({ success: false, error: message }); }
}

export async function updateClass(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const classId = parseInt(req.params.id);
    if (isNaN(classId)) { res.status(400).json({ success: false, error: 'ID de classe invalide.' }); return; }
    const { name, level, section, capacity, is_active } = req.body; const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM classes WHERE id = ? AND establishment_id = ?', [classId, user.establishmentId]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: 'Classe non trouvée.' }); return; }
    const fields: string[] = []; const params: any[] = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (level !== undefined) { fields.push('level = ?'); params.push(level); }
    if (section !== undefined) { fields.push('section = ?'); params.push(section); }
    if (capacity !== undefined) { fields.push('capacity = ?'); params.push(capacity); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (fields.length === 0) { res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour.' }); return; }
    params.push(classId, user.establishmentId); await pool.query(`UPDATE classes SET ${fields.join(', ')} WHERE id = ? AND establishment_id = ?`, params);
    const [updated] = await pool.query<RowDataPacket[]>('SELECT * FROM classes WHERE id = ? AND establishment_id = ?', [classId, user.establishmentId]);
    res.status(200).json({ success: true, data: updated[0], message: 'Classe mise à jour.' });
  } catch (err) { res.status(400).json({ success: false, error: (err as Error).message }); }
}

export async function deleteClass(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const classId = parseInt(req.params.id);
    if (isNaN(classId)) { res.status(400).json({ success: false, error: 'ID de classe invalide.' }); return; }
    const pool = getPool();
    const [classRows] = await pool.query<RowDataPacket[]>('SELECT id FROM classes WHERE id = ? AND establishment_id = ?', [classId, user.establishmentId]);
    if (classRows.length === 0) { res.status(404).json({ success: false, error: 'Classe non trouvée.' }); return; }
    const [students] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as count FROM students WHERE class_id = ? AND establishment_id = ? AND status = 'active'`, [classId, user.establishmentId]);
    if (Number(students[0].count) > 0) { res.status(409).json({ success: false, error: 'Impossible de supprimer une classe contenant des élèves actifs.' }); return; }
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM classes WHERE id = ? AND establishment_id = ?', [classId, user.establishmentId]);
    if (result.affectedRows === 0) { res.status(404).json({ success: false, error: 'Classe non trouvée.' }); return; }
    res.status(200).json({ success: true, message: 'Classe supprimée.' });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}
