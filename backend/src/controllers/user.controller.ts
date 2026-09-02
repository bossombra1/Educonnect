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
    const search = req.query.search as string | undefined;

    const conditions: string[] = ['u.establishment_id = ?'];
    const params: any[] = [user.establishmentId];

    if (search) {
      conditions.push('(u.email LIKE ? OR u.matricule LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total as number;

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone,
              u.is_active, u.avatar_url, u.created_at,
              r.name as role_name, r.label as role_label
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, error: 'ID utilisateur invalide.' });
      return;
    }

    const pool = getPool();
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone,
              u.is_active, u.avatar_url, u.establishment_id, u.created_at, u.updated_at,
              r.name as role_name, r.label as role_label
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      return;
    }

    res.status(200).json({ success: true, data: users[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, role_id, matricule, phone, first_name, last_name, is_active } = req.body;

    if (!first_name || !last_name) {
      res.status(400).json({ success: false, error: 'Les champs first_name et last_name sont requis.' });
      return;
    }

    if (!role_id) {
      res.status(400).json({ success: false, error: 'Le rôle (role_id) est requis.' });
      return;
    }

    if (!matricule) {
      res.status(400).json({ success: false, error: 'Le matricule est requis.' });
      return;
    }

    const pool = getPool();
    const user = req.user as any;

    // Validate role exists
    const [roles] = await pool.query<RowDataPacket[]>(
      'SELECT id, name FROM roles WHERE id = ?',
      [role_id]
    );
    if (roles.length === 0) {
      res.status(400).json({ success: false, error: 'Rôle non trouvé.' });
      return;
    }

    const roleName = roles[0].name;
    const hashedPassword = await bcrypt.hash(password || matricule, 10);

    // Check unique email
    if (email) {
      const [existingEmail] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      if (existingEmail.length > 0) {
        res.status(409).json({ success: false, error: 'Un utilisateur avec cet email existe déjà.' });
        return;
      }
    }

    // Check unique matricule
    const [existingMat] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE matricule = ?',
      [matricule]
    );
    if (existingMat.length > 0) {
      res.status(409).json({ success: false, error: 'Un utilisateur avec ce matricule existe déjà.' });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Create user — use password_hash, not password
      const [userResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, email, phone, password_hash, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.establishmentId, role_id, matricule, first_name, last_name, email || null, phone || null, hashedPassword, is_active !== false ? 1 : 0]
      );
      const newUserId = userResult.insertId;

      // Create role-specific record if needed
      if (roleName === 'STUDENT') {
        const { class_id } = req.body;
        if (!class_id) {
          throw new Error('Le champ class_id est requis pour un élève.');
        }
        await conn.query<ResultSetHeader>(
          `INSERT INTO students (user_id, class_id, establishment_id, matricule_scolaire, status)
           VALUES (?, ?, ?, ?, 'active')`,
          [newUserId, class_id, user.establishmentId, matricule]
        );
      }

      if (roleName === 'PARENT') {
        const { profession, is_primary_contact } = req.body;
        await conn.query<ResultSetHeader>(
          `INSERT INTO parents (user_id, establishment_id, profession, is_primary_contact)
           VALUES (?, ?, ?, ?)`,
          [newUserId, user.establishmentId, profession || null, is_primary_contact ? 1 : 0]
        );
      }

      if (roleName === 'STAFF') {
        const { role_title, department } = req.body;
        if (!role_title) {
          throw new Error("Le champ role_title est requis pour le personnel.");
        }
        await conn.query<ResultSetHeader>(
          `INSERT INTO staff (user_id, establishment_id, role_title, department)
           VALUES (?, ?, ?, ?)`,
          [newUserId, user.establishmentId, role_title, department || null]
        );
      }

      await conn.commit();

      const [newUser] = await pool.query<RowDataPacket[]>(
        `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active,
                r.name as role_name, r.label as role_label
         FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
        [newUserId]
      );

      res.status(201).json({ success: true, data: newUser[0], message: 'Utilisateur créé avec succès.' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes('existe déjà') ? 409 : 400;
    res.status(status).json({ success: false, error: message });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, error: 'ID utilisateur invalide.' });
      return;
    }

    const { email, matricule, phone, first_name, last_name, is_active } = req.body;
    const pool = getPool();

    const [users] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      return;
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (first_name !== undefined) { fields.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { fields.push('last_name = ?'); params.push(last_name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (matricule !== undefined) { fields.push('matricule = ?'); params.push(matricule); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (fields.length > 0) {
      params.push(userId);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active,
              r.name as role_name, r.label as role_label
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`,
      [userId]
    );

    res.status(200).json({ success: true, data: updated[0], message: 'Utilisateur mis à jour.' });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, error: 'ID utilisateur invalide.' });
      return;
    }

    const pool = getPool();
    // Soft delete
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET is_active = 0 WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Utilisateur désactivé.' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN students s ON u.id = s.user_id
       WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STUDENT')`,
      [user.establishmentId]
    );
    const total = countRows[0].total as number;

    const [students] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active,
              s.id as student_id, s.matricule_scolaire, s.status as student_status,
              c.id as class_id, c.name as class_name
       FROM users u
       JOIN students s ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STUDENT')
       ORDER BY u.last_name, u.first_name
       LIMIT ? OFFSET ?`,
      [user.establishmentId, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: students,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getParents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN parents p ON u.id = p.user_id
       WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'PARENT')`,
      [user.establishmentId]
    );
    const total = countRows[0].total as number;

    const [parents] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.phone, u.email, u.is_active,
              p.id as parent_id, p.profession, p.is_primary_contact
       FROM users u
       JOIN parents p ON u.id = p.user_id
       WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'PARENT')
       ORDER BY u.last_name, u.first_name
       LIMIT ? OFFSET ?`,
      [user.establishmentId, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: parents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function getStaff(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const pool = getPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN staff st ON u.id = st.user_id
       WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STAFF')`,
      [user.establishmentId]
    );
    const total = countRows[0].total as number;

    const [staffList] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone, u.is_active,
              st.id as staff_id, st.role_title, st.department
       FROM users u
       JOIN staff st ON u.id = st.user_id
       WHERE u.establishment_id = ? AND u.role_id = (SELECT id FROM roles WHERE name = 'STAFF')
       ORDER BY u.last_name, u.first_name
       LIMIT ? OFFSET ?`,
      [user.establishmentId, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: staffList,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const pool = getPool();
    const query = (req.query.q as string || '').trim();
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    if (!query) {
      res.status(400).json({ success: false, error: 'Le paramètre de recherche (q) est requis.' });
      return;
    }

    const term = `%${query}%`;
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.matricule, u.email, u.phone,
              r.name as role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.establishment_id = ?
         AND (u.email LIKE ? OR u.matricule LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)
       ORDER BY u.last_name, u.first_name
       LIMIT ?`,
      [user.establishmentId, term, term, term, term, limit]
    );

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}
