import { getPool } from '../config/database.js';
import { ResultSetHeader } from 'mysql2/promise';

export interface DraftMessageInput {
  title?: string;
  content: string;
  message_type?: string;
  priority?: string;
  link_url?: string;
}

export interface DraftAttachment {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export async function createDraftMessage(
  data: DraftMessageInput,
  senderId: number,
  establishmentId: number,
  recipientIds: number[],
  attachments: DraftAttachment[] = [],
): Promise<{ id: number; recipient_count: number; status: 'draft' }> {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const messageType = data.message_type || 'text';
    let resolvedMessageType = messageType;
    if (attachments.length > 0 && messageType === 'text') {
      const ext = attachments[0].file_name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') resolvedMessageType = 'pdf';
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) resolvedMessageType = 'image';
    }

    const [msgResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO messages
       (establishment_id, sender_id, title, content, message_type, priority, status, scheduled_at, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', NULL, NULL)`,
      [
        establishmentId,
        senderId,
        data.title || null,
        data.content,
        resolvedMessageType,
        data.priority || 'normal',
      ],
    );

    const messageId = msgResult.insertId;

    if (recipientIds.length > 0) {
      const recipientValues = recipientIds.map((userId) => [messageId, userId, 'pending']);
      await conn.query(
        `INSERT INTO message_recipients (message_id, user_id, delivery_status) VALUES ?`,
        [recipientValues],
      );
    }

    if (data.link_url) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO message_attachments (message_id, file_name, file_url, file_type)
         VALUES (?, ?, ?, 'other')`,
        [messageId, 'link', data.link_url],
      );
    }

    if (attachments.length > 0) {
      const attachmentValues = attachments.map((attachment) => [
        messageId,
        attachment.file_name,
        attachment.file_url,
        attachment.file_type || 'other',
        attachment.file_size || null,
      ]);
      await conn.query(
        `INSERT INTO message_attachments
         (message_id, file_name, file_url, file_type, file_size) VALUES ?`,
        [attachmentValues],
      );
    }

    await conn.commit();

    return {
      id: messageId,
      recipient_count: recipientIds.length,
      status: 'draft',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
