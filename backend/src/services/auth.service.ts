import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { getPool } from '../config/database.js';
import { env } from '../config/env.js';
import { RowDataPacket } from 'mysql2/promise';
import { JwtPayload } from '../types/index.js';

const MOBILE_ROLES = ['PARENT', 'STUDENT', 'STAFF'] as const;
type MobileRole = (typeof MOBILE_ROLES)[number];

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('225') && digits.length === 13) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return `225${digits}`;
  if (digits.length === 9) return `2250${digits}`;
  return digits;
}

function phoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const local = normalized.startsWith('225') ? normalized.slice(3) : normalized;
  return Array.from(new Set([normalized, `+${normalized}`, `+225${local}`, local, `0${local.replace(/^0/, '')}`]));
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: any }> {
  const pool = getPool();

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.establishment_id, u.role_id, r.name as role_name,
            u.first_name, u.last_name, u.matricule, u.email, u.avatar_url, u.is_active,
            u.password_hash,
            e.name as establishment_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN establishments e ON e.id = u.establishment_id
     WHERE u.email = ? AND u.is_active = 1`,
    [email]
  );

  if (users.length === 0) throw new Error('Email ou mot de passe incorrect.');
  const user = users[0];

  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role_name)) {
    throw new Error('Accès réservé aux administrateurs. Utilisez la connexion mobile avec identifiant et mot de passe.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) throw new Error('Email ou mot de passe incorrect.');

  return issueTokenAndAudit(user, 'LOGIN');
}

export async function loginMobile(
  role: MobileRole,
  identifier: string,
  password: string
): Promise<{ token: string; user: any }> {
  const pool = getPool();
  const cleanIdentifier = identifier.trim();
  if (!cleanIdentifier) throw new Error('Identifiant requis.');
  if (!password) throw new Error('Mot de passe requis.');

  const phones = phoneVariants(cleanIdentifier);
  const placeholders = phones.map(() => '?').join(', ');

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.establishment_id, u.role_id, r.name as role_name,
            u.first_name, u.last_name, u.matricule, u.email, u.phone, u.avatar_url,
            u.is_active, u.password_hash, u.otp_verified,
            e.name as establishment_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN establishments e ON e.id = u.establishment_id
     WHERE u.is_active = 1
       AND r.name = ?
       AND (u.matricule = ? OR u.phone IN (${placeholders}))
     LIMIT 2`,
    [role, cleanIdentifier, ...phones]
  );

  if (users.length !== 1) throw new Error('Identifiant ou mot de passe incorrect.');
  const user = users[0];

  if (!user.otp_verified) {
    throw new Error('Première connexion requise : validez d’abord votre compte avec le code reçu par SMS.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) throw new Error('Identifiant ou mot de passe incorrect.');

  return issueTokenAndAudit(user, 'LOGIN_PASSWORD');
}

async function issueTokenAndAudit(user: RowDataPacket, action: string): Promise<{ token: string; user: any }> {
  const pool = getPool();
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role_name,
    establishmentId: user.establishment_id,
  };

  const token = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
  });

  await pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, created_at) VALUES (?, ?, ?, NOW())',
    [user.id, action, 'USER']
  );

  const userData = {
    id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name,
    matricule: user.matricule, phone: user.phone, avatar_url: user.avatar_url, role: user.role_name,
    establishment_id: user.establishment_id, establishment_name: user.establishment_name,
  };

  if (user.role_name === 'PARENT') {
    const [children] = await pool.query<RowDataPacket[]>(
      `SELECT s.id as student_id, u_s.first_name, u_s.last_name, s.matricule_scolaire,
              s.status as student_status, c.name as class_name, c.level, c.section,
              ps.priority, ps.is_emergency_contact
       FROM parents p JOIN parent_student ps ON ps.parent_id = p.id
       JOIN students s ON s.id = ps.student_id JOIN users u_s ON u_s.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id WHERE p.user_id = ?`,
      [user.id]
    );
    userData.children = children;
  }

  return { token, user: userData };
}

export async function getProfile(userId: number): Promise<any> {
  const pool = getPool();

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.matricule, u.phone, u.first_name, u.last_name,
            u.avatar_url, u.role_id, u.establishment_id, u.is_active,
            r.name as role_name, r.label as role_label,
            e.name as establishment_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN establishments e ON e.id = u.establishment_id
     WHERE u.id = ?`,
    [userId]
  );

  if (users.length === 0) throw new Error('Utilisateur non trouvé.');
  const user = users[0];
  let profileData: Record<string, any> = { ...user };

  if (user.role_name === 'STUDENT') {
    const [students] = await pool.query<RowDataPacket[]>(
      `SELECT s.id as student_id, s.matricule_scolaire, s.status as student_status,
              c.id as class_id, c.name as class_name, c.level, c.section
       FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.user_id = ?`,
      [userId]
    );
    if (students.length > 0) profileData = { ...profileData, ...students[0] };
  } else if (user.role_name === 'PARENT') {
    const [parents] = await pool.query<RowDataPacket[]>(
      'SELECT id as parent_id, profession, is_primary_contact FROM parents WHERE user_id = ?',
      [userId]
    );
    if (parents.length > 0) profileData = { ...profileData, ...parents[0] };

    const [children] = await pool.query<RowDataPacket[]>(
      `SELECT s.id as student_id, u_s.first_name, u_s.last_name, s.matricule_scolaire,
              s.status as student_status, c.name as class_name, c.level, c.section,
              ps.priority, ps.is_emergency_contact
       FROM parents p JOIN parent_student ps ON ps.parent_id = p.id
       JOIN students s ON s.id = ps.student_id JOIN users u_s ON u_s.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id WHERE p.user_id = ?`,
      [userId]
    );
    profileData.children = children;
  } else if (user.role_name === 'STAFF') {
    const [staff] = await pool.query<RowDataPacket[]>(
      'SELECT id as staff_id, role_title, department FROM staff WHERE user_id = ?',
      [userId]
    );
    if (staff.length > 0) profileData = { ...profileData, ...staff[0] };
  }

  return profileData;
}

export async function logout(userId: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, created_at) VALUES (?, ?, ?, NOW())',
    [userId, 'LOGOUT', 'USER']
  );
}
