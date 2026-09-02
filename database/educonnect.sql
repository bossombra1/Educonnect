-- =============================================================
-- EduConnect - School Messaging Platform
-- Database Schema (MySQL 5.7+ / 8.0+)
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Compatible with WAMPServer / phpMyAdmin import
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS educonnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE educonnect;

-- ------------------------------------------------------------
-- 1. roles
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `level` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pre-insert roles
INSERT IGNORE INTO `roles` (`id`, `name`, `label`, `description`, `level`) VALUES
(1, 'SUPER_ADMIN', 'Super Administrateur', 'Accès complet à la plateforme', 100),
(2, 'ADMIN',        'Administrateur',     'Gestion de l\'établissement',   80),
(3, 'PARENT',       'Parent',             'Parent d\'élève',               20),
(4, 'STUDENT',      'Élève',              'Élève inscrit',                 10),
(5, 'STAFF',        'Personnel',          'Personnel de l\'établissement',  30);

-- ------------------------------------------------------------
-- 2. establishments
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `establishments`;
CREATE TABLE `establishments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `address` VARCHAR(500) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `max_students` INT UNSIGNED DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_establishments_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. classes
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `level` VARCHAR(50) NOT NULL,
  `section` VARCHAR(10) DEFAULT NULL,
  `capacity` INT UNSIGNED DEFAULT NULL,
  `school_year` VARCHAR(9) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_classes_establishment_name_year` (`establishment_id`, `name`, `school_year`),
  CONSTRAINT `fk_classes_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. users
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED DEFAULT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `matricule` VARCHAR(50) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `phone_hash` VARCHAR(255) DEFAULT NULL COMMENT 'Hashed phone for RGPD compliance',
  `email` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `fcm_token` VARCHAR(500) DEFAULT NULL,
  `otp_code` VARCHAR(10) DEFAULT NULL,
  `otp_expires_at` DATETIME DEFAULT NULL,
  `otp_verified` BOOLEAN DEFAULT FALSE,
  `device_type` ENUM('android','ios','web') DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_matricule` (`matricule`),
  UNIQUE KEY `uk_users_email` (`email`),
  INDEX `idx_users_establishment` (`establishment_id`),
  INDEX `idx_users_role` (`role_id`),
  FULLTEXT INDEX `ft_users_name` (`first_name`, `last_name`),
  CONSTRAINT `fk_users_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. students
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `class_id` INT UNSIGNED NOT NULL,
  `establishment_id` INT UNSIGNED NOT NULL,
  `matricule_scolaire` VARCHAR(50) DEFAULT NULL,
  `admission_date` DATE DEFAULT NULL,
  `status` ENUM('active','transferred','graduated','suspended') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_students_user` (`user_id`),
  INDEX `idx_students_class` (`class_id`),
  INDEX `idx_students_establishment` (`establishment_id`),
  INDEX `idx_students_status` (`status`),
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_students_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. parents
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `parents`;
CREATE TABLE `parents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `establishment_id` INT UNSIGNED NOT NULL,
  `profession` VARCHAR(150) DEFAULT NULL,
  `is_primary_contact` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parents_user` (`user_id`),
  INDEX `idx_parents_establishment` (`establishment_id`),
  CONSTRAINT `fk_parents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_parents_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. parent_student
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `parent_student`;
CREATE TABLE `parent_student` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `priority` ENUM('parent1','parent2') NOT NULL DEFAULT 'parent1',
  `is_emergency_contact` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_student_priority` (`parent_id`, `student_id`, `priority`),
  INDEX `idx_parent_student_student` (`student_id`),
  CONSTRAINT `fk_ps_parent` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ps_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. staff
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `establishment_id` INT UNSIGNED NOT NULL,
  `role_title` VARCHAR(150) NOT NULL,
  `department` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_user` (`user_id`),
  INDEX `idx_staff_establishment` (`establishment_id`),
  CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. groups (broadcast_groups)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `group_type` ENUM('class','level','role','custom','all_school') NOT NULL DEFAULT 'custom',
  `filters` JSON DEFAULT NULL COMMENT 'Dynamic filter criteria',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_groups_establishment` (`establishment_id`),
  INDEX `idx_groups_type` (`group_type`),
  CONSTRAINT `fk_groups_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. group_members
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `group_members`;
CREATE TABLE `group_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_members_group_user` (`group_id`, `user_id`),
  INDEX `idx_group_members_user` (`user_id`),
  CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_gm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. messages
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `content` TEXT NOT NULL,
  `message_type` ENUM('text','image','pdf','link','circular') NOT NULL DEFAULT 'text',
  `priority` ENUM('normal','important','urgent') NOT NULL DEFAULT 'normal',
  `status` ENUM('draft','scheduled','sent','archived') NOT NULL DEFAULT 'draft',
  `scheduled_at` DATETIME DEFAULT NULL COMMENT 'Nullable DATETIME for scheduling',
  `sent_at` DATETIME DEFAULT NULL COMMENT 'Nullable DATETIME for send tracking',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_messages_establishment_status` (`establishment_id`, `status`),
  INDEX `idx_messages_scheduled_at` (`scheduled_at`),
  INDEX `idx_messages_sender` (`sender_id`),
  INDEX `idx_messages_created` (`created_at`),
  CONSTRAINT `fk_messages_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 12. message_recipients
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `message_recipients`;
CREATE TABLE `message_recipients` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `delivery_status` ENUM('pending','delivered','failed') NOT NULL DEFAULT 'pending',
  `delivered_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_recipients_msg_user` (`message_id`, `user_id`),
  INDEX `idx_mr_user` (`user_id`),
  INDEX `idx_mr_status` (`delivery_status`),
  CONSTRAINT `fk_mr_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 13. message_reads
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `message_reads`;
CREATE TABLE `message_reads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `read_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_reads_msg_user` (`message_id`, `user_id`),
  INDEX `idx_mreads_user` (`user_id`),
  CONSTRAINT `fk_mreads_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mreads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 14. message_acknowledgements
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `message_acknowledgements`;
CREATE TABLE `message_acknowledgements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `acknowledged_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_msg_ack_msg_user` (`message_id`, `user_id`),
  INDEX `idx_mack_user` (`user_id`),
  CONSTRAINT `fk_mack_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mack_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 15. message_attachments
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `message_attachments`;
CREATE TABLE `message_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `file_type` ENUM('image','pdf','other') NOT NULL DEFAULT 'other',
  `file_size` INT UNSIGNED DEFAULT NULL COMMENT 'File size in bytes',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ma_message` (`message_id`),
  CONSTRAINT `fk_ma_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 16. scheduled_messages
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `scheduled_messages`;
CREATE TABLE `scheduled_messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED NOT NULL,
  `message_id` INT UNSIGNED NOT NULL,
  `scheduled_for` DATETIME NOT NULL,
  `status` ENUM('pending','processing','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
  `retry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_attempt_at` DATETIME DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sm_establishment` (`establishment_id`),
  INDEX `idx_sm_scheduled_for` (`scheduled_for`),
  INDEX `idx_sm_status` (`status`),
  CONSTRAINT `fk_sm_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sm_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 17. notifications
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `message_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT DEFAULT NULL,
  `data` JSON DEFAULT NULL COMMENT 'Additional payload data',
  `fcm_status` ENUM('pending','sent','delivered','failed') NOT NULL DEFAULT 'pending',
  `fcm_message_id` VARCHAR(255) DEFAULT NULL,
  `sent_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notifications_user_created` (`user_id`, `created_at`),
  INDEX `idx_notifications_message` (`message_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 18. audit_logs
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED DEFAULT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT UNSIGNED DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'Supports IPv6',
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_user_created` (`user_id`, `created_at`),
  INDEX `idx_audit_action_created` (`action`, `created_at`),
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 19. password_resets
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pr_user` (`user_id`),
  INDEX `idx_pr_token` (`token_hash`),
  CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 20. imports
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `imports`;
CREATE TABLE `imports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` INT UNSIGNED NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `total_rows` INT UNSIGNED DEFAULT 0,
  `imported_rows` INT UNSIGNED DEFAULT 0,
  `failed_rows` INT UNSIGNED DEFAULT 0,
  `status` ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `error_log` TEXT DEFAULT NULL,
  `imported_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_imports_establishment` (`establishment_id`),
  INDEX `idx_imports_status` (`status`),
  CONSTRAINT `fk_imports_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_imports_user` FOREIGN KEY (`imported_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- VIEWS
-- =============================================================

-- ------------------------------------------------------------
-- View: v_message_read_stats
-- Per-message read / delivered / pending counts and percentage
-- ------------------------------------------------------------
DROP VIEW IF EXISTS `v_message_read_stats`;
CREATE VIEW `v_message_read_stats` AS
SELECT
  m.id                                                               AS message_id,
  m.title,
  m.message_type,
  m.status                                                            AS message_status,
  m.created_at,
  COUNT(DISTINCT mr.id)                                               AS total_recipients,
  SUM(CASE WHEN mr.delivery_status = 'delivered' THEN 1 ELSE 0 END)  AS delivered_count,
  SUM(CASE WHEN mr.delivery_status = 'failed'   THEN 1 ELSE 0 END)  AS failed_count,
  SUM(CASE WHEN mr.delivery_status = 'pending'  THEN 1 ELSE 0 END)  AS pending_count,
  COUNT(DISTINCT rd.id)                                               AS read_count,
  COUNT(DISTINCT ak.id)                                               AS acknowledged_count,
  CASE
    WHEN COUNT(DISTINCT mr.id) > 0
    THEN ROUND(COUNT(DISTINCT rd.id) * 100.0 / COUNT(DISTINCT mr.id), 2)
    ELSE 0.00
  END                                                                 AS read_percentage
FROM messages m
LEFT JOIN message_recipients mr       ON mr.message_id = m.id
LEFT JOIN message_reads rd            ON rd.message_id = m.id
LEFT JOIN message_acknowledgements ak ON ak.message_id = m.id
GROUP BY m.id, m.title, m.message_type, m.status, m.created_at;

-- ------------------------------------------------------------
-- View: v_parent_children
-- Parents with their children's classes
-- ------------------------------------------------------------
DROP VIEW IF EXISTS `v_parent_children`;
CREATE VIEW `v_parent_children` AS
SELECT
  p.id                          AS parent_id,
  u_p.first_name                AS parent_first_name,
  u_p.last_name                 AS parent_last_name,
  u_p.phone                     AS parent_phone,
  u_p.email                     AS parent_email,
  s.id                          AS student_id,
  u_s.first_name                AS student_first_name,
  u_s.last_name                 AS student_last_name,
  s.matricule_scolaire,
  c.id                          AS class_id,
  c.name                        AS class_name,
  c.level                       AS class_level,
  c.section                     AS class_section,
  ps.priority                   AS parent_priority,
  ps.is_emergency_contact,
  s.status                      AS student_status
FROM parents p
INNER JOIN users u_p        ON u_p.id = p.user_id
INNER JOIN parent_student ps ON ps.parent_id = p.id
INNER JOIN students s       ON s.id = ps.student_id
INNER JOIN users u_s        ON u_s.id = s.user_id
INNER JOIN classes c        ON c.id = s.class_id;

-- ------------------------------------------------------------
-- View: v_dashboard_stats
-- Per-establishment counts of students, parents, staff, classes, messages
-- ------------------------------------------------------------
DROP VIEW IF EXISTS `v_dashboard_stats`;
CREATE VIEW `v_dashboard_stats` AS
SELECT
  e.id                                                             AS establishment_id,
  e.name                                                           AS establishment_name,
  (SELECT COUNT(*) FROM students s  WHERE s.establishment_id = e.id AND s.status = 'active') AS total_students,
  (SELECT COUNT(*) FROM parents   p  WHERE p.establishment_id = e.id)                       AS total_parents,
  (SELECT COUNT(*) FROM staff     st WHERE st.establishment_id = e.id)                       AS total_staff,
  (SELECT COUNT(*) FROM classes   c  WHERE c.establishment_id = e.id AND c.is_active = 1)    AS total_classes,
  (SELECT COUNT(*) FROM messages  m  WHERE m.establishment_id = e.id)                       AS total_messages,
  (SELECT COUNT(*) FROM users     u  WHERE u.establishment_id = e.id AND u.is_active = 1)    AS total_users
FROM establishments e;

SET FOREIGN_KEY_CHECKS = 1;