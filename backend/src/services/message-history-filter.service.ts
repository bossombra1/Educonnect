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
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM messages m ${whereClause}`, params);
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.ceil(total / limit);
  const [messages] = await pool.query<RowDataPacket[]>(`SELECT m.*, u.first_name as sender_name, u.last_name as sender_last_name,
       (SELECT COUNT(*) FROM message_recipients WHERE message_id = m.id) as recipient_count FROM messages m JOIN users u ON u.id = m.sender_id ${whereClause}
       ORDER BY m.sent_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

  return { data: messages, total, page, limit, totalPages };
}
