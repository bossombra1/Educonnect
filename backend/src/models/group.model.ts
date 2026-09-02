import { BaseRepository } from '../repositories/base.repository.js';
import { Group, User, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class GroupModel extends BaseRepository<Group> {
  constructor() {
    super('groups');
  }

  async findByEstablishment(
    establishmentId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    return this.findAll(
      { establishment_id: establishmentId, is_active: 1 },
      pagination
    );
  }

  async findWithMemberCount(
    establishmentId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 50));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM groups
       WHERE establishment_id = ? AND is_active = 1`,
      [establishmentId]
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT g.*, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
       FROM groups g
       WHERE g.establishment_id = ? AND g.is_active = 1
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [establishmentId, limit, offset]
    );

    return { data: rows as Group[], total, page, limit, totalPages };
  }

  async getMembers(groupId: number): Promise<User[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
              u.avatar_url, u.is_active, u.establishment_id, u.role_id,
              r.name as role_name, r.label as role_label
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE gm.group_id = ?
       ORDER BY u.last_name, u.first_name`,
      [groupId]
    );
    return rows as User[];
  }

  async addMembers(groupId: number, userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;

    const pool = this.getPool();
    const values = userIds.map((userId) => [groupId, userId]);

    await pool.query(
      `INSERT IGNORE INTO group_members (group_id, user_id) VALUES ?`,
      [values]
    );
  }

  async removeMembers(groupId: number, userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;

    const pool = this.getPool();
    const placeholders = userIds.map(() => '?').join(',');

    await pool.query(
      `DELETE FROM group_members WHERE group_id = ? AND user_id IN (${placeholders})`,
      [groupId, ...userIds]
    );
  }

  async resolveGroupMembers(groupId: number): Promise<User[]> {
    const pool = this.getPool();

    const [group] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM groups WHERE id = ?',
      [groupId]
    );

    if (group.length === 0) return [];

    const g = group[0];

    // For custom groups, just return existing members
    if (g.group_type === 'custom') {
      return this.getMembers(groupId);
    }

    // For dynamic groups, resolve based on filters and group_type
    let query = '';
    const params: any[] = [g.establishment_id];

    let filterData: any = {};
    if (g.filters) {
      try {
        filterData = typeof g.filters === 'string' ? JSON.parse(g.filters) : g.filters;
      } catch {
        filterData = {};
      }
    }

    switch (g.group_type) {
      case 'all_school': {
        query = `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                r.name as role_name, r.label as role_label
                FROM users u
                JOIN roles r ON r.id = u.role_id
                WHERE u.establishment_id = ? AND u.is_active = 1
                AND r.name IN ('PARENT', 'STUDENT', 'STAFF')`;
        break;
      }
      case 'role': {
        const roleName = filterData.role_name || 'PARENT';
        query = `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                r.name as role_name, r.label as role_label
                FROM users u
                JOIN roles r ON r.id = u.role_id
                WHERE u.establishment_id = ? AND u.is_active = 1 AND r.name = ?`;
        params.push(roleName);
        break;
      }
      case 'level': {
        const level = filterData.level;
        if (level) {
          query = `SELECT DISTINCT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                  u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                  r.name as role_name, r.label as role_label
                  FROM students s
                  JOIN users u ON u.id = s.user_id
                  JOIN roles r ON r.id = u.role_id
                  JOIN classes c ON c.id = s.class_id
                  WHERE c.establishment_id = ? AND c.level = ? AND s.status = 'active'`;
          params.push(level);
        } else {
          query = `SELECT DISTINCT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                  u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                  r.name as role_name, r.label as role_label
                  FROM students s
                  JOIN users u ON u.id = s.user_id
                  JOIN roles r ON r.id = u.role_id
                  JOIN classes c ON c.id = s.class_id
                  WHERE c.establishment_id = ? AND s.status = 'active'`;
        }
        break;
      }
      case 'class': {
        if (filterData.class_id) {
          query = `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                  u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                  r.name as role_name, r.label as role_label
                  FROM students s
                  JOIN users u ON u.id = s.user_id
                  JOIN roles r ON r.id = u.role_id
                  JOIN classes c ON c.id = s.class_id
                  WHERE c.id = ? AND c.establishment_id = ? AND s.status = 'active'`;
          params.unshift(filterData.class_id);
        } else if (filterData.class_name) {
          query = `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                  u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                  r.name as role_name, r.label as role_label
                  FROM students s
                  JOIN users u ON u.id = s.user_id
                  JOIN roles r ON r.id = u.role_id
                  JOIN classes c ON c.id = s.class_id
                  WHERE c.name = ? AND c.establishment_id = ? AND s.status = 'active'`;
          params.unshift(filterData.class_name);
        } else {
          query = `SELECT u.id, u.matricule, u.first_name, u.last_name, u.phone, u.email,
                  u.avatar_url, u.is_active, u.establishment_id, u.role_id,
                  r.name as role_name, r.label as role_label
                  FROM students s
                  JOIN users u ON u.id = s.user_id
                  JOIN roles r ON r.id = u.role_id
                  JOIN classes c ON c.id = s.class_id
                  WHERE c.establishment_id = ? AND s.status = 'active'`;
        }
        break;
      }
      default:
        return [];
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return rows as User[];
  }
}
