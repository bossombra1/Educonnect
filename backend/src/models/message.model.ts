import { BaseRepository } from '../repositories/base.repository.js';
import { Message, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

export class MessageModel extends BaseRepository<Message> {
  constructor() {
    super('messages');
  }

  async findWithRecipients(messageId: number): Promise<any> {
    const pool = this.getPool();

    const [messages] = await pool.query<RowDataPacket[]>(
      `SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name
       FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [messageId]
    );

    if (messages.length === 0) return null;

    const message = messages[0];

    const [recipients] = await pool.query<RowDataPacket[]>(
      `SELECT mr.id, mr.user_id, mr.delivery_status, mr.delivered_at,
              u.first_name, u.last_name, u.matricule,
              (SELECT COUNT(*) FROM message_reads mrd WHERE mrd.message_id = mr.message_id AND mrd.user_id = mr.user_id) as is_read,
              (SELECT COUNT(*) FROM message_acknowledgements ma WHERE ma.message_id = mr.message_id AND ma.user_id = mr.user_id) as is_acknowledged
       FROM message_recipients mr
       LEFT JOIN users u ON u.id = mr.user_id
       WHERE mr.message_id = ?
       ORDER BY u.last_name, u.first_name`,
      [messageId]
    );

    const [attachments] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM message_attachments WHERE message_id = ?',
      [messageId]
    );

    const formattedRecipients = recipients.map((r) => ({
      ...r,
      is_read: Number(r.is_read) > 0,
      is_acknowledged: Number(r.is_acknowledged) > 0,
    }));

    return {
      ...message,
      recipients: formattedRecipients,
      attachments,
    };
  }

  async findWithStats(messageId: number): Promise<any> {
    const pool = this.getPool();

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_message_read_stats WHERE message_id = ?`,
      [messageId]
    );

    if (stats.length === 0) {
      const [message] = await pool.query<RowDataPacket[]>(
        `SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name
         FROM messages m
         LEFT JOIN users u ON u.id = m.sender_id
         WHERE m.id = ?`,
        [messageId]
      );
      if (message.length === 0) return null;
      return {
        ...message[0],
        total_recipients: 0,
        delivered_count: 0,
        read_count: 0,
        acknowledged_count: 0,
        failed_count: 0,
        read_rate: 0,
      };
    }

    return stats[0];
  }

  async findBySender(
    senderId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM messages WHERE sender_id = ?`,
      [senderId]
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.*,
              (SELECT COUNT(*) FROM message_recipients WHERE message_id = m.id) as recipient_count
       FROM messages m
       WHERE m.sender_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [senderId, limit, offset]
    );

    return { data: rows as Message[], total, page, limit, totalPages };
  }

  async findScheduled(pagination?: PaginationOptions): Promise<PaginationResult> {
    return this.findAll(
      { status: 'scheduled', scheduled_at: { gt: new Date().toISOString().slice(0, 19).replace('T', ' ') } },
      pagination
    );
  }

  async findPendingScheduled(): Promise<Message[]> {
    const pool = this.getPool();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM messages
       WHERE status = 'scheduled' AND scheduled_at <= ?
       ORDER BY scheduled_at ASC`,
      [now]
    );

    return rows as Message[];
  }

  async updateStatus(messageId: number, status: string): Promise<void> {
    const pool = this.getPool();
    await pool.query(
      `UPDATE messages SET status = ? WHERE id = ?`,
      [status, messageId]
    );
  }

  async getMessagesForUser(
    userId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM message_recipients mr
       JOIN messages m ON m.id = mr.message_id
       WHERE mr.user_id = ? AND m.status = 'sent'`,
      [userId]
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [messages] = await pool.query<RowDataPacket[]>(
      `SELECT m.*,
              (SELECT COUNT(*) FROM message_reads mrd WHERE mrd.message_id = m.id AND mrd.user_id = ?) as is_read,
              (SELECT COUNT(*) FROM message_acknowledgements ma WHERE ma.message_id = m.id AND ma.user_id = ?) as is_acknowledged,
              u.first_name as sender_first_name, u.last_name as sender_last_name
       FROM messages m
       JOIN message_recipients mr ON mr.message_id = m.id
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE mr.user_id = ? AND m.status = 'sent'
       GROUP BY m.id
       ORDER BY m.sent_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, limit, offset]
    );

    const messageIds = messages.map((m) => m.id);
    const attachmentMap: Record<number, any[]> = {};

    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',');
      const [attachments] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM message_attachments WHERE message_id IN (${placeholders})`,
        messageIds
      );
      for (const att of attachments) {
        if (!attachmentMap[att.message_id]) attachmentMap[att.message_id] = [];
        attachmentMap[att.message_id].push(att);
      }
    }

    const data = messages.map((m) => ({
      ...m,
      is_read: Number(m.is_read) > 0,
      is_acknowledged: Number(m.is_acknowledged) > 0,
      attachments: attachmentMap[m.id] || [],
    }));

    return { data, total, page, limit, totalPages };
  }
}
