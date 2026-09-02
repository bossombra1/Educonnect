import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { sendBulkPushNotifications } from '../config/firebase.js';
import { CreateMessageInput, PaginationOptions, PaginationResult } from '../types/index.js';

export async function sendMessage(
  data: CreateMessageInput,
  senderId: number,
  establishmentId: number,
  recipientIds: number[],
  attachments?: Array<{ file_name: string; file_url: string; file_type: string; file_size: number }>
): Promise<any> {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    let finalRecipientIds = [...recipientIds];

    // Resolve recipients from groups
    if (data.group_ids && data.group_ids.length > 0) {
      const groupPlaceholders = data.group_ids.map(() => '?').join(',');
      const [groupMembers] = await conn.query<RowDataPacket[]>(
        `SELECT DISTINCT user_id FROM group_members WHERE group_id IN (${groupPlaceholders})`,
        data.group_ids
      );
      const groupUserIds = groupMembers.map((m) => m.user_id);
      const set = new Set([...finalRecipientIds, ...groupUserIds]);
      finalRecipientIds = [...set].filter((id) => id !== senderId);
    }

    if (finalRecipientIds.length === 0) {
      throw new Error('Aucun destinataire spécifié.');
    }

    // Determine message_type
    let messageType: string = data.message_type || 'text';
    if (attachments && attachments.length > 0 && messageType === 'text') {
      const ext = attachments[0].file_name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') messageType = 'pdf';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) messageType = 'image';
    }

    const [msgResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO messages (establishment_id, sender_id, title, content, message_type, priority, status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, 'sent', NOW())`,
      [
        establishmentId,
        senderId,
        data.title || null,
        data.content,
        messageType,
        data.priority || 'normal',
      ]
    );

    const messageId = msgResult.insertId;

    // Insert recipients
    const recipientValues = finalRecipientIds.map((userId) => [messageId, userId, 'pending']);
    await conn.query(
      `INSERT INTO message_recipients (message_id, user_id, delivery_status) VALUES ?`,
      [recipientValues]
    );

    // Insert link_url if provided (stored as attachment with type 'link')
    if (data.link_url) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO message_attachments (message_id, file_name, file_url, file_type) VALUES (?, ?, ?, 'other')`,
        [messageId, 'link', data.link_url]
      );
    }

    // Insert attachments
    if (attachments && attachments.length > 0) {
      const attachmentValues = attachments.map((a) => [
        messageId, a.file_name, a.file_url, a.file_type || 'other', a.file_size || null,
      ]);
      await conn.query(
        `INSERT INTO message_attachments (message_id, file_name, file_url, file_type, file_size) VALUES ?`,
        [attachmentValues]
      );
    }

    await conn.commit();

    // Fire-and-forget push notifications
    sendBulkPushNotifications(
      finalRecipientIds,
      data.title || 'Nouveau message',
      data.content.substring(0, 100),
      { messageId: messageId.toString(), type: 'MESSAGE' }
    ).catch(() => {});

    return {
      id: messageId,
      recipient_count: finalRecipientIds.length,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function markAsDelivered(messageId: number, userId: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE message_recipients SET delivery_status = 'delivered', delivered_at = NOW()
     WHERE message_id = ? AND user_id = ?`,
    [messageId, userId]
  );
}

export async function markAsRead(messageId: number, userId: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE read_at = NOW()`,
    [messageId, userId]
  );
}

export async function acknowledgeMessage(
  messageId: number,
  userId: number
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO message_acknowledgements (message_id, user_id, acknowledged_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE acknowledged_at = NOW()`,
    [messageId, userId]
  );
}

export async function getMessageStatistics(messageId: number): Promise<any> {
  const pool = getPool();

  const [stats] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered,
       SUM(CASE WHEN mr.delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
       (SELECT COUNT(DISTINCT mr2.user_id) FROM message_reads mr2 WHERE mr2.message_id = ?) as read_count,
       (SELECT COUNT(DISTINCT ma.user_id) FROM message_acknowledgements ma WHERE ma.message_id = ?) as acknowledged_count
     FROM message_recipients mr
     WHERE mr.message_id = ?`,
    [messageId, messageId, messageId]
  );

  if (stats.length === 0) return { total: 0, delivered: 0, failed: 0, read_count: 0, acknowledged_count: 0 };
  const row = stats[0];
  const total = Number(row.total) || 0;
  return {
    total,
    delivered: Number(row.delivered) || 0,
    failed: Number(row.failed) || 0,
    read_count: Number(row.read_count) || 0,
    acknowledged_count: Number(row.acknowledged_count) || 0,
    read_rate: total > 0 ? Math.round(((Number(row.read_count) || 0) / total) * 100) : 0,
  };
}

export async function getMessages(
  userId: number,
  role: string,
  options: PaginationOptions & { status?: string; class_id?: number; priority?: string }
): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    // Admin: show messages sent by this establishment
    return getAdminMessages(userId, options, page, limit, offset);
  }

  // Non-admin: show messages where user is a recipient
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
            (SELECT COUNT(*) FROM message_reads mr2 WHERE mr2.message_id = m.id AND mr2.user_id = ?) as is_read,
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
  let attachmentMap: Record<number, any[]> = {};

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

async function getAdminMessages(
  userId: number,
  options: any,
  page: number,
  limit: number,
  offset: number
): Promise<PaginationResult> {
  const pool = getPool();
  const conditions: string[] = ['m.establishment_id = (SELECT establishment_id FROM users WHERE id = ?)'];
  const params: any[] = [userId];

  if (options.status) {
    conditions.push('m.status = ?');
    params.push(options.status);
  }
  if (options.priority) {
    conditions.push('m.priority = ?');
    params.push(options.priority);
  }
  if (options.class_id) {
    conditions.push(`m.id IN (
      SELECT mr.message_id FROM message_recipients mr
      JOIN students s ON s.user_id = mr.user_id
      WHERE s.class_id = ?
    )`);
    params.push(options.class_id);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM messages m ${whereClause}`,
    params
  );
  const total = countRows[0].total as number;
  const totalPages = Math.ceil(total / limit);

  const [messages] = await pool.query<RowDataPacket[]>(
    `SELECT m.*,
            (SELECT COUNT(*) FROM message_recipients WHERE message_id = m.id) as recipient_count,
            u.first_name as sender_first_name, u.last_name as sender_last_name
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     ${whereClause}
     ORDER BY m.sent_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: messages, total, page, limit, totalPages };
}

export async function getMessageById(messageId: number, userId: number, role: string): Promise<any> {
  const pool = getPool();

  let query: string;
  let params: any[];

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    query = `SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name
             FROM messages m
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.id = ?`;
    params = [messageId];
  } else {
    query = `SELECT m.*,
                   (SELECT COUNT(*) FROM message_reads mr2 WHERE mr2.message_id = m.id AND mr2.user_id = ?) as is_read,
                   (SELECT COUNT(*) FROM message_acknowledgements ma WHERE ma.message_id = m.id AND ma.user_id = ?) as is_acknowledged,
                   u.first_name as sender_first_name, u.last_name as sender_last_name
             FROM messages m
             JOIN message_recipients mr ON mr.message_id = m.id AND mr.user_id = ?
             LEFT JOIN users u ON u.id = m.sender_id
             WHERE m.id = ?`;
    params = [userId, userId, userId, messageId];
  }

  const [messages] = await pool.query<RowDataPacket[]>(query, params);
  if (messages.length === 0) return null;

  const message = messages[0];

  const [attachments] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM message_attachments WHERE message_id = ?',
    [messageId]
  );

  const [recipients] = await pool.query<RowDataPacket[]>(
    `SELECT mr.id, mr.user_id, mr.delivery_status, mr.delivered_at,
            u.first_name, u.last_name, u.matricule
     FROM message_recipients mr
     LEFT JOIN users u ON u.id = mr.user_id
     WHERE mr.message_id = ?
     ORDER BY mr.created_at`,
    [messageId]
  );

  return {
    ...message,
    is_read: Number(message.is_read) > 0,
    is_acknowledged: Number(message.is_acknowledged) > 0,
    attachments,
    recipients,
  };
}

export async function getUnreadCount(userId: number): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as count
     FROM message_recipients mr
     JOIN messages m ON m.id = mr.message_id
     LEFT JOIN message_reads mr2 ON mr2.message_id = m.id AND mr2.user_id = ?
     WHERE mr.user_id = ? AND m.status = 'sent' AND mr2.id IS NULL`,
    [userId, userId]
  );
  return Number(rows[0]?.count) || 0;
}

export async function getMessageHistory(
  establishmentId: number,
  filters: { date_from?: string; date_to?: string; class_id?: number; priority?: string; status?: string },
  pagination: PaginationOptions
): Promise<PaginationResult> {
  const pool = getPool();
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['m.establishment_id = ?'];
  const params: any[] = [establishmentId];

  if (filters.date_from) {
    conditions.push('m.sent_at >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push('m.sent_at <= ?');
    params.push(filters.date_to + ' 23:59:59');
  }
  if (filters.priority) {
    conditions.push('m.priority = ?');
    params.push(filters.priority);
  }
  if (filters.status) {
    conditions.push('m.status = ?');
    params.push(filters.status);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM messages m ${whereClause}`,
    params
  );
  const total = countRows[0].total as number;
  const totalPages = Math.ceil(total / limit);

  const [messages] = await pool.query<RowDataPacket[]>(
    `SELECT m.*, u.first_name as sender_name, u.last_name as sender_last_name,
       (SELECT COUNT(*) FROM message_recipients WHERE message_id = m.id) as recipient_count
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     ${whereClause}
     ORDER BY m.sent_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: messages, total, page, limit, totalPages };
}
