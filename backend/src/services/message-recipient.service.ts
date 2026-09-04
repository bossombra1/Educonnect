import { getPool } from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';

function normalizeIds(value: unknown): number[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.flatMap((item) => String(item).split(',')).map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

function normalizeRoles(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.flatMap((item) => String(item).split(',')).map((role) => role.trim().toUpperCase()).filter(Boolean);
}

export async function resolveRecipientIds(establishmentId: number, groupIds: unknown, classIds: unknown, roles: unknown, recipientIds: unknown, senderId: number): Promise<number[]> {
  const pool = getPool();
  const ids = new Set<number>(normalizeIds(recipientIds));
  const groups = normalizeIds(groupIds);
  const classes = normalizeIds(classIds);
  const roleNames = normalizeRoles(roles);

  if (groups.length) {
    const placeholders = groups.map(() => '?').join(',');
    const [validGroups] = await pool.query<RowDataPacket[]>(`SELECT id FROM \`groups\` WHERE id IN (${placeholders}) AND establishment_id = ?`, [...groups, establishmentId]);
    if (validGroups.length !== groups.length) throw new Error('Un ou plusieurs groupes sont invalides pour cet établissement.');
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT gm.user_id FROM group_members gm JOIN \`groups\` g ON g.id = gm.group_id JOIN users u ON u.id = gm.user_id WHERE gm.group_id IN (${placeholders}) AND g.establishment_id = ? AND u.establishment_id = ?`, [...groups, establishmentId, establishmentId]);
    rows.forEach((row) => ids.add(Number(row.user_id)));
  }

  if (classes.length) {
    const placeholders = classes.map(() => '?').join(',');
    const [validClasses] = await pool.query<RowDataPacket[]>(`SELECT id FROM classes WHERE id IN (${placeholders}) AND establishment_id = ?`, [...classes, establishmentId]);
    if (validClasses.length !== classes.length) throw new Error('Une ou plusieurs classes sont invalides pour cet établissement.');
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT s.user_id FROM students s JOIN users u ON u.id = s.user_id WHERE s.class_id IN (${placeholders}) AND s.establishment_id = ? AND u.establishment_id = ?`, [...classes, establishmentId, establishmentId]);
    rows.forEach((row) => ids.add(Number(row.user_id)));
  }

  if (roleNames.length) {
    const placeholders = roleNames.map(() => '?').join(',');
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.establishment_id = ? AND UPPER(r.name) IN (${placeholders})`, [establishmentId, ...roleNames]);
    rows.forEach((row) => ids.add(Number(row.id)));
  }

  const resolved = [...ids].filter((id) => id !== senderId);
  if (!resolved.length) throw new Error('Aucun destinataire spécifié.');
  const placeholders = resolved.map(() => '?').join(',');
  const [validUsers] = await pool.query<RowDataPacket[]>(`SELECT id FROM users WHERE id IN (${placeholders}) AND establishment_id = ? AND is_active = 1`, [...resolved, establishmentId]);
  if (validUsers.length !== resolved.length) throw new Error('Un ou plusieurs destinataires sont invalides pour cet établissement.');
  return resolved;
}

export async function getMessageRecipients(messageId: number, establishmentId: number, page = 1, limit = 20): Promise<any> {
  const pool = getPool();
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;
  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM message_recipients mr JOIN messages m ON m.id = mr.message_id WHERE mr.message_id = ? AND m.establishment_id = ?',
    [messageId, establishmentId]
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       mr.id,
       mr.user_id,
       u.first_name,
       u.last_name,
       u.matricule,
       u.phone,
       r.name AS role_name,
       e.id AS establishment_id,
       e.name AS establishment_name,
       s.matricule_scolaire,
       s.status AS student_status,
       c.id AS class_id,
       c.name AS class_name,
       c.level AS class_level,
       c.section AS class_section,
       mr.delivery_status,
       mr.delivered_at,
       mr2.read_at,
       ma.acknowledged_at,
       GROUP_CONCAT(DISTINCT g.name ORDER BY g.name SEPARATOR ', ') AS group_names,
       CASE
         WHEN ma.id IS NOT NULL THEN 'acknowledged'
         WHEN mr2.id IS NOT NULL THEN 'read'
         WHEN mr.delivery_status = 'delivered' THEN 'delivered'
         WHEN mr.delivery_status = 'failed' THEN 'failed'
         ELSE 'pending'
       END AS status
     FROM message_recipients mr
     JOIN messages m ON m.id = mr.message_id
     JOIN users u ON u.id = mr.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN establishments e ON e.id = u.establishment_id
     LEFT JOIN students s ON s.user_id = u.id AND s.establishment_id = m.establishment_id
     LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = m.establishment_id
     LEFT JOIN group_members gm ON gm.user_id = u.id
     LEFT JOIN \`groups\` g ON g.id = gm.group_id AND g.establishment_id = m.establishment_id
     LEFT JOIN message_reads mr2 ON mr2.message_id = mr.message_id AND mr2.user_id = mr.user_id
     LEFT JOIN message_acknowledgements ma ON ma.message_id = mr.message_id AND ma.user_id = mr.user_id
     WHERE mr.message_id = ?
       AND m.establishment_id = ?
       AND u.establishment_id = m.establishment_id
     GROUP BY mr.id, mr.user_id, u.first_name, u.last_name, u.matricule, u.phone,
              r.name, e.id, e.name, s.matricule_scolaire, s.status,
              c.id, c.name, c.level, c.section, mr.delivery_status,
              mr.delivered_at, mr2.read_at, ma.acknowledged_at
     ORDER BY u.last_name, u.first_name
     LIMIT ? OFFSET ?`,
    [messageId, establishmentId, safeLimit, offset]
  );

  return {
    data: rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      first_name: row.first_name,
      last_name: row.last_name,
      matricule: row.matricule,
      phone: row.phone || null,
      role_name: row.role_name || null,
      establishment_id: row.establishment_id != null ? String(row.establishment_id) : null,
      establishment_name: row.establishment_name || null,
      matricule_scolaire: row.matricule_scolaire || null,
      student_status: row.student_status || null,
      class_id: row.class_id != null ? String(row.class_id) : null,
      class_name: row.class_name || null,
      class_level: row.class_level || null,
      class_section: row.class_section || null,
      group_names: row.group_names || null,
      delivery_status: row.delivery_status,
      status: row.status,
      delivered_at: row.delivered_at,
      read_at: row.read_at,
      acknowledged_at: row.acknowledged_at,
    })),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
  };
}

export async function getMessageRecipientStats(messageId: number, establishmentId: number): Promise<any> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total, SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN mr.delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed, COUNT(DISTINCT mr2.user_id) AS read_count, COUNT(DISTINCT ma.user_id) AS acknowledged_count FROM message_recipients mr JOIN messages m ON m.id = mr.message_id LEFT JOIN message_reads mr2 ON mr2.message_id = mr.message_id AND mr2.user_id = mr.user_id LEFT JOIN message_acknowledgements ma ON ma.message_id = mr.message_id AND ma.user_id = mr.user_id WHERE mr.message_id = ? AND m.establishment_id = ?`, [messageId, establishmentId]);
  const row = rows[0] || {};
  const total = Number(row.total) || 0;
  const readCount = Number(row.read_count) || 0;
  return { total, delivered: Number(row.delivered) || 0, failed: Number(row.failed) || 0, read_count: readCount, acknowledged_count: Number(row.acknowledged_count) || 0, read_rate: total ? Math.round((readCount / total) * 100) : 0 };
}
