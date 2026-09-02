-- =============================================================
-- EduConnect - Reset test-only data safely
-- This script does not drop tables. It only removes test rows.
-- =============================================================

USE educonnect;

SET FOREIGN_KEY_CHECKS = 0;

-- Target all clearly identifiable test accounts.
SET @test_email_list = 'superadmin@educonnect.test,secretariat@educonnect.test,parent.test@educonnect.test,eleve.test@educonnect.test,personnel.test@educonnect.test';

-- Remove dependent records first.
DELETE FROM `message_acknowledgements`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'superadmin@educonnect.test',
    'secretariat@educonnect.test',
    'parent.test@educonnect.test',
    'eleve.test@educonnect.test',
    'personnel.test@educonnect.test'
  )
);

DELETE FROM `message_reads`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'superadmin@educonnect.test',
    'secretariat@educonnect.test',
    'parent.test@educonnect.test',
    'eleve.test@educonnect.test',
    'personnel.test@educonnect.test'
  )
);

DELETE FROM `message_recipients`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'superadmin@educonnect.test',
    'secretariat@educonnect.test',
    'parent.test@educonnect.test',
    'eleve.test@educonnect.test',
    'personnel.test@educonnect.test'
  )
);

DELETE FROM `notifications`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'superadmin@educonnect.test',
    'secretariat@educonnect.test',
    'parent.test@educonnect.test',
    'eleve.test@educonnect.test',
    'personnel.test@educonnect.test'
  )
);

DELETE FROM `group_members`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'superadmin@educonnect.test',
    'secretariat@educonnect.test',
    'parent.test@educonnect.test',
    'eleve.test@educonnect.test',
    'personnel.test@educonnect.test'
  )
);

DELETE FROM `parent_student`
WHERE `parent_id` IN (
  SELECT `id` FROM `parents` WHERE `user_id` IN (
    SELECT `id` FROM `users` WHERE `email` IN (
      'parent.test@educonnect.test'
    )
  )
) OR `student_id` IN (
  SELECT `id` FROM `students` WHERE `user_id` IN (
    SELECT `id` FROM `users` WHERE `email` IN (
      'eleve.test@educonnect.test'
    )
  )
);

DELETE FROM `students`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'eleve.test@educonnect.test'
  )
);

DELETE FROM `parents`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'parent.test@educonnect.test'
  )
);

DELETE FROM `staff`
WHERE `user_id` IN (
  SELECT `id` FROM `users` WHERE `email` IN (
    'personnel.test@educonnect.test'
  )
);

DELETE FROM `groups`
WHERE `name` IN (
  'Test - Tous les parents',
  'Test - Tous les élèves',
  'Test - Personnel'
);

DELETE FROM `users`
WHERE `email` IN (
  'superadmin@educonnect.test',
  'secretariat@educonnect.test',
  'parent.test@educonnect.test',
  'eleve.test@educonnect.test',
  'personnel.test@educonnect.test'
);

-- Clean the test classes if they were previously materialized.
DELETE FROM `classes`
WHERE `establishment_id` = 1
  AND `name` IN ('Test 6ème A', 'Test 5ème A', 'Test 3ème A');

-- Clean the test establishment if it was created separately.
DELETE FROM `establishments`
WHERE `slug` = 'educonnect-test-campus';

SET FOREIGN_KEY_CHECKS = 1;

-- Re-insert the test seed data.
SOURCE ./seed_test.sql;
