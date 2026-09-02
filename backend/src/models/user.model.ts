import { BaseRepository } from '../repositories/base.repository.js';
import { User, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

export class UserModel extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  async findByMatricule(matricule: string): Promise<User | null> {
    return this.findByField('matricule', matricule);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findByField('email', email);
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.findByField('phone', phone);
  }

  async findByFcmToken(token: string): Promise<User | null> {
    return this.findByField('fcm_token', token);
  }

  async updateFcmToken(userId: number, token: string | null): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      'UPDATE users SET fcm_token = ? WHERE id = ?',
      [token, userId]
    );
  }

  async updateOtp(userId: number, code: string, expiresAt: Date): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      `UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_verified = 0
       WHERE id = ?`,
      [code, expiresAt, userId]
    );
  }

  async verifyOtp(userId: number): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      `UPDATE users SET otp_code = NULL, otp_expires_at = NULL, otp_verified = 1
       WHERE id = ?`,
      [userId]
    );
  }

  async updateLastLogin(userId: number): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [userId]
    );
  }

  async findByRole(
    roleName: string,
    establishmentId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const countParams: any[] = [roleName, establishmentId];
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = ? AND u.establishment_id = ? AND u.is_active = 1`,
      countParams
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
              u.avatar_url, u.is_active, u.last_login_at, u.created_at,
              r.name as role_name, r.label as role_label
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = ? AND u.establishment_id = ? AND u.is_active = 1
       ORDER BY u.last_name, u.first_name
       LIMIT ? OFFSET ?`,
      [roleName, establishmentId, limit, offset]
    );

    return { data: rows as User[], total, page, limit, totalPages };
  }

  async getWithProfile(userId: number): Promise<any> {
    const pool = this.getPool();

    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.*, r.name as role_name, r.label as role_label,
              e.name as establishment_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN establishments e ON e.id = u.establishment_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) return null;

    const user = users[0];
    const profileData: Record<string, any> = { ...user };

    if (user.role_name === 'STUDENT') {
      const [students] = await pool.query<RowDataPacket[]>(
        `SELECT s.id as student_id, s.matricule_scolaire, s.status as student_status,
                s.admission_date, c.id as class_id, c.name as class_name, c.level, c.section
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE s.user_id = ?`,
        [userId]
      );
      if (students.length > 0) {
        Object.assign(profileData, students[0]);
      }
    } else if (user.role_name === 'PARENT') {
      const [parents] = await pool.query<RowDataPacket[]>(
        `SELECT p.id as parent_id, p.profession, p.is_primary_contact
         FROM parents p
         WHERE p.user_id = ?`,
        [userId]
      );
      if (parents.length > 0) {
        Object.assign(profileData, parents[0]);
      }

      const [children] = await pool.query<RowDataPacket[]>(
        `SELECT s.id as student_id, u_s.first_name, u_s.last_name, s.matricule_scolaire,
                s.status as student_status, c.name as class_name, c.level, c.section,
                ps.priority, ps.is_emergency_contact
         FROM parents p
         JOIN parent_student ps ON ps.parent_id = p.id
         JOIN students s ON s.id = ps.student_id
         JOIN users u_s ON u_s.id = s.user_id
         LEFT JOIN classes c ON c.id = s.class_id
         WHERE p.user_id = ?`,
        [userId]
      );
      profileData.children = children;
    } else if (user.role_name === 'STAFF') {
      const [staff] = await pool.query<RowDataPacket[]>(
        `SELECT st.id as staff_id, st.role_title, st.department
         FROM staff st
         WHERE st.user_id = ?`,
        [userId]
      );
      if (staff.length > 0) {
        Object.assign(profileData, staff[0]);
      }
    }

    return profileData;
  }

  async search(
    query: string,
    establishmentId: number,
    filters?: any,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      'u.establishment_id = ?',
      'u.is_active = 1',
      '(u.first_name LIKE ? OR u.last_name LIKE ? OR u.matricule LIKE ? OR u.email LIKE ?)'
    ];
    const params: any[] = [establishmentId, `${query}%`, `${query}%`, `${query}%`, `${query}%`];

    if (filters?.role_name) {
      conditions.push('r.name = ?');
      params.push(filters.role_name);
    }
    if (filters?.class_id) {
      conditions.push(`u.id IN (SELECT s.user_id FROM students s WHERE s.class_id = ? AND s.status = 'active')`);
      params.push(filters.class_id);
    }
    if (filters?.level) {
      conditions.push(`u.id IN (
        SELECT s.user_id FROM students s
        JOIN classes c ON c.id = s.class_id
        WHERE c.level = ? AND s.status = 'active'
      )`);
      params.push(filters.level);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');
    const countParams = [...params];

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${whereClause}`,
      countParams
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
              u.avatar_url, u.is_active, u.last_login_at, u.created_at,
              r.name as role_name, r.label as role_label
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${whereClause}
       ORDER BY u.last_name, u.first_name
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { data: rows as User[], total, page, limit, totalPages };
  }
}
