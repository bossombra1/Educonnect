import { BaseRepository } from './base.repository.js';
import { Message, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

export class MessageRepository extends BaseRepository<Message> {
  constructor() {
    super('messages');
  }

  /**
   * Get delivery/read/acknowledgement statistics for a single message.
   */
  async getRecipientStats(
    messageId: number
  ): Promise<{
    delivered: number;
    failed: number;
    pending: number;
    read: number;
    acknowledged: number;
  }> {
    const pool = this.getPool();

    const [deliveryRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         delivery_status,
         COUNT(*) AS count
       FROM message_recipients
       WHERE message_id = ?
       GROUP BY delivery_status`,
      [messageId]
    );

    let delivered = 0;
    let failed = 0;
    let pending = 0;

    for (const row of deliveryRows) {
      switch (row.delivery_status) {
        case 'delivered':
          delivered = row.count as number;
          break;
        case 'failed':
          failed = row.count as number;
          break;
        case 'pending':
          pending = row.count as number;
          break;
      }
    }

    const [readRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM message_reads WHERE message_id = ?',
      [messageId]
    );
    const read = readRows[0].count as number;

    const [ackRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM message_acknowledgements WHERE message_id = ?',
      [messageId]
    );
    const acknowledged = ackRows[0].count as number;

    return { delivered, failed, pending, read, acknowledged };
  }

  /**
   * Get daily message statistics within a date range for an establishment.
   */
  async getStatsByDateRange(
    establishmentId: number,
    startDate: string,
    endDate: string
  ): Promise<{ date: string; sent: number; delivered: number; read: number }[]> {
    const pool = this.getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         DATE(m.created_at) AS date,
         COUNT(DISTINCT m.id) AS sent,
         COUNT(DISTINCT CASE WHEN mr.delivery_status = 'delivered' THEN mr.id END) AS delivered,
         COUNT(DISTINCT CASE WHEN rd.id IS NOT NULL THEN rd.message_id END) AS read
       FROM messages m
       LEFT JOIN message_recipients mr ON mr.message_id = m.id
       LEFT JOIN message_reads rd ON rd.message_id = m.id AND rd.user_id = mr.user_id
       WHERE m.establishment_id = ?
         AND m.created_at >= ?
         AND m.created_at <= ?
       GROUP BY DATE(m.created_at)
       ORDER BY date ASC`,
      [establishmentId, startDate, endDate]
    );

    return rows.map((row) => ({
      date: (row.date as string).substring(0, 10),
      sent: row.sent as number,
      delivered: row.delivered as number,
      read: row.read as number,
    }));
  }
}
