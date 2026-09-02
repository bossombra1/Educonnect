import { BaseRepository } from './base.repository.js';
import { Notification, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super('notifications');
  }

  /**
   * Find all notifications for a specific user with pagination,
   * ordered by most recent first. Includes an `is_read` flag computed
   * from the `message_reads` table via the notification's `message_id`.
   */
  async findByUser(
    userId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT n.*,
              CASE
                WHEN n.message_id IS NULL THEN FALSE
                WHEN EXISTS (
                  SELECT 1 FROM message_reads mr
                  WHERE mr.message_id = n.message_id AND mr.user_id = ?
                ) THEN TRUE
                ELSE FALSE
              END AS is_read
       FROM notifications n
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, limit, offset]
    );

    return {
      data: rows as Notification[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Mark a single notification as read for a specific user.
   * Since there is no dedicated `notification_reads` table, read status is
   * tracked through `message_reads` using the notification's `message_id`.
   */
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    const pool = this.getPool();

    // Verify the notification belongs to this user and retrieve its message_id
    const [notification] = await pool.query<RowDataPacket[]>(
      'SELECT id, message_id FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    if (notification.length === 0) {
      throw new Error('Notification non trouvée.');
    }

    const messageId = notification[0].message_id as number | null;

    // Notifications without an associated message cannot be marked as read
    // through the message_reads mechanism.
    if (messageId === null) {
      throw new Error('Impossible de marquer cette notification comme lue : aucun message associé.');
    }

    // Insert a read record if not already present (IGNORE handles duplicates)
    await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO message_reads (message_id, user_id, read_at)
       VALUES (?, ?, NOW())`,
      [messageId, userId]
    );
  }

  /**
   * Mark all notifications as read for a specific user.
   * Only affects notifications that have an associated `message_id`.
   */
  async markAllAsRead(userId: number): Promise<void> {
    const pool = this.getPool();

    await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO message_reads (message_id, user_id, read_at)
       SELECT n.message_id, ?, NOW()
       FROM notifications n
       WHERE n.user_id = ?
         AND n.message_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM message_reads mr
           WHERE mr.message_id = n.message_id AND mr.user_id = ?
         )`,
      [userId, userId, userId]
    );
  }

  /**
   * Get the count of unread notifications for a specific user.
   * A notification is considered unread when it either has no associated
   * message, or its associated message has no entry in `message_reads`
   * for this user.
   */
  async getUnreadCount(userId: number): Promise<number> {
    const pool = this.getPool();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM notifications n
       WHERE n.user_id = ?
         AND (
           n.message_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM message_reads mr
             WHERE mr.message_id = n.message_id AND mr.user_id = ?
           )
         )`,
      [userId, userId]
    );

    return rows[0].count as number;
  }
}
