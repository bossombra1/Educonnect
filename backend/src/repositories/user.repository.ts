import { BaseRepository } from './base.repository.js';
import { User, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  /**
   * Find users by role name with additional details (role label, class name, etc.)
   */
  async findByRoleWithDetails(
    roleName: string,
    establishmentId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name = ? AND u.establishment_id = ? AND u.is_active = 1`,
      [roleName, establishmentId]
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.establishment_id, u.role_id, u.matricule, u.first_name, u.last_name,
              u.phone, u.email, u.avatar_url, u.is_active, u.last_login_at, u.created_at, u.updated_at,
              r.name AS role_name, r.label AS role_label,
              c.id AS class_id, c.name AS class_name, c.level AS class_level
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE r.name = ? AND u.establishment_id = ? AND u.is_active = 1
       ORDER BY u.last_name ASC, u.first_name ASC
       LIMIT ? OFFSET ?`,
      [roleName, establishmentId, limit, offset]
    );

    return {
      data: rows as User[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Count users grouped by role for a given establishment.
   */
  async countByRole(
    establishmentId: number
  ): Promise<{ role_name: string; count: number }[]> {
    const pool = this.getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.name AS role_name, r.label AS role_label, COUNT(u.id) AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.establishment_id = ? AND u.is_active = 1
       GROUP BY r.name, r.label
       ORDER BY count DESC`,
      [establishmentId]
    );

    return rows.map((row) => ({
      role_name: row.role_name as string,
      count: row.count as number,
    }));
  }

  /**
   * Count users grouped by class for a given establishment.
   * Only includes users who are linked to a class via the students table.
   */
  async countByClass(
    establishmentId: number
  ): Promise<{ class_id: number; class_name: string; count: number }[]> {
    const pool = this.getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id AS class_id, c.name AS class_name, COUNT(s.id) AS count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id AND s.establishment_id = c.establishment_id
       WHERE c.establishment_id = ? AND c.is_active = 1
       GROUP BY c.id, c.name
       ORDER BY c.name ASC`,
      [establishmentId]
    );

    return rows.map((row) => ({
      class_id: row.class_id as number,
      class_name: row.class_name as string,
      count: row.count as number,
    }));
  }
}
