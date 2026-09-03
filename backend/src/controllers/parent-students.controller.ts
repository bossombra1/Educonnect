import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

function currentEstablishmentId(req: Request): number | null {
  const id = Number((req.user as any)?.establishmentId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getStudentsByParent(req: Request, res: Response): Promise<void> {
  try {
    const parentUserId = Number(req.params.parentId); const establishmentId = currentEstablishmentId(req);
    if (!establishmentId) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    if (!Number.isInteger(parentUserId) || parentUserId <= 0) { res.status(400).json({ success: false, error: 'ID parent invalide.' }); return; }
    const pool = getPool();
    const [parentRows] = await pool.query<RowDataPacket[]>('SELECT p.id, p.user_id, p.establishment_id FROM parents p JOIN users u ON u.id = p.user_id AND u.establishment_id = p.establishment_id WHERE p.user_id = ? AND p.establishment_id = ? LIMIT 1', [parentUserId, establishmentId]);
    if (!parentRows.length) { res.status(404).json({ success: false, error: 'Parent non trouvé dans votre établissement.' }); return; }
    const [students] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, u.avatar_url,
              s.id AS student_id, s.matricule_scolaire, s.status AS student_status,
              c.id AS class_id, c.name AS class_name, c.level AS class_level, c.section AS class_section, c.school_year,
              ps.priority, ps.is_emergency_contact
       FROM parent_student ps JOIN parents p ON p.id = ps.parent_id AND p.establishment_id = ? JOIN students s ON s.id = ps.student_id AND s.establishment_id = p.establishment_id JOIN users u ON u.id = s.user_id AND u.establishment_id = p.establishment_id LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = p.establishment_id WHERE ps.parent_id = ? ORDER BY u.last_name, u.first_name`, [establishmentId, parentRows[0].id]);
    res.status(200).json({ success: true, data: students });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getParentsByStudent(req: Request, res: Response): Promise<void> {
  try {
    const studentUserId = Number(req.params.studentId); const establishmentId = currentEstablishmentId(req);
    if (!establishmentId) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) { res.status(400).json({ success: false, error: 'ID élève invalide.' }); return; }
    const pool = getPool();
    const [studentRows] = await pool.query<RowDataPacket[]>('SELECT id FROM students WHERE user_id = ? AND establishment_id = ? LIMIT 1', [studentUserId, establishmentId]);
    if (!studentRows.length) { res.status(404).json({ success: false, error: 'Élève non trouvé dans votre établissement.' }); return; }
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, p.id AS parent_id, p.profession, p.is_primary_contact, ps.priority, ps.is_emergency_contact FROM students s JOIN parent_student ps ON ps.student_id = s.id JOIN parents p ON p.id = ps.parent_id AND p.establishment_id = s.establishment_id JOIN users u ON u.id = p.user_id AND u.establishment_id = s.establishment_id WHERE s.user_id = ? AND s.establishment_id = ? ORDER BY u.last_name, u.first_name`, [studentUserId, establishmentId]);
    res.status(200).json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function linkParentStudent(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = currentEstablishmentId(req); if (!establishmentId) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    const parentUserId = Number(req.body?.parentId ?? req.body?.parent_id); const studentUserId = Number(req.body?.studentId ?? req.body?.student_id); const priority = String(req.body?.priority || 'parent1'); const isEmergencyContact = Boolean(req.body?.isEmergencyContact ?? req.body?.is_emergency_contact ?? false);
    if (!Number.isInteger(parentUserId) || parentUserId <= 0 || !Number.isInteger(studentUserId) || studentUserId <= 0) { res.status(400).json({ success: false, error: 'Parent ou élève invalide.' }); return; }
    if (!['parent1', 'parent2'].includes(priority)) { res.status(400).json({ success: false, error: 'Priorité parent invalide.' }); return; }
    const pool = getPool();
    const [parents] = await pool.query<RowDataPacket[]>('SELECT p.id FROM parents p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND p.establishment_id = ? AND u.establishment_id = ? LIMIT 1', [parentUserId, establishmentId, establishmentId]);
    const [students] = await pool.query<RowDataPacket[]>('SELECT s.id FROM students s JOIN users u ON u.id = s.user_id WHERE s.user_id = ? AND s.establishment_id = ? AND u.establishment_id = ? LIMIT 1', [studentUserId, establishmentId, establishmentId]);
    if (!parents.length) { res.status(404).json({ success: false, error: 'Parent non trouvé dans votre établissement.' }); return; }
    if (!students.length) { res.status(404).json({ success: false, error: 'Élève non trouvé dans votre établissement.' }); return; }
    const parentId = Number(parents[0].id); const studentId = Number(students[0].id);
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM parent_student WHERE parent_id = ? AND student_id = ? LIMIT 1', [parentId, studentId]);
    if (existing.length) { await pool.query('UPDATE parent_student SET priority = ?, is_emergency_contact = ? WHERE id = ?', [priority, isEmergencyContact ? 1 : 0, existing[0].id]); res.status(200).json({ success: true, message: 'Association parent-élève mise à jour.', data: { id: Number(existing[0].id), parentId: parentUserId, studentId: studentUserId, priority, isEmergencyContact } }); return; }
    const [result] = await pool.query<ResultSetHeader>('INSERT INTO parent_student (parent_id, student_id, priority, is_emergency_contact) VALUES (?, ?, ?, ?)', [parentId, studentId, priority, isEmergencyContact ? 1 : 0]);
    res.status(201).json({ success: true, message: 'Parent et élève associés.', data: { id: result.insertId, parentId: parentUserId, studentId: studentUserId, priority, isEmergencyContact } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function unlinkParentStudent(req: Request, res: Response): Promise<void> {
  try {
    const establishmentId = currentEstablishmentId(req); if (!establishmentId) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    const parentUserId = Number(req.params.parentId); const studentUserId = Number(req.params.studentId);
    if (!Number.isInteger(parentUserId) || !Number.isInteger(studentUserId) || parentUserId <= 0 || studentUserId <= 0) { res.status(400).json({ success: false, error: 'Parent ou élève invalide.' }); return; }
    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(`DELETE ps FROM parent_student ps JOIN parents p ON p.id = ps.parent_id AND p.establishment_id = ? JOIN students s ON s.id = ps.student_id AND s.establishment_id = p.establishment_id WHERE p.user_id = ? AND s.user_id = ?`, [establishmentId, parentUserId, studentUserId]);
    if (!result.affectedRows) { res.status(404).json({ success: false, error: 'Association parent-élève introuvable.' }); return; }
    res.status(200).json({ success: true, message: 'Association supprimée.' });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getStudentProfile(req: Request, res: Response): Promise<void> {
  try {
    const studentUserId = Number(req.params.studentId); const establishmentId = currentEstablishmentId(req);
    if (!establishmentId) { res.status(403).json({ success: false, error: 'Établissement non identifié.' }); return; }
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) { res.status(400).json({ success: false, error: 'ID élève invalide.' }); return; }
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT
      u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.avatar_url, u.is_active, u.created_at, u.updated_at,
      s.id AS student_id, s.matricule_scolaire, s.admission_date, s.status AS student_status,
      c.id AS class_id, c.name AS class_name, c.level AS class_level, c.section AS class_section, c.school_year,
      e.id AS establishment_id, e.name AS establishment_name, e.slug AS establishment_slug, e.logo_url AS establishment_logo_url, e.address AS establishment_address, e.phone AS establishment_phone, e.email AS establishment_email
      FROM students s JOIN users u ON u.id = s.user_id AND u.establishment_id = s.establishment_id
      JOIN classes c ON c.id = s.class_id AND c.establishment_id = s.establishment_id
      JOIN establishments e ON e.id = s.establishment_id
      WHERE s.user_id = ? AND s.establishment_id = ? LIMIT 1`, [studentUserId, establishmentId]);
    if (!rows.length) { res.status(404).json({ success: false, error: 'Élève non trouvé dans votre établissement.' }); return; }
    const student = rows[0];
    const [parents] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, p.profession, p.is_primary_contact, ps.priority, ps.is_emergency_contact FROM parent_student ps JOIN parents p ON p.id = ps.parent_id AND p.establishment_id = ? JOIN users u ON u.id = p.user_id AND u.establishment_id = p.establishment_id WHERE ps.student_id = ? ORDER BY ps.priority, u.last_name, u.first_name`, [establishmentId, student.student_id]);
    res.status(200).json({ success: true, data: { ...student, parents } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}
