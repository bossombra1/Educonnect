-- =============================================================
-- EduConnect - Test seed for authentication validation
-- Safe, identifiable accounts for admin web + mobile + OTP flows
-- =============================================================

USE educonnect;

SET FOREIGN_KEY_CHECKS = 0;

-- A single bcrypt hash for the shared test password:
-- EduConnect@2026!
-- Generated with bcryptjs 10 rounds.
SET @test_password_hash = '$2a$10$0fetJccMwS/uZzg61IFrnenpH2TSlOXMPbN4bIf7DLWIPtX5O.j2S';

-- Ensure the main establishment exists.
INSERT IGNORE INTO `establishments` (
  `id`, `name`, `slug`, `address`, `phone`, `email`, `max_students`, `is_active`
) VALUES (
  1,
  'EduConnect Test Campus',
  'educonnect-test-campus',
  'Abidjan, Côte d\'Ivoire',
  '+225 27 00 00 00 00',
  'contact@educonnect.test',
  500,
  1
);

-- Reusable test classes.
INSERT IGNORE INTO `classes` (
  `id`, `establishment_id`, `name`, `level`, `section`, `capacity`, `school_year`, `is_active`
) VALUES
  (1001, 1, 'Test 6ème A', '6ème', 'A', 40, '2025-2026', 1),
  (1002, 1, 'Test 5ème A', '5ème', 'A', 40, '2025-2026', 1),
  (1003, 1, 'Test 3ème A', '3ème', 'A', 40, '2025-2026', 1);

-- ------------------------------------------------------------------------------------------------
-- Users
-- IMPORTANT: admin web login uses email/password; mobile OTP uses matricule + phone.
-- ------------------------------------------------------------------------------------------------
INSERT IGNORE INTO `users` (
  `id`, `establishment_id`, `role_id`, `matricule`, `first_name`, `last_name`, `phone`, `phone_hash`, `email`, `password_hash`, `is_active`
) VALUES
  -- 1. Super Admin
  (1001, 1, 1, 'SA-2026-001', 'Super', 'Admin', '+225 07 00 00 00 01', SHA2('+225 07 00 00 00 01', 256), 'superadmin@educonnect.test', @test_password_hash, 1),
  -- 2. Admin / Secretariat
  (1002, 1, 2, 'SEC-2026-001', 'Secrétariat', 'Admin', '+225 07 00 00 00 02', SHA2('+225 07 00 00 00 02', 256), 'secretariat@educonnect.test', @test_password_hash, 1),
  -- 3. Parent
  (1003, 1, 3, 'PAR-2026-001', 'Parent', 'Test', '+225 07 00 00 00 03', SHA2('+225 07 00 00 00 03', 256), 'parent.test@educonnect.test', @test_password_hash, 1),
  -- 4. Student
  (1004, 1, 4, 'ELE-2026-001', 'Élève', 'Test', '+225 07 00 00 00 04', SHA2('+225 07 00 00 00 04', 256), 'eleve.test@educonnect.test', @test_password_hash, 1),
  -- 5. Personnel
  (1005, 1, 5, 'PER-2026-001', 'Personnel', 'Test', '+225 07 00 00 00 05', SHA2('+225 07 00 00 00 05', 256), 'personnel.test@educonnect.test', @test_password_hash, 1);

-- ------------------------------------------------------------------------------------------------
-- Role-specific profiles
-- ------------------------------------------------------------------------------------------------
INSERT IGNORE INTO `students` (
  `id`, `user_id`, `class_id`, `establishment_id`, `matricule_scolaire`, `admission_date`, `status`
) VALUES
  (1001, 1004, 1002, 1, 'SCO-TEST-001', '2025-09-01', 'active');

INSERT IGNORE INTO `parents` (
  `id`, `user_id`, `establishment_id`, `profession`, `is_primary_contact`
) VALUES
  (1001, 1003, 1, 'Fonctionnaire', 1);

INSERT IGNORE INTO `staff` (
  `id`, `user_id`, `establishment_id`, `role_title`, `department`
) VALUES
  (1001, 1005, 1, 'Agent de soutien', 'Administration');

-- ------------------------------------------------------------------------------------------------
-- Optional minimal parent/student link for testing parent profile screens
-- ------------------------------------------------------------------------------------------------
INSERT IGNORE INTO `parent_student` (
  `id`, `parent_id`, `student_id`, `priority`, `is_emergency_contact`
) VALUES
  (1001, 1001, 1001, 'parent1', 1);

-- ------------------------------------------------------------------------------------------------
-- Optional groups for UI smoke tests on admin screens
-- ------------------------------------------------------------------------------------------------
INSERT IGNORE INTO `groups` (
  `id`, `establishment_id`, `name`, `description`, `group_type`, `filters`, `is_active`
) VALUES
  (1001, 1, 'Test - Tous les parents', 'Test group for parents', 'role', '{"role": "PARENT"}', 1),
  (1002, 1, 'Test - Tous les élèves', 'Test group for students', 'role', '{"role": "STUDENT"}', 1),
  (1003, 1, 'Test - Personnel', 'Test group for staff', 'role', '{"role": "STAFF"}', 1);

INSERT IGNORE INTO `group_members` (
  `group_id`, `user_id`
) VALUES
  (1001, 1003),
  (1002, 1004),
  (1003, 1005);

SET FOREIGN_KEY_CHECKS = 1;
