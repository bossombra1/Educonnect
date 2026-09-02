import { Request, Response } from 'express';
import { getPool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const classId = String(req.query.classId || '').trim();
    const isActive = req.query.isActive;

    const conditions: string[] = ['u.establishment_id = ?'];
    const params: any[] = [user.establishmentId];
    if (search) {
      conditions.push('(u.email LIKE ? OR u.matricule LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (role) { conditions.push('r.name = ?'); params.push(role.toUpperCase()); }
    if (classId) {
      conditions.push('EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id AND s.class_id = ? AND s.establishment_id = u.establishment_id)');
      params.push(Number(classId));
    }
    if (isActive !== undefined && isActive !== '') {
      conditions.push('u.is_active = ?');
      params.push(String(isActive) === 'true' || String(isActive) === '1' ? 1 : 0);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(DISTINCT u.id) AS total FROM users u JOIN roles r ON r.id = u.role_id ${whereClause}`, params);
    const total = Number(countRows[0]?.total || 0);
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, u.avatar_url, u.created_at,
              r.name AS role_name, r.label AS role_label,
              s.id AS student_id, s.matricule_scolaire, s.status AS student_status,
              c.id AS class_id, c.name AS class_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN students s ON s.user_id = u.id AND s.establishment_id = u.establishment_id
       LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = u.establishment_id
       ${whereClause}
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.status(200).json({ success: true, data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id); const user = req.user as any;
    if (isNaN(userId)) { res.status(400).json({ success: false, error: 'ID utilisateur invalide.' }); return; }
    const pool = getPool();
    const [users] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, u.avatar_url, u.establishment_id, u.created_at, u.updated_at, r.name AS role_name, r.label AS role_label FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.establishment_id = ?`, [userId, user.establishmentId]);
    if (!users.length) { res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' }); return; }
    res.status(200).json({ success: true, data: users[0] });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body || {};
    const email = body.email;
    const password = body.password;
    const roleId = body.role_id ?? body.roleId;
    const roleValue = body.role_name ?? body.role;
    const firstName = body.first_name ?? body.firstName;
    const lastName = body.last_name ?? body.lastName;
    const phone = body.phone;
    const isActive = body.is_active ?? body.isActive;
    const user = req.user as any;

    if (!firstName || !lastName) { res.status(400).json({ success: false, error: 'Les champs first_name et last_name sont requis.' }); return; }
    if (!roleId && !roleValue) { res.status(400).json({ success: false, error: 'Le rôle (role_id ou role) est requis.' }); return; }

    const pool = getPool();
    let roles: RowDataPacket[];
    if (roleId) {
      const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name FROM roles WHERE id = ?', [roleId]); roles = rows;
    } else {
      const normalizedRole = String(roleValue).toUpperCase();
      const [rows] = await pool.query<RowDataPacket[]>('SELECT id, name FROM roles WHERE UPPER(name) = ?', [normalizedRole]); roles = rows;
    }
    if (!roles.length) { res.status(400).json({ success: false, error: 'Rôle non trouvé.' }); return; }
    const resolvedRoleId = Number(roles[0].id); const roleName = String(roles[0].name).toUpperCase();

    let matricule = body.matricule;
    if (!matricule && roleName === 'PARENT') matricule = `PAR-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    if (!matricule) { res.status(400).json({ success: false, error: 'Le matricule est requis.' }); return; }

    const hashedPassword = await bcrypt.hash(password || matricule, 10);
    if (email) {
      const [existingEmail] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail.length) { res.status(409).json({ success: false, error: 'Un utilisateur avec cet email existe déjà.' }); return; }
    }
    const [existingMat] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE matricule = ?', [matricule]);
    if (existingMat.length) { res.status(409).json({ success: false, error: 'Un utilisateur avec ce matricule existe déjà.' }); return; }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const classId = body.class_id ?? body.classId;
      if (roleName === 'STUDENT') {
        if (!classId) throw new Error('Le champ class_id est requis pour un élève.');
        const [classes] = await conn.query<RowDataPacket[]>('SELECT id FROM classes WHERE id = ? AND establishment_id = ?', [classId, user.establishmentId]);
        if (!classes.length) throw new Error('La classe sélectionnée n’appartient pas à votre établissement.');
      }

      const [userResult] = await conn.query<ResultSetHeader>(`INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, email, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [user.establishmentId, resolvedRoleId, matricule, firstName, lastName, email || null, phone || null, hashedPassword, isActive === false ? 0 : 1]);
      const newUserId = userResult.insertId;

      if (roleName === 'STUDENT') {
        await conn.query<ResultSetHeader>(`INSERT INTO students (user_id, class_id, establishment_id, matricule_scolaire, status) VALUES (?, ?, ?, ?, 'active')`, [newUserId, classId, user.establishmentId, matricule]);
      } else if (roleName === 'PARENT') {
        await conn.query<ResultSetHeader>(`INSERT INTO parents (user_id, establishment_id, profession, is_primary_contact) VALUES (?, ?, ?, ?)`, [newUserId, user.establishmentId, body.profession || null, body.is_primary_contact ? 1 : 0]);
      } else if (roleName === 'STAFF') {
        const roleTitle = body.role_title ?? body.roleTitle;
        if (!roleTitle) throw new Error('Le champ role_title est requis pour le personnel.');
        await conn.query<ResultSetHeader>(`INSERT INTO staff (user_id, establishment_id, role_title, department) VALUES (?, ?, ?, ?)`, [newUserId, user.establishmentId, roleTitle, body.department || null]);
      }
      await conn.commit();
      const [newUser] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, r.name AS role_name, r.label AS role_label FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.establishment_id = ?`, [newUserId, user.establishmentId]);
      res.status(201).json({ success: true, data: newUser[0], message: 'Utilisateur créé avec succès.' });
    } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
  } catch (err) {
    const message = (err as Error).message; const status = message.includes('existe déjà') ? 409 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id); const user = req.user as any;
    if (isNaN(userId)) { res.status(400).json({ success: false, error: 'ID utilisateur invalide.' }); return; }
    const body = req.body || {};
    const firstName = body.first_name ?? body.firstName; const lastName = body.last_name ?? body.lastName;
    const email = body.email; const matricule = body.matricule; const phone = body.phone; const isActive = body.is_active ?? body.isActive;
    const pool = getPool();
    const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? AND establishment_id = ?', [userId, user.establishmentId]);
    if (!users.length) { res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' }); return; }
    const fields: string[] = []; const params: any[] = [];
    if (firstName !== undefined) { fields.push('first_name = ?'); params.push(firstName); }
    if (lastName !== undefined) { fields.push('last_name = ?'); params.push(lastName); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (matricule !== undefined) { fields.push('matricule = ?'); params.push(matricule); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (isActive !== undefined) { fields.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    if (!fields.length) { res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour.' }); return; }
    params.push(userId, user.establishmentId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ? AND establishment_id = ?`, params);
    const [updated] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, r.name AS role_name, r.label AS role_label FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.establishment_id = ?`, [userId, user.establishmentId]);
    res.status(200).json({ success: true, data: updated[0], message: 'Utilisateur mis à jour.' });
  } catch (err) { res.status(400).json({ success: false, error: (err as Error).message }); }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id); const user = req.user as any;
    if (isNaN(userId)) { res.status(400).json({ success: false, error: 'ID utilisateur invalide.' }); return; }
    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>('UPDATE users SET is_active = 0 WHERE id = ? AND establishment_id = ?', [userId, user.establishmentId]);
    if (!result.affectedRows) { res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' }); return; }
    res.status(200).json({ success: true, message: 'Utilisateur désactivé.' });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1); const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)); const offset = (page - 1) * limit;
    const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u JOIN students s ON u.id = s.user_id WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STUDENT')`, [user.establishmentId]);
    const total = Number(countRows[0]?.total || 0);
    const [students] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, s.id AS student_id, s.matricule_scolaire, s.status AS student_status, c.id AS class_id, c.name AS class_name FROM users u JOIN students s ON u.id = s.user_id LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = u.establishment_id WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STUDENT') ORDER BY u.last_name, u.first_name LIMIT ? OFFSET ?`, [user.establishmentId, limit, offset]);
    res.status(200).json({ success: true, data: students, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getParents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1); const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)); const offset = (page - 1) * limit;
    const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u JOIN parents p ON u.id = p.user_id WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'PARENT')`, [user.establishmentId]);
    const total = Number(countRows[0]?.total || 0);
    const [parents] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.phone, u.email, u.is_active, p.id AS parent_id, p.profession, p.is_primary_contact FROM users u JOIN parents p ON u.id = p.user_id WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'PARENT') ORDER BY u.last_name, u.first_name LIMIT ? OFFSET ?`, [user.establishmentId, limit, offset]);
    res.status(200).json({ success: true, data: parents, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getStaff(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1); const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)); const offset = (page - 1) * limit;
    const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u JOIN staff st ON u.id = st.user_id WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STAFF')`, [user.establishmentId]);
    const total = Number(countRows[0]?.total || 0);
    const [staffList] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active, st.id AS staff_id, st.role_title, st.department FROM users u JOIN staff st ON u.id = st.user_id WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STAFF') ORDER BY u.last_name, u.first_name LIMIT ? OFFSET ?`, [user.establishmentId, limit, offset]);
    res.status(200).json({ success: true, data: staffList, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any; const pool = getPool(); const query = String(req.query.q || '').trim(); const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    if (!query) { res.status(400).json({ success: false, error: 'Le paramètre de recherche (q) est requis.' }); return; }
    const term = `%${query}%`;
    const [users] = await pool.query<RowDataPacket[]>(`SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.establishment_id = ? AND (u.email LIKE ? OR u.matricule LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?) ORDER BY u.last_name, u.first_name LIMIT ?`, [user.establishmentId, term, term, term, term, limit]);
    res.status(200).json({ success: true, data: users });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}
