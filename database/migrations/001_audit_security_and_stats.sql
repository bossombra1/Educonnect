-- EduConnect targeted audit corrections
-- Apply on an existing database. Do not run against production without backup.

USE educonnect;

-- bcrypt hashes are 60 characters; keep room for future hash formats.
ALTER TABLE users
  MODIFY COLUMN otp_code VARCHAR(255) DEFAULT NULL;

-- Rebuild the message statistics view using independent aggregations.
-- This avoids row multiplication when a message has multiple recipients,
-- reads and acknowledgements.
DROP VIEW IF EXISTS `v_message_read_stats`;
CREATE VIEW `v_message_read_stats` AS
SELECT
  m.id AS message_id,
  m.title,
  m.message_type,
  m.status AS message_status,
  m.created_at,
  COALESCE(r.total_recipients, 0) AS total_recipients,
  COALESCE(r.delivered_count, 0) AS delivered_count,
  COALESCE(r.failed_count, 0) AS failed_count,
  COALESCE(r.pending_count, 0) AS pending_count,
  COALESCE(rd.read_count, 0) AS read_count,
  COALESCE(ak.acknowledged_count, 0) AS acknowledged_count,
  CASE
    WHEN COALESCE(r.total_recipients, 0) > 0
    THEN ROUND(COALESCE(rd.read_count, 0) * 100.0 / r.total_recipients, 2)
    ELSE 0.00
  END AS read_percentage
FROM messages m
LEFT JOIN (
  SELECT
    message_id,
    COUNT(*) AS total_recipients,
    SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
    SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
    SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) AS pending_count
  FROM message_recipients
  GROUP BY message_id
) r ON r.message_id = m.id
LEFT JOIN (
  SELECT message_id, COUNT(*) AS read_count
  FROM message_reads
  GROUP BY message_id
) rd ON rd.message_id = m.id
LEFT JOIN (
  SELECT message_id, COUNT(*) AS acknowledged_count
  FROM message_acknowledgements
  GROUP BY message_id
) ak ON ak.message_id = m.id;
