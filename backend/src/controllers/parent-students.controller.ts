import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';

export async function getStudentsByParent(req: Request, res: Response): Promise<void> {
  try {
    const parentUserId = Number(req.params.parentId);
    const user = req.user as any;
    if (!Number.isInteger(parentUserId) || parentUserId <= 0) {
      res.status(400).json({ success: false, error: 'ID parent invalide.' });
      return;
    }

    const pool = getPool();
    const [parentRows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.user_id, p.establishment_id
       FROM parents p
       JOIN users u ON u.id = p.user_id AND u.establishment_id = p.establishment_id
       WHERE p.user_id = ? AND p.establishment_id = ?
       LIMIT 1`,
      [parentUserId, user.establishmentId]
    );
    if (!parentRows.length) {
      res.status(404).json({ success: false, error: 'Parent non trouvé dans votre établissement.' });
      return;
    }

    const [students] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active,
              s.id AS student_id, s.matricule_scolaire, s.status AS student_status,
              c.id AS class_id, c.name AS class_name,
              ps.priority, ps.is_emergency_contact
       FROM parent_student ps
       JOIN parents p ON p.id = ps.parent_id AND p.establishment_id = ?
       JOIN students s ON s.id = ps.student_id AND s.establishment_id = p.establishment_id
       JOIN users u ON u.id = s.user_id AND u.establishment_id = p.establishment_id
       LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = p.establishment_id
       WHERE ps.parent_id = ?
       ORDER BY u.last_name, u.first_name`,
      [user.establishmentId, parentRows[0].id]
    );

    res.status(200).json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
