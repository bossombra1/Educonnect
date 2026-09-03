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
       m.id,
       m.title,
       m.content,
       m.message_type AS type,
       m.priority,
       m.sender_id AS senderId,
       m.status,
       m.scheduled_at AS scheduledAt,
       m.sent_at AS sentAt,
       m.created_at AS createdAt,
       m.updated_at AS updatedAt,
       u.first_name AS senderFirstName,
       u.last_name AS senderLastName,
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
