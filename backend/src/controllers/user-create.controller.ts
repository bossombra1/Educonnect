import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database.js';

async function generateUniqueMatricule(prefix: string): Promise<string> {
  const pool = getPool();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE matricule = ? LIMIT 1', [candidate]);
    if (!rows.length) return candidate;
  }
  throw new Error('Impossible de générer un matricule unique. Veuillez réessayer.');
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

function parseAdmissionDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const date = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('La date d’admission doit être au format AAAA-MM-JJ.');
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('La date d’admission est invalide.');
  }
  return date;
}

export async function createManagedUser(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const actor = req.user as any;
    const roleName = text(body.role_name ?? body.role).toUpperCase();
    const firstName = text(body.first_name ?? body.firstName);
    const lastName = text(body.last_name ?? body.lastName);
    const email = text(body.email) || null;
    const phone = text(body.phone) || null;
    const password = text(body.password);
    const classId = body.class_id ?? body.classId;
    const matriculeScolaire = text(body.matricule_scolaire ?? body.matriculeScolaire);
    const admissionDate = roleName === 'STUDENT'
      ? parseAdmissionDate(body.admission_date ?? body.admissionDate)
      : null;

    if (!firstName || !lastName) { res.status(400).json({ success: false, error: 'Le prénom et le nom sont requis.' }); return; }
    if (!['ADMIN', 'PARENT', 'STUDENT', 'STAFF'].includes(roleName)) { res.status(400).json({ success: false, error: 'Rôle de création non supporté.' }); return; }
    if (!password) { res.status(400).json({ success: false, error: 'Le mot de passe est requis.' }); return; }

    const pool = getPool();
    const [roles] = await pool.query<RowDataPacket[]>('SELECT id, name FROM roles WHERE UPPER(name) = ? LIMIT 1', [roleName]);
    if (!roles.length) { res.status(400).json({ success: false, error: `Le rôle ${roleName} n'existe pas dans la base.` }); return; }

    let matricule = text(body.matricule);
    if (!matricule) {
      matricule = roleName === 'STUDENT' ? (matriculeScolaire || await generateUniqueMatricule('ELV')) : await generateUniqueMatricule(roleName === 'STAFF' ? 'STF' : roleName === 'PARENT' ? 'PAR' : 'ADM');
    }

    if (email) {
      const [existingEmail] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (existingEmail.length) { res.status(409).json({ success: false, error: 'Un utilisateur avec cet email existe déjà.' }); return; }
    }
    const [existingMatricule] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE matricule = ? LIMIT 1', [matricule]);
    if (existingMatricule.length) { res.status(409).json({ success: false, error: 'Un utilisateur avec ce matricule existe déjà.' }); return; }

    if (roleName === 'STUDENT') {
      if (!classId) { res.status(400).json({ success: false, error: 'La classe est obligatoire pour créer un élève.' }); return; }
      const [classes] = await pool.query<RowDataPacket[]>('SELECT id FROM classes WHERE id = ? AND establishment_id = ? LIMIT 1', [classId, actor.establishmentId]);
      if (!classes.length) { res.status(400).json({ success: false, error: 'La classe sélectionnée n’appartient pas à votre établissement.' }); return; }
    }
    const roleTitle = text(body.role_title ?? body.roleTitle);
    if (roleName === 'STAFF' && !roleTitle) { res.status(400).json({ success: false, error: 'La fonction du personnel est obligatoire.' }); return; }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const passwordHash = await bcrypt.hash(password, 10);
      const [userResult] = await conn.query<ResultSetHeader>(`INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, email, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`, [actor.establishmentId, Number(roles[0].id), matricule, firstName, lastName, email, phone, passwordHash]);
      const userId = userResult.insertId;

      if (roleName === 'STUDENT') {
        await conn.query<ResultSetHeader>(`INSERT INTO students (user_id, class_id, establishment_id, matricule_scolaire, admission_date, status) VALUES (?, ?, ?, ?, ?, 'active')`, [userId, classId, actor.establishmentId, matriculeScolaire || matricule, admissionDate]);
      } else if (roleName === 'PARENT') {
        await conn.query<ResultSetHeader>(`INSERT INTO parents (user_id, establishment_id, profession, is_primary_contact) VALUES (?, ?, ?, ?)`, [userId, actor.establishmentId, text(body.profession) || null, body.is_primary_contact === false ? 0 : 1]);
      } else if (roleName === 'STAFF') {
        await conn.query<ResultSetHeader>(`INSERT INTO staff (user_id, establishment_id, role_title, department) VALUES (?, ?, ?, ?)`, [userId, actor.establishmentId, roleTitle, text(body.department) || null]);
      } else {
        await conn.query<ResultSetHeader>(`INSERT INTO administrators (user_id, role_type, can_manage_users, can_send_broadcast, can_view_audit) VALUES (?, 'ADMIN', ?, ?, ?)`, [userId, body.can_manage_users === false ? 0 : 1, body.can_send_broadcast === false ? 0 : 1, body.can_view_audit === false ? 0 : 1]);
      }

      await conn.commit();
      const [created] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, r.name AS role_name, r.label AS role_label, s.matricule_scolaire, s.admission_date, s.class_id, c.name AS class_name, st.role_title, st.department, a.role_type, a.can_manage_users, a.can_send_broadcast, a.can_view_audit FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN students s ON s.user_id = u.id AND s.establishment_id = u.establishment_id LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = u.establishment_id LEFT JOIN staff st ON st.user_id = u.id AND st.establishment_id = u.establishment_id LEFT JOIN administrators a ON a.user_id = u.id LEFT JOIN parents p ON p.user_id = u.id AND p.establishment_id = u.establishment_id WHERE u.id = ? AND u.establishment_id = ?`, [userId, actor.establishmentId]);
      res.status(201).json({ success: true, data: created[0], message: 'Utilisateur créé avec succès.' });
    } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  } catch (err) {
    const message = (err as Error).message || 'Impossible de créer l’utilisateur.';
    res.status(message.includes('existe déjà') ? 409 : 400).json({ success: false, error: message });
  }
}
