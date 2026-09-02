import { getPool } from '../config/database.js';
import { PaginationOptions, PaginationResult, CreateGroupInput } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export async function createGroup(
  data: CreateGroupInput,
  establishmentId: number
): Promise<any> {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const filtersJson = data.filters ? JSON.stringify(data.filters) : null;

    if (data.user_ids && data.user_ids.length > 0) {
      const placeholders = data.user_ids.map(() => '?').join(',');
      const [validMembers] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE establishment_id = ? AND id IN (${placeholders})`,
        [establishmentId, ...data.user_ids]
      );
      if (validMembers.length !== data.user_ids.length) {
        throw new Error('Un ou plusieurs membres appartiennent à un autre établissement ou n’existent pas.');
      }
    }

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO groups (establishment_id, name, description, group_type, filters)
       VALUES (?, ?, ?, ?, ?)`,
      [establishmentId, data.name, data.description || null, data.group_type, filtersJson]
    );

    const groupId = result.insertId;

    if (data.user_ids && data.user_ids.length > 0) {
      const memberValues = data.user_ids.map((userId) => [groupId, userId]);
      await conn.query('INSERT INTO group_members (group_id, user_id) VALUES ?', [memberValues]);
    } else {
      const resolvedMembers = await resolveGroupMembersQuery(conn, data.group_type, filtersJson, establishmentId);
      if (resolvedMembers.length > 0) {
        const memberValues = resolvedMembers.map((userId) => [groupId, userId]);
        await conn.query('INSERT INTO group_members (group_id, user_id) VALUES ?', [memberValues]);
      }
    }

    const [memberCount] = await conn.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?',
      [groupId]
    );

    await conn.commit();

    return {
      id: groupId,
      name: data.name,
      group_type: data.group_type,
      member_count: Number(memberCount[0].count),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function resolveGroupMembersQuery(
  conn: any,
  groupType: string,
  filters: string | null,
  establishmentId: number
): Promise<number[]> {
  let query = '';
  const params: any[] = [establishmentId];

  let filterData: any = {};
  if (filters) {
    try { filterData = JSON.parse(filters); } catch { filterData = {}; }
  }

  switch (groupType) {
    case 'all_school':
      query = `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
               WHERE u.establishment_id = ? AND u.is_active = 1
               AND r.name IN ('PARENT', 'STUDENT', 'STAFF')`;
      break;
    case 'role': {
      const roleName = filterData.role_name || 'PARENT';
      query = `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
               WHERE u.establishment_id = ? AND u.is_active = 1 AND r.name = ?`;
      params.push(roleName);
      break;
    }
    case 'level': {
      const level = filterData.level;
      if (level) {
        query = `SELECT DISTINCT s.user_id as id FROM students s JOIN classes c ON c.id = s.class_id
                 WHERE c.establishment_id = ? AND c.level = ? AND s.establishment_id = c.establishment_id AND s.status = 'active'`;
        params.push(level);
      } else {
        query = `SELECT DISTINCT s.user_id as id FROM students s JOIN classes c ON c.id = s.class_id
                 WHERE c.establishment_id = ? AND s.establishment_id = c.establishment_id AND s.status = 'active'`;
      }
      break;
    }
    case 'class': {
      if (filterData.class_id) {
        query = `SELECT s.user_id as id FROM students s JOIN classes c ON c.id = s.class_id
                 WHERE c.id = ? AND c.establishment_id = ? AND s.establishment_id = c.establishment_id AND s.status = 'active'`;
        params.unshift(filterData.class_id);
      } else if (filterData.class_name) {
        query = `SELECT s.user_id as id FROM students s JOIN classes c ON c.id = s.class_id
                 WHERE c.name = ? AND c.establishment_id = ? AND s.establishment_id = c.establishment_id AND s.status = 'active'`;
        params.unshift(filterData.class_name);
      } else {
        query = `SELECT s.user_id as id FROM students s JOIN classes c ON c.id = s.class_id
                 WHERE c.establishment_id = ? AND s.establishment_id = c.establishment_id AND s.status = 'active'`;
      }
      break;
    }
    case 'custom':
      return [];
    default:
      return [];
  }

  const [rows] = await conn.query<RowDataPacket[]>(query, params);
  return rows.map((r) => r.id as number);
}

export async function resolveGroupMembers(groupId: number): Promise<number[]> {
  const pool = getPool();
  const [group] = await pool.query<RowDataPacket[]>('SELECT * FROM groups WHERE id = ?', [groupId]);
  if (group.length === 0) return [];
  const g = group[0];

  if (g.group_type === 'custom') {
    const [members] = await pool.query<RowDataPacket[]>(
      `SELECT gm.user_id FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ? AND u.establishment_id = ?`,
      [groupId, g.establishment_id]
    );
    return members.map((m) => m.user_id as number);
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM group_members WHERE group_id = ?', [groupId]);
    const memberIds = await resolveGroupMembersQuery(conn, g.group_type, g.filters, g.establishment_id);
    if (memberIds.length > 0) {
      const values = memberIds.map((userId) => [groupId, userId]);
      await conn.query('INSERT INTO group_members (group_id, user_id) VALUES ?', [values]);
    }
    return memberIds;
  } finally {
    conn.release();
  }
}

export async function getGroups(establishmentId: number, options?: PaginationOptions): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 50));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM groups WHERE establishment_id = ?', [establishmentId]);
  const total = countRows[0].total as number;
  const [groups] = await pool.query<RowDataPacket[]>(
    `SELECT g.*, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
     FROM groups g WHERE g.establishment_id = ? ORDER BY g.created_at DESC LIMIT ? OFFSET ?`,
    [establishmentId, limit, offset]
  );
  return { data: groups, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getGroupById(groupId: number): Promise<any> {
  const pool = getPool();
  const [groups] = await pool.query<RowDataPacket[]>(
    `SELECT g.*, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count FROM groups g WHERE g.id = ?`,
    [groupId]
  );
  if (groups.length === 0) return null;
  return groups[0];
}

export async function updateGroup(groupId: number, data: Partial<CreateGroupInput>): Promise<any> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [groupRows] = await conn.query<RowDataPacket[]>('SELECT establishment_id FROM groups WHERE id = ?', [groupId]);
    if (groupRows.length === 0) throw new Error('Groupe non trouvé.');
    const establishmentId = Number(groupRows[0].establishment_id);

    if (data.user_ids !== undefined && data.user_ids.length > 0) {
      const placeholders = data.user_ids.map(() => '?').join(',');
      const [validMembers] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE establishment_id = ? AND id IN (${placeholders})`,
        [establishmentId, ...data.user_ids]
      );
      if (validMembers.length !== data.user_ids.length) {
        throw new Error('Un ou plusieurs membres appartiennent à un autre établissement ou n’existent pas.');
      }
    }

    const fields: string[] = [];
    const params: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.group_type !== undefined) { fields.push('group_type = ?'); params.push(data.group_type); }
    if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
    if (data.filters !== undefined) { fields.push('filters = ?'); params.push(data.filters ? JSON.stringify(data.filters) : null); }
    if (fields.length > 0) {
      params.push(groupId);
      await conn.query(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    if (data.user_ids !== undefined) {
      await conn.query('DELETE FROM group_members WHERE group_id = ?', [groupId]);
      if (data.user_ids.length > 0) {
        const values = data.user_ids.map((userId) => [groupId, userId]);
        await conn.query('INSERT INTO group_members (group_id, user_id) VALUES ?', [values]);
      }
    }
    await conn.commit();
    return getGroupById(groupId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteGroup(groupId: number): Promise<boolean> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM group_members WHERE group_id = ?', [groupId]);
    const [result] = await conn.query<ResultSetHeader>('DELETE FROM groups WHERE id = ?', [groupId]);
    await conn.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getGroupMembers(groupId: number, options?: PaginationOptions): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 50));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM group_members WHERE group_id = ?', [groupId]);
  const total = countRows[0].total as number;
  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.first_name, u.last_name, u.matricule, r.name as role_name
     FROM group_members gm JOIN users u ON u.id = gm.user_id JOIN roles r ON r.id = u.role_id
     WHERE gm.group_id = ? ORDER BY u.first_name, u.last_name LIMIT ? OFFSET ?`,
    [groupId, limit, offset]
  );
  return { data: members, total, page, limit, totalPages: Math.ceil(total / limit) };
}
