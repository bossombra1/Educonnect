import crypto from 'crypto';
import { getPool } from '../config/database.js';
import { env } from '../config/env.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2/promise';
import { JwtPayload } from '../types/index.js';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SECONDS = 60;

type OtpIdentity = {
  phone: string;
  matricule?: string;
  childMatricule?: string;
};

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

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

async function findOtpUser(identity: OtpIdentity) {
  const pool = getPool();
  const phones = phoneVariants(identity.phone);
  const placeholders = phones.map(() => '?').join(', ');

  if (identity.matricule) {
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.matricule, u.phone, u.is_active, u.role_id, u.establishment_id,
              u.first_name, u.last_name, r.name AS role_name,
              u.otp_code, u.otp_expires_at, u.otp_attempts, u.otp_requested_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.matricule = ? AND u.phone IN (${placeholders}) AND u.is_active = 1`,
      [identity.matricule.trim(), ...phones]
    );
    return users;
  }

  let sql = `SELECT DISTINCT u.id, u.matricule, u.phone, u.is_active, u.role_id, u.establishment_id,
                    u.first_name, u.last_name, r.name AS role_name,
                    u.otp_code, u.otp_expires_at, u.otp_attempts, u.otp_requested_at
             FROM users u
             JOIN roles r ON r.id = u.role_id
             JOIN parents p ON p.user_id = u.id
             WHERE u.phone IN (${placeholders}) AND u.is_active = 1 AND r.name = 'PARENT'`;
  const params: unknown[] = [...phones];

  if (identity.childMatricule) {
    sql += ` AND EXISTS (
      SELECT 1
      FROM parent_student ps
      JOIN students s ON s.id = ps.student_id
      WHERE ps.parent_id = p.id AND s.matricule_scolaire = ?
    )`;
    params.push(identity.childMatricule.trim());
  }

  const [users] = await pool.query<RowDataPacket[]>(sql, params);
  return users;
}

export async function requestOtp(identity: OtpIdentity): Promise<{ message: string; requiresChildMatricule?: boolean }> {
  const pool = getPool();
  const users = await findOtpUser(identity);

  if (!identity.matricule && users.length > 1 && !identity.childMatricule) {
    return {
      message: 'Plusieurs comptes parents utilisent ce numéro. Indiquez le matricule scolaire de votre enfant.',
      requiresChildMatricule: true,
    };
  }

  if (users.length !== 1) {
    throw new Error('Téléphone, identifiant ou enfant associé non trouvé, ou compte inactif.');
  }

  const user = users[0];
  if (!['PARENT', 'STUDENT', 'STAFF'].includes(user.role_name)) {
    throw new Error('Seuls les parents, élèves et personnel peuvent utiliser la connexion OTP.');
  }

  const now = Date.now();
  if (user.otp_requested_at) {
    const requestedAt = new Date(user.otp_requested_at).getTime();
    if (now - requestedAt < OTP_RESEND_SECONDS * 1000) {
      throw new Error('Veuillez patienter avant de demander un nouveau code.');
    }
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await pool.query(
    `UPDATE users
     SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL ${OTP_TTL_MINUTES} MINUTE),
         otp_attempts = 0, otp_requested_at = NOW(), otp_verified = FALSE
     WHERE id = ?`,
    [otpHash, user.id]
  );

  // TODO: brancher un fournisseur SMS réel. Ne jamais journaliser le code OTP.
  return { message: 'Code OTP envoyé avec succès.' };
}

export async function verifyOtp(identity: OtpIdentity, code: string): Promise<{ token: string; user: any }> {
  const pool = getPool();
  const users = await findOtpUser(identity);

  if (users.length !== 1) {
    throw new Error('Compte OTP introuvable. Recommencez la connexion.');
  }

  const user = users[0];
  if (!user.is_active) throw new Error('Compte inactif.');
  if (!user.otp_code || !user.otp_expires_at) {
    throw new Error("Aucun code OTP en attente. Veuillez d'abord demander un code.");
  }

  if (user.otp_attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error('Nombre maximal de tentatives atteint. Demandez un nouveau code.');
  }

  if (new Date() > new Date(user.otp_expires_at)) {
    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, otp_requested_at = NULL, otp_verified = FALSE WHERE id = ?',
      [user.id]
    );
    throw new Error('Le code OTP a expiré. Veuillez demander un nouveau code.');
  }

  const isValid = await bcrypt.compare(code, user.otp_code);
  if (!isValid) {
    await pool.query('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?', [user.id]);
    throw new Error('Code OTP invalide.');
  }

  await pool.query(
    `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0,
            otp_requested_at = NULL, otp_verified = TRUE, last_login_at = NOW()
     WHERE id = ?`,
    [user.id]
  );

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role_name,
    establishmentId: user.establishment_id,
  };
  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

  const userData: Record<string, any> = {
    id: user.id,
    matricule: user.matricule,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    role: user.role_name,
    establishment_id: user.establishment_id,
  };

  if (user.role_name === 'PARENT') {
    const [children] = await pool.query<RowDataPacket[]>(
      `SELECT s.id AS student_id, u_s.first_name, u_s.last_name, s.matricule_scolaire,
              s.status AS student_status, c.name AS class_name, c.level, c.section,
              ps.priority, ps.is_emergency_contact
       FROM parents p
       JOIN parent_student ps ON ps.parent_id = p.id
       JOIN students s ON s.id = ps.student_id
       JOIN users u_s ON u_s.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE p.user_id = ?
       ORDER BY u_s.last_name, u_s.first_name`,
      [user.id]
    );
    userData.children = children;
  }

  await pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, created_at) VALUES (?, ?, ?, NOW())',
    [user.id, 'LOGIN_OTP', 'USER']
  );

  return { token, user: userData };
}
