import crypto from 'crypto';
import { getPool } from '../config/database.js';
import { env } from '../config/env.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { RowDataPacket } from 'mysql2/promise';
import { JwtPayload } from '../types/index.js';

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function requestOtp(matricule: string, phone: string): Promise<{ message: string }> {
  const pool = getPool();

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.matricule, u.phone, u.is_active, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.matricule = ? AND u.phone = ? AND u.is_active = 1`,
    [matricule, phone]
  );

  if (users.length === 0) {
    throw new Error('Matricule ou téléphone non trouvé, ou compte inactif.');
  }

  const user = users[0];

  if (!user.role_name || !['PARENT', 'STUDENT', 'STAFF'].includes(user.role_name)) {
    throw new Error('Seuls les parents, élèves et personnel peuvent utiliser la connexion OTP.');
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await pool.query(
    `UPDATE users SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE), otp_verified = FALSE
     WHERE id = ?`,
    [otpHash, user.id]
  );

  // TODO: intégrer ici le fournisseur SMS réel. Le code OTP ne doit jamais être écrit dans les logs.
  return { message: 'Code OTP envoyé avec succès.' };
}

export async function verifyOtp(
  matricule: string,
  code: string
): Promise<{ token: string; user: any }> {
  const pool = getPool();

  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.matricule, u.otp_code, u.otp_expires_at, u.is_active,
            u.role_id, u.establishment_id, u.first_name, u.last_name,
            r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.matricule = ?`,
    [matricule]
  );

  if (users.length === 0) {
    throw new Error('Matricule non trouvé.');
  }

  const user = users[0];

  if (!user.is_active) {
    throw new Error('Compte inactif.');
  }

  if (!user.otp_code || !user.otp_expires_at) {
    throw new Error("Aucun code OTP en attente. Veuillez d'abord demander un code.");
  }

  const now = new Date();
  const expiresAt = new Date(user.otp_expires_at);
  if (now > expiresAt) {
    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_verified = FALSE WHERE id = ?',
      [user.id]
    );
    throw new Error('Le code OTP a expiré. Veuillez demander un nouveau code.');
  }

  const isValid = await bcrypt.compare(code, user.otp_code);
  if (!isValid) {
    throw new Error('Code OTP invalide.');
  }

  await pool.query(
    `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_verified = TRUE,
            last_login_at = NOW() WHERE id = ?`,
    [user.id]
  );

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role_name,
    establishmentId: user.establishment_id,
  };

  const token = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

  const userData = {
    id: user.id,
    matricule: user.matricule,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role_name,
    establishment_id: user.establishment_id,
  };

  await pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, created_at) VALUES (?, ?, ?, NOW())',
    [user.id, 'LOGIN_OTP', 'USER']
  );

  return { token, user: userData };
}
