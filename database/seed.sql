-- =============================================================
-- EduConnect - Demo Seed Data
-- Run AFTER educonnect.sql
-- =============================================================

USE educonnect;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- 1. Establishment
-- =============================================================
INSERT IGNORE INTO `establishments` (`id`, `name`, `slug`, `address`, `phone`, `email`, `max_students`, `is_active`) VALUES
(1, 'Groupe Scolaire La Réussite', 'groupe-scolaire-la-reussite', 'Cocody Riviera 3, Abidjan, Côte d’Ivoire', '+225 27 20 30 40 50', 'contact@lareussite.ci', 1500, 1);

-- =============================================================
-- 2. Classes (school_year 2025-2026)
-- =============================================================
INSERT IGNORE INTO `classes` (`id`, `establishment_id`, `name`, `level`, `section`, `capacity`, `school_year`, `is_active`) VALUES
(1, 1, '6ème A', '6ème', 'A', 45, '2025-2026', 1),
(2, 1, '6ème B', '6ème', 'B', 45, '2025-2026', 1),
(3, 1, '5ème A', '5ème', 'A', 45, '2025-2026', 1),
(4, 1, '5ème B', '5ème', 'B', 45, '2025-2026', 1),
(5, 1, '4ème A', '4ème', 'A', 40, '2025-2026', 1),
(6, 1, '3ème A', '3ème', 'A', 40, '2025-2026', 1);

-- =============================================================
-- 3. Users
-- =============================================================
-- bcrypt hash for "Admin@2026" (realistic $2b$10$ hash)
SET @bcrypt_hash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

INSERT IGNORE INTO `users` (`id`, `establishment_id`, `role_id`, `matricule`, `first_name`, `last_name`, `phone`, `phone_hash`, `email`, `password_hash`, `is_active`) VALUES
-- Super Admin (role_id=1)
(1,  1, 1, 'DIR-001',      'Ibrahim',    'Koné',       '+225 07 08 09 10 01', SHA2('+225 07 08 09 10 01', 256), 'directeur@lareussite.ci',    @bcrypt_hash, 1),
-- Admin (role_id=2)
(2,  1, 2, 'SEC-001',      'Mariam',     'Diallo',     '+225 07 08 09 10 02', SHA2('+225 07 08 09 10 02', 256), 'secretariat@lareussite.ci',  @bcrypt_hash, 1),
-- Parents (role_id=3)
(3,  1, 3, 'PAR-001',      'Awa',        'Touré',     '+225 07 11 22 33 44', SHA2('+225 07 11 22 33 44', 256), 'awa.toure@email.ci',         @bcrypt_hash, 1),
(4,  1, 3, 'PAR-002',      'Jean-Baptiste','Coulibaly', '+225 07 22 33 44 55', SHA2('+225 07 22 33 44 55', 256), 'jb.coulibaly@email.ci',      @bcrypt_hash, 1),
(5,  1, 3, 'PAR-003',      'Fatoumata',  'Konaté',    '+225 07 33 44 55 66', SHA2('+225 07 33 44 55 66', 256), 'f.konate@email.ci',          @bcrypt_hash, 1),
(6,  1, 3, 'PAR-004',      'Moussa',     'Diabaté',   '+225 07 44 55 66 77', SHA2('+225 07 44 55 66 77', 256), 'm.diabate@email.ci',         @bcrypt_hash, 1),
(7,  1, 3, 'PAR-005',      'Adjoua',     'Yao',       '+225 07 55 66 77 88', SHA2('+225 07 55 66 77 88', 256), 'a.yao@email.ci',             @bcrypt_hash, 1),
-- Students (role_id=4)
(8,  1, 4, 'ELE-2025-001', 'Aminata',    'Touré',     '+225 07 90 01 02 03', SHA2('+225 07 90 01 02 03', 256), 'aminata.toure@eleve.ci',     @bcrypt_hash, 1),
(9,  1, 4, 'ELE-2025-002', 'Oumar',      'Touré',     '+225 07 90 01 02 04', SHA2('+225 07 90 01 02 04', 256), 'oumar.toure@eleve.ci',       @bcrypt_hash, 1),
(10, 1, 4, 'ELE-2025-003', 'Kadiatou',   'Coulibaly',  '+225 07 90 02 03 04', SHA2('+225 07 90 02 03 04', 256), 'kadiatou.c@eleve.ci',        @bcrypt_hash, 1),
(11, 1, 4, 'ELE-2025-004', 'Ibrahim',    'Coulibaly',  '+225 07 90 02 03 05', SHA2('+225 07 90 02 03 05', 256), 'ibrahim.c@eleve.ci',         @bcrypt_hash, 1),
(12, 1, 4, 'ELE-2025-005', 'Aissatou',   'Konaté',    '+225 07 90 03 04 05', SHA2('+225 07 90 03 04 05', 256), 'aissatou.k@eleve.ci',        @bcrypt_hash, 1),
(13, 1, 4, 'ELE-2025-006', 'Seydou',     'Konaté',    '+225 07 90 03 04 06', SHA2('+225 07 90 03 04 06', 256), 'seydou.k@eleve.ci',          @bcrypt_hash, 1),
(14, 1, 4, 'ELE-2025-007', 'Mariam',     'Diabaté',   '+225 07 90 04 05 06', SHA2('+225 07 90 04 05 06', 256), 'mariam.d@eleve.ci',          @bcrypt_hash, 1),
(15, 1, 4, 'ELE-2025-008', 'Aboubacar',  'Diabaté',   '+225 07 90 04 05 07', SHA2('+225 07 90 04 05 07', 256), 'aboubacar.d@eleve.ci',       @bcrypt_hash, 1),
(16, 1, 4, 'ELE-2025-009', 'Fatou',      'Yao',       '+225 07 90 05 06 07', SHA2('+225 07 90 05 06 07', 256), 'fatou.yao@eleve.ci',         @bcrypt_hash, 1),
(17, 1, 4, 'ELE-2025-010', 'Koffi',      'Yao',       '+225 07 90 05 06 08', SHA2('+225 07 90 05 06 08', 256), 'koffi.yao@eleve.ci',         @bcrypt_hash, 1),
-- Staff (role_id=5)
(18, 1, 5, 'PER-001',      'Mamadou',    'Traoré',    '+225 07 60 01 02 03', SHA2('+225 07 60 01 02 03', 256), 'm.traore@lareussite.ci',     @bcrypt_hash, 1),
(19, 1, 5, 'PER-002',      'Aïssata',    'Bamba',      '+225 07 60 01 02 04', SHA2('+225 07 60 01 02 04', 256), 'a.bamba@lareussite.ci',      @bcrypt_hash, 1),
(20, 1, 5, 'PER-003',      'Félix',      'N’Guessan', '+225 07 60 01 02 05', SHA2('+225 07 60 01 02 05', 256), 'f.nguessan@lareussite.ci',   @bcrypt_hash, 1);

-- =============================================================
-- 4. Students detail records
-- =============================================================
INSERT IGNORE INTO `students` (`id`, `user_id`, `class_id`, `establishment_id`, `matricule_scolaire`, `admission_date`, `status`) VALUES
(1,  8,  1, 1, 'SCO-2025-001', '2025-09-01', 'active'),
(2,  9,  2, 1, 'SCO-2025-002', '2025-09-01', 'active'),
(3,  10, 1, 1, 'SCO-2025-003', '2025-09-01', 'active'),
(4,  11, 3, 1, 'SCO-2025-004', '2025-09-01', 'active'),
(5,  12, 4, 1, 'SCO-2025-005', '2025-09-01', 'active'),
(6,  13, 4, 1, 'SCO-2025-006', '2025-09-01', 'active'),
(7,  14, 5, 1, 'SCO-2025-007', '2025-09-01', 'active'),
(8,  15, 5, 1, 'SCO-2025-008', '2025-09-01', 'active'),
(9,  16, 6, 1, 'SCO-2025-009', '2025-09-01', 'active'),
(10, 17, 6, 1, 'SCO-2025-010', '2025-09-01', 'active');

-- =============================================================
-- 5. Parents detail records
-- =============================================================
INSERT IGNORE INTO `parents` (`id`, `user_id`, `establishment_id`, `profession`, `is_primary_contact`) VALUES
(1, 3, 1, 'Commerçante',       1),
(2, 4, 1, 'Enseignant',          1),
(3, 5, 1, 'Fonctionnaire',       1),
(4, 6, 1, 'Médecin',            1),
(5, 7, 1, 'Avocate',             1);

-- =============================================================
-- 6. Parent-Student links
-- =============================================================
INSERT IGNORE INTO `parent_student` (`parent_id`, `student_id`, `priority`, `is_emergency_contact`) VALUES
-- Parent 1 (Awa Touré) -> Aminata (student 1) & Oumar (student 2)
(1, 1, 'parent1', 1),
(1, 2, 'parent2', 0),
-- Parent 2 (Coulibaly) -> Kadiatou (student 3) & Ibrahim (student 4)
(2, 3, 'parent1', 1),
(2, 4, 'parent2', 1),
-- Parent 3 (Konaté) -> Aissatou (student 5) & Seydou (student 6)
(3, 5, 'parent1', 1),
(3, 6, 'parent2', 0),
-- Parent 4 (Diabaté) -> Mariam (student 7) & Aboubacar (student 8)
(4, 7, 'parent1', 1),
(4, 8, 'parent2', 1),
-- Parent 5 (Yao) -> Fatou (student 9) & Koffi (student 10)
(5, 9, 'parent1', 1),
(5, 10, 'parent2', 0);

-- =============================================================
-- 7. Staff detail records
-- =============================================================
INSERT IGNORE INTO `staff` (`id`, `user_id`, `establishment_id`, `role_title`, `department`) VALUES
(1, 18, 1, 'Censeur',              'Administration'),
(2, 19, 1, 'Surveillante Générale','Discipline'),
(3, 20, 1, 'Agent de Saisie',      'Informatique');

-- =============================================================
-- 8. Broadcast Groups
-- =============================================================
INSERT IGNORE INTO `groups` (`id`, `establishment_id`, `name`, `description`, `group_type`, `filters`, `is_active`) VALUES
(1, 1, 'Tous les Parents de 6ème A', 'Groupe de tous les parents des élèves de 6ème A', 'class',   '{"class_id": 1}',                                          1),
(2, 1, 'Tous les Parents',          'Ensemble des parents d\'élèves de l\'établissement',   'role',    '{"role": "PARENT"}',                                       1),
(3, 1, 'Tout le Personnel',         'Ensemble du personnel de l\'établissement',            'role',    '{"role": "STAFF"}',                                        1),
(4, 1, 'Toute l\'école',           'Tous les membres de la communauté scolaire',             'all_school', NULL,                                                  1),
(5, 1, 'Élèves de 5ème',           'Tous les élèves de niveau 5ème',                     'level',   '{"level": "5ème"}',                                    1);

-- =============================================================
-- 9. Group Members (Tous les Parents de 6ème A = parents of students in class 1)
-- =============================================================
INSERT IGNORE INTO `group_members` (`group_id`, `user_id`) VALUES
-- Parents of 6ème A students (Aminata & Kadiatou are in 6ème A -> class_id 1)
-- Student 1 (Aminata Touré) -> Parent 1 (Awa Touré)
-- Student 3 (Kadiatou Coulibaly) -> Parent 2 (Coulibaly)
(1, 3),
(1, 4),
-- Tous les Parents: all 5 parents
(2, 3), (2, 4), (2, 5), (2, 6), (2, 7),
-- Tout le Personnel: 3 staff
(3, 18), (3, 19), (3, 20),
-- Toute l'école : admins + parents + staff
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 18), (4, 19), (4, 20),
-- Élèves de 5ème: students in classes 3 & 4 -> users 11,12,13,14
(5, 11), (5, 12), (5, 13), (5, 14);

-- =============================================================
-- 10. Messages
-- =============================================================
INSERT IGNORE INTO `messages` (`id`, `establishment_id`, `sender_id`, `title`, `content`, `message_type`, `priority`, `status`, `scheduled_at`, `sent_at`) VALUES
-- Message 1: Text message (sent)
(1, 1, 1, 'Rentrée scolaire 2025-2026', 'Chers parents,\n\nNous vous informons que la rentrée scolaire 2025-2026 est fixée au lundi 8 septembre 2025. Les inscriptions sont déjà ouvertes au secrétariat.\n\nNous vous prions de vous présenter avec les documents suivants :\n- Extrait d\'acte de naissance\n- Certificat de scolarité\n- 4 photos d\'identité\n- Carnet de vaccination\n\nCordialement,\nLa Direction', 'text', 'important', 'sent', NULL, '2025-07-15 09:00:00'),

-- Message 2: Message with attachment (sent)
(2, 1, 2, 'Calendrier des examens du 1er trimestre', 'Bonjour,\n\nVeuillez trouver ci-joint le calendrier des évaluations du premier trimestre 2025-2026. Les examens débuteront le 15 décembre 2025.\n\nMerci de bien vouloir assurer le suivi de vos enfants.\n\nLe Secrétariat', 'pdf', 'normal', 'sent', NULL, '2025-09-20 14:30:00'),

-- Message 3: Scheduled message
(3, 1, 1, 'Réunion de parents - 3ème A', 'Chers parents des élèves de 3ème A,\n\nUne réunion parents-professeurs est programmée le samedi 25 octobre 2025 de 9h à 12h dans la salle des conférences.\n\nVotre présence est vivement souhaitée.\n\nMerci.\nLa Direction', 'text', 'urgent', 'scheduled', '2025-10-24 08:00:00', NULL);

-- =============================================================
-- 11. Message Attachments (for message 2)
-- =============================================================
INSERT IGNORE INTO `message_attachments` (`id`, `message_id`, `file_name`, `file_url`, `file_type`, `file_size`) VALUES
(1, 2, 'Calendrier_Examens_T1_2025-2026.pdf', '/uploads/attachments/calendrier_t1_2025.pdf', 'pdf', 524288);

-- =============================================================
-- 12. Message Recipients
-- =============================================================
INSERT IGNORE INTO `message_recipients` (`message_id`, `user_id`, `delivery_status`, `delivered_at`) VALUES
-- Message 1 recipients (all 5 parents + 3 staff)
(1, 3,  'delivered', '2025-07-15 09:00:30'),
(1, 4,  'delivered', '2025-07-15 09:00:31'),
(1, 5,  'delivered', '2025-07-15 09:00:32'),
(1, 6,  'delivered', '2025-07-15 09:00:33'),
(1, 7,  'delivered', '2025-07-15 09:00:34'),
(1, 18, 'delivered', '2025-07-15 09:00:35'),
(1, 19, 'delivered', '2025-07-15 09:00:36'),
(1, 20, 'delivered', '2025-07-15 09:00:37'),

-- Message 2 recipients (parents of 6ème A: user 3 & 4)
(2, 3,  'delivered', '2025-09-20 14:30:30'),
(2, 4,  'delivered', '2025-09-20 14:30:31'),
(2, 5,  'pending',  NULL),
(2, 6,  'pending',  NULL),
(2, 7,  'pending',  NULL),

-- Message 3 recipients (parents of 3ème A students -> parents 5)
-- Student 9 (Fatou Yao, class 6 = 3ème A) -> Parent 5 (Adjoua Yao)
(3, 7, 'pending', NULL);

-- =============================================================
-- 13. Message Reads
-- =============================================================
INSERT IGNORE INTO `message_reads` (`message_id`, `user_id`, `read_at`) VALUES
-- Reads for message 1
(1, 3,  '2025-07-15 10:15:00'),
(1, 4,  '2025-07-15 11:30:00'),
(1, 5,  '2025-07-15 14:00:00'),
(1, 18, '2025-07-15 09:30:00'),
(1, 19, '2025-07-15 10:00:00'),
-- Reads for message 2
(2, 3,  '2025-09-20 15:00:00'),
(2, 4,  '2025-09-20 16:30:00');

-- =============================================================
-- 14. Message Acknowledgements
-- =============================================================
INSERT IGNORE INTO `message_acknowledgements` (`message_id`, `user_id`, `acknowledged_at`) VALUES
(1, 3, '2025-07-15 10:20:00'),
(1, 4, '2025-07-15 11:35:00'),
(1, 5, '2025-07-15 14:10:00');

-- =============================================================
-- 15. Scheduled Messages (for message 3)
-- =============================================================
INSERT IGNORE INTO `scheduled_messages` (`id`, `establishment_id`, `message_id`, `scheduled_for`, `status`, `retry_count`, `last_attempt_at`, `error_message`) VALUES
(1, 1, 3, '2025-10-24 08:00:00', 'pending', 0, NULL, NULL);

-- =============================================================
-- 16. Notifications
-- =============================================================
INSERT IGNORE INTO `notifications` (`id`, `user_id`, `message_id`, `title`, `body`, `data`, `fcm_status`, `fcm_message_id`, `sent_at`) VALUES
-- Notification for message 1 -> Parent Awa Touré
(1, 3,  1, 'Nouveau message', 'Rentrée scolaire 2025-2026', '{"type": "new_message", "message_id": 1, "priority": "important"}', 'delivered', 'fcm-msg-001-abc', '2025-07-15 09:00:30'),
-- Notification for message 1 -> Parent Coulibaly
(2, 4,  1, 'Nouveau message', 'Rentrée scolaire 2025-2026', '{"type": "new_message", "message_id": 1, "priority": "important"}', 'delivered', 'fcm-msg-001-def', '2025-07-15 09:00:31'),
-- Notification for message 2 -> Parent Awa Touré
(3, 3,  2, 'Document partagé', 'Calendrier des examens du 1er trimestre', '{"type": "new_message", "message_id": 2, "has_attachment": true}', 'delivered', 'fcm-msg-002-ghi', '2025-09-20 14:30:30'),
-- Notification for message 1 -> Staff Traoré
(4, 18, 1, 'Nouveau message', 'Rentrée scolaire 2025-2026', '{"type": "new_message", "message_id": 1, "priority": "important"}', 'delivered', 'fcm-msg-001-jkl', '2025-07-15 09:00:35'),
-- Notification for message 2 -> Parent Coulibaly
(5, 4,  2, 'Document partagé', 'Calendrier des examens du 1er trimestre', '{"type": "new_message", "message_id": 2, "has_attachment": true}', 'delivered', 'fcm-msg-002-mno', '2025-09-20 14:30:31'),
-- Failed notification example
(6, 6,  2, 'Document partagé', 'Calendrier des examens du 1er trimestre', '{"type": "new_message", "message_id": 2, "has_attachment": true}', 'failed',   NULL,               '2025-09-20 14:30:33');

-- =============================================================
-- 17. Audit Logs (sample)
-- =============================================================
INSERT IGNORE INTO `audit_logs` (`establishment_id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `user_agent`) VALUES
(1, 1, 'LOGIN',             'user',         1,  '{"method": "credentials"}',                       '192.168.1.10',  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 1, 'CREATE_MESSAGE',    'message',      1,  '{"title": "Rentrée scolaire 2025-2026"}',        '192.168.1.10',  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 1, 'SEND_MESSAGE',      'message',      1,  '{"recipients_count": 8}',                          '192.168.1.10',  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 2, 'LOGIN',             'user',         2,  '{"method": "credentials"}',                       '192.168.1.25',  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(1, 2, 'CREATE_MESSAGE',    'message',      2,  '{"title": "Calendrier des examens du 1er trimestre"}', '192.168.1.25', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(1, 2, 'ATTACH_FILE',      'attachment',   1,  '{"file_name": "Calendrier_Examens_T1_2025-2026.pdf"}', '192.168.1.25', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(1, 1, 'SCHEDULE_MESSAGE',  'message',      3,  '{"scheduled_for": "2025-10-24 08:00:00"}',        '192.168.1.10',  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 3, 'READ_MESSAGE',      'message',      1,  NULL,                                                '192.168.2.50',  'Firebase-Android/23.0.0'),
(1, 4, 'READ_MESSAGE',      'message',      1,  NULL,                                                '192.168.2.75',  'Firebase-Android/23.0.0'),
(1, 3, 'ACKNOWLEDGE',       'message',      1,  NULL,                                                '192.168.2.50',  'Firebase-Android/23.0.0');

SET FOREIGN_KEY_CHECKS = 1;