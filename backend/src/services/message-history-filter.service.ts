import { getPool } from '../config/database.js';
import { RowDataPacket } from 'mysql2/promise';
import { PaginationOptions, PaginationResult } from '../types/index.js';

export async function getMessageHistoryWithType(
  establishmentId: number,
  filters: { date_from?: string; date_to?: string; class_id?: number; priority?: string; status?: string; type?: string },
  pagination: PaginationOptions
): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = (page - 1) * limit;
  const conditions: string[] = ['m.establishment_id = ?'];
  const params: any[] = [establishmentId];

  if (filters.date_from) { conditions.push('m.sent_at >= ?'); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push('m.sent_at <= ?'); params.push(filters.date_to + ' 23:59:59'); }
  if (filters.priority) { conditions.push('m.priority = ?'); params.push(filters.priority); }
  if (filters.status) { conditions.push('m.status = ?'); params.push(filters.status); }
  if (filters.type) { conditions.push('m.message_type = ?'); params.push(filters.type); }
  if (filters.class_id) {
    conditions.push(`m.id IN (SELECT mr.message_id FROM message_recipients mr JOIN students s ON s.user_id = mr.user_id WHERE s.class_id = ? AND s.establishment_id = m.establishment_id)`);
    params.push(filters.class_id);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM messages m ${whereClause}`, params);
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.ceil(total / limit);

  const [messages] = await pool.query<RowDataPacket[]>(
    `SELECT
       m.id, m.title, m.content, m.message_type AS type, m.priority,
       m.sender_id AS senderId, m.status, m.scheduled_at AS scheduledAt,
       m.sent_at AS sentAt, m.created_at AS createdAt, m.updated_at AS updatedAt,
       u.first_name AS senderFirstName, u.last_name AS senderLastName,
       (SELECT COUNT(*) FROM message_recipients mr0 WHERE mr0.message_id = m.id) AS totalRecipients,
       (SELECT COUNT(DISTINCT rd.user_id) FROM message_reads rd JOIN message_recipients mr1 ON mr1.message_id = rd.message_id AND mr1.user_id = rd.user_id WHERE rd.message_id = m.id) AS readCount,
       (SELECT COUNT(*) FROM message_recipients mr2 WHERE mr2.message_id = m.id AND mr2.delivery_status = 'delivered') AS deliveryCount
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     ${whereClause}
     ORDER BY COALESCE(m.sent_at, m.created_at) DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const data = messages.map((message) => ({
    ...message,
    totalRecipients: Number(message.totalRecipients) || 0,
    readCount: Number(message.readCount) || 0,
    deliveryCount: Number(message.deliveryCount) || 0,
    recipients: [],
    attachments: [],
  }));

  return { data, total, page, limit, totalPages };
}

export async function getMessageHistoryDetail(messageId: number, establishmentId: number): Promise<any | null> {
  const pool = getPool();
  const [messages] = await pool.query<RowDataPacket[]>(
    `SELECT
       m.id, m.title, m.content, m.message_type AS type, m.priority,
       m.sender_id AS senderId, m.status, m.scheduled_at AS scheduledAt,
       m.sent_at AS sentAt, m.created_at AS createdAt, m.updated_at AS updatedAt,
       u.first_name AS senderFirstName, u.last_name AS senderLastName,
       e.id AS establishmentId, e.name AS establishmentName
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     LEFT JOIN establishments e ON e.id = m.establishment_id
     WHERE m.id = ? AND m.establishment_id = ?
     LIMIT 1`,
    [messageId, establishmentId]
  );

  if (messages.length === 0) return null;
  const message = messages[0];

  const [recipients] = await pool.query<RowDataPacket[]>(
    `SELECT
       mr.id, mr.user_id AS userId, mr.delivery_status AS deliveryStatus,
       mr.delivered_at AS deliveredAt,
       u.first_name AS firstName, u.last_name AS lastName, u.matricule,
       u.phone, u.establishment_id AS establishmentId,
       r.name AS role,
       s.matricule_scolaire AS schoolMatricule,
       s.status AS studentStatus,
       c.id AS classId, c.name AS className, c.level, c.section,
       CASE WHEN ma.acknowledged_at IS NOT NULL THEN 'acknowledged'
            WHEN rd.read_at IS NOT NULL THEN 'read'
            WHEN mr.delivery_status = 'delivered' THEN 'delivered'
            WHEN mr.delivery_status = 'failed' THEN 'failed'
            ELSE 'pending' END AS interactionStatus,
       rd.read_at AS readAt,
       ma.acknowledged_at AS acknowledgedAt
     FROM message_recipients mr
     JOIN users u ON u.id = mr.user_id AND u.establishment_id = ?
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN students s ON s.user_id = u.id AND s.establishment_id = ?
     LEFT JOIN classes c ON c.id = s.class_id AND c.establishment_id = ?
     LEFT JOIN message_reads rd ON rd.message_id = mr.message_id AND rd.user_id = mr.user_id
     LEFT JOIN message_acknowledgements ma ON ma.message_id = mr.message_id AND ma.user_id = mr.user_id
     WHERE mr.message_id = ?
     ORDER BY u.last_name, u.first_name`,
    [establishmentId, establishmentId, establishmentId, messageId]
  );

  const [groups] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT g.id, g.name, g.type
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id AND g.establishment_id = ?
     JOIN message_recipients mr ON mr.user_id = gm.user_id AND mr.message_id = ?
     ORDER BY g.name`,
    [establishmentId, messageId]
  );

  const [classes] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT c.id, c.name, c.level, c.section
     FROM message_recipients mr
     JOIN students s ON s.user_id = mr.user_id AND s.establishment_id = ?
     JOIN classes c ON c.id = s.class_id AND c.establishment_id = ?
     WHERE mr.message_id = ?
     ORDER BY c.name`,
    [establishmentId, establishmentId, messageId]
  );

  const [attachments] = await pool.query<RowDataPacket[]>(
    `SELECT id, file_name AS fileName, file_url AS fileUrl, file_type AS fileType, file_size AS fileSize
     FROM message_attachments WHERE message_id = ? ORDER BY id`,
    [messageId]
  );

  const [stats] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
       SUM(CASE WHEN mr.delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed,
       SUM(CASE WHEN rd.read_at IS NOT NULL THEN 1 ELSE 0 END) AS readCount,
       SUM(CASE WHEN ma.acknowledged_at IS NOT NULL THEN 1 ELSE 0 END) AS acknowledgedCount
     FROM message_recipients mr
     LEFT JOIN message_reads rd ON rd.message_id = mr.message_id AND rd.user_id = mr.user_id
     LEFT JOIN message_acknowledgements ma ON ma.message_id = mr.message_id AND ma.user_id = mr.user_id
     WHERE mr.message_id = ?`,
    [messageId]
  );

  const row = stats[0] || {};
  return {
    ...message,
    totalRecipients: Number(row.total) || 0,
    deliveryCount: Number(row.delivered) || 0,
    failedCount: Number(row.failed) || 0,
    readCount: Number(row.readCount) || 0,
    acknowledgedCount: Number(row.acknowledgedCount) || 0,
    recipients,
    groups,
    classes,
    attachments,
  };
}
