-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : ven. 04 sep. 2026 à 00:15
-- Version du serveur : 8.4.7
-- Version de PHP : 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `educonnect`
--

-- --------------------------------------------------------

--
-- Structure de la table `administrators`
--

DROP TABLE IF EXISTS `administrators`;
CREATE TABLE IF NOT EXISTS `administrators` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `role_type` enum('SUPER_ADMIN','ADMIN','SECRETARIAT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ADMIN',
  `can_manage_users` tinyint(1) NOT NULL DEFAULT '1',
  `can_send_broadcast` tinyint(1) NOT NULL DEFAULT '1',
  `can_view_audit` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_admin_user` (`user_id`),
  KEY `idx_admin_role` (`role_type`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `administrators`
--

INSERT INTO `administrators` (`id`, `user_id`, `role_type`, `can_manage_users`, `can_send_broadcast`, `can_view_audit`, `created_at`, `updated_at`) VALUES
(1, 1, 'SUPER_ADMIN', 1, 1, 1, '2026-08-31 18:54:01', '2026-08-31 18:54:01'),
(2, 2, 'SECRETARIAT', 1, 1, 0, '2026-08-31 18:54:01', '2026-08-31 18:54:01');

-- --------------------------------------------------------

--
-- Structure de la table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED DEFAULT NULL,
  `user_id` int UNSIGNED DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int UNSIGNED DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Supports IPv6',
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user_created` (`user_id`,`created_at`),
  KEY `idx_audit_action_created` (`action`,`created_at`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `establishment_id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 1, 'LOGIN', 'user', 1, '{\"method\": \"credentials\"}', '192.168.1.10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(2, 1, 1, 'CREATE_MESSAGE', 'message', 1, '{\"title\": \"Rentrée scolaire 2025-2026\"}', '192.168.1.10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(3, 1, 1, 'SEND_MESSAGE', 'message', 1, '{\"recipients_count\": 8}', '192.168.1.10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(4, 1, 2, 'LOGIN', 'user', 2, '{\"method\": \"credentials\"}', '192.168.1.25', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(5, 1, 2, 'CREATE_MESSAGE', 'message', 2, '{\"title\": \"Calendrier des examens du 1er trimestre\"}', '192.168.1.25', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(6, 1, 2, 'ATTACH_FILE', 'attachment', 1, '{\"file_name\": \"Calendrier_Examens_T1_2025-2026.pdf\"}', '192.168.1.25', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(7, 1, 1, 'SCHEDULE_MESSAGE', 'message', 3, '{\"scheduled_for\": \"2025-10-24 08:00:00\"}', '192.168.1.10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '2026-09-01 17:48:03'),
(8, 1, 3, 'READ_MESSAGE', 'message', 1, NULL, '192.168.2.50', 'Firebase-Android/23.0.0', '2026-09-01 17:48:03'),
(9, 1, 4, 'READ_MESSAGE', 'message', 1, NULL, '192.168.2.75', 'Firebase-Android/23.0.0', '2026-09-01 17:48:03'),
(10, 1, 3, 'ACKNOWLEDGE', 'message', 1, NULL, '192.168.2.50', 'Firebase-Android/23.0.0', '2026-09-01 17:48:03'),
(11, NULL, 1, 'LOGIN', 'USER', NULL, NULL, NULL, NULL, '2026-09-01 19:57:07'),
(12, NULL, 1, 'LOGIN', 'USER', NULL, NULL, NULL, NULL, '2026-09-02 18:57:18'),
(13, NULL, 2, 'LOGIN', 'USER', NULL, NULL, NULL, NULL, '2026-09-02 19:04:27'),
(14, NULL, 1, 'LOGIN', 'USER', NULL, NULL, NULL, NULL, '2026-09-02 19:05:42'),
(15, NULL, 2, 'LOGIN', 'USER', NULL, NULL, NULL, NULL, '2026-09-02 19:07:48'),
(16, NULL, 1, 'LOGIN', 'USER', NULL, NULL, NULL, NULL, '2026-09-03 09:53:41');

-- --------------------------------------------------------

--
-- Structure de la table `classes`
--

DROP TABLE IF EXISTS `classes`;
CREATE TABLE IF NOT EXISTS `classes` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity` int UNSIGNED DEFAULT NULL,
  `school_year` varchar(9) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_classes_establishment_name_year` (`establishment_id`,`name`,`school_year`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `classes`
--

INSERT INTO `classes` (`id`, `establishment_id`, `name`, `level`, `section`, `capacity`, `school_year`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, '6ème A', '6ème', 'A', 45, '2025-2026', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(2, 1, '6ème B', '6ème', 'B', 45, '2025-2026', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(3, 1, '5ème A', '5ème', 'A', 45, '2025-2026', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(4, 1, '5ème B', '5ème', 'B', 45, '2025-2026', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(5, 1, '4ème A', '4ème', 'A', 40, '2025-2026', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(6, 1, '3ème A', '3ème', 'A', 40, '2025-2026', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(7, 1, 'Terminale ', 'Terminale', 'D', 40, '2025-2026', 1, '2026-09-03 11:48:35', '2026-09-03 11:48:35'),
(8, 1, '3ème C', '3ème C', NULL, NULL, '2025-2026', 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53'),
(9, 1, '5ème C', '5ème C', NULL, NULL, '2025-2026', 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09'),
(10, 1, '4ème B', '4ème B', NULL, NULL, '2025-2026', 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10'),
(11, 1, '3ème B', '3ème B', NULL, NULL, '2025-2026', 1, '2026-09-04 00:06:11', '2026-09-04 00:06:11');

-- --------------------------------------------------------

--
-- Structure de la table `establishments`
--

DROP TABLE IF EXISTS `establishments`;
CREATE TABLE IF NOT EXISTS `establishments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_students` int UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_establishments_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `establishments`
--

INSERT INTO `establishments` (`id`, `name`, `slug`, `logo_url`, `address`, `phone`, `email`, `max_students`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'GROUPE COFE-CESA', 'groupe-scolaire-la-reussite', '/uploads/1788466553233-795999651.jpg', 'Cocody Riviera 3, Abidjan, Côte d’Ivoire', '+225 27 20 30 40 50', 'contact@lareussite.ci', 1500, 1, '2026-09-01 17:48:00', '2026-09-03 20:16:30');

-- --------------------------------------------------------

--
-- Structure de la table `groups`
--

DROP TABLE IF EXISTS `groups`;
CREATE TABLE IF NOT EXISTS `groups` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_type` enum('class','level','role','custom','all_school') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom',
  `filters` json DEFAULT NULL COMMENT 'Dynamic filter criteria',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_groups_establishment` (`establishment_id`),
  KEY `idx_groups_type` (`group_type`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `groups`
--

INSERT INTO `groups` (`id`, `establishment_id`, `name`, `description`, `group_type`, `filters`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Tous les Parents de 6ème A', 'Groupe de tous les parents des élèves de 6ème A', 'class', '{\"level\": \"5ème\"}', 1, '2026-09-01 17:48:02', '2026-09-03 11:49:35'),
(2, 1, 'Tous les Parents', 'Ensemble des parents d\'élèves de l\'établissement', 'role', '{\"role\": \"PARENT\"}', 1, '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(3, 1, 'Tout le Personnel', 'Ensemble du personnel de l\'établissement', 'role', '{\"role\": \"STAFF\"}', 1, '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(4, 1, 'Toute l\'école', 'Tous les membres de la communauté scolaire', 'all_school', NULL, 1, '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(5, 1, 'Élèves de 5ème', 'Tous les élèves de niveau 5ème', 'level', '{\"level\": \"5ème\"}', 1, '2026-09-01 17:48:02', '2026-09-01 17:48:02');

-- --------------------------------------------------------

--
-- Structure de la table `group_members`
--

DROP TABLE IF EXISTS `group_members`;
CREATE TABLE IF NOT EXISTS `group_members` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_members_group_user` (`group_id`,`user_id`),
  KEY `idx_group_members_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `group_members`
--

INSERT INTO `group_members` (`id`, `group_id`, `user_id`, `created_at`) VALUES
(1, 1, 3, '2026-09-01 17:48:02'),
(2, 1, 4, '2026-09-01 17:48:02'),
(3, 2, 3, '2026-09-01 17:48:02'),
(4, 2, 4, '2026-09-01 17:48:02'),
(5, 2, 5, '2026-09-01 17:48:02'),
(6, 2, 6, '2026-09-01 17:48:02'),
(7, 2, 7, '2026-09-01 17:48:02'),
(8, 3, 18, '2026-09-01 17:48:02'),
(9, 3, 19, '2026-09-01 17:48:02'),
(10, 3, 20, '2026-09-01 17:48:02'),
(11, 4, 1, '2026-09-01 17:48:02'),
(12, 4, 2, '2026-09-01 17:48:02'),
(13, 4, 3, '2026-09-01 17:48:02'),
(14, 4, 4, '2026-09-01 17:48:02'),
(15, 4, 5, '2026-09-01 17:48:02'),
(16, 4, 6, '2026-09-01 17:48:02'),
(17, 4, 7, '2026-09-01 17:48:02'),
(18, 4, 18, '2026-09-01 17:48:02'),
(19, 4, 19, '2026-09-01 17:48:02'),
(20, 4, 20, '2026-09-01 17:48:02'),
(21, 5, 11, '2026-09-01 17:48:02'),
(22, 5, 12, '2026-09-01 17:48:02'),
(23, 5, 13, '2026-09-01 17:48:02'),
(24, 5, 14, '2026-09-01 17:48:02');

-- --------------------------------------------------------

--
-- Structure de la table `imports`
--

DROP TABLE IF EXISTS `imports`;
CREATE TABLE IF NOT EXISTS `imports` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_rows` int UNSIGNED DEFAULT '0',
  `imported_rows` int UNSIGNED DEFAULT '0',
  `failed_rows` int UNSIGNED DEFAULT '0',
  `status` enum('pending','processing','completed','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_log` text COLLATE utf8mb4_unicode_ci,
  `imported_by` int UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_imports_establishment` (`establishment_id`),
  KEY `idx_imports_status` (`status`),
  KEY `fk_imports_user` (`imported_by`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `imports`
--

INSERT INTO `imports` (`id`, `establishment_id`, `filename`, `file_url`, `total_rows`, `imported_rows`, `failed_rows`, `status`, `error_log`, `imported_by`, `created_at`) VALUES
(1, 1, 'import.xlsx', 'uploads/import-1788471894258.xlsx', 5, 5, 0, 'completed', NULL, 1, '2026-09-03 21:44:54'),
(2, 1, 'import.xlsx', 'uploads/import-1788475823496.xlsx', 5, 0, 5, 'failed', '[{\"row\":5,\"message\":\"Matricule déjà existant: ELV001\"},{\"row\":6,\"message\":\"Matricule déjà existant: ELV002\"},{\"row\":7,\"message\":\"Matricule déjà existant: ELV003\"},{\"row\":8,\"message\":\"Matricule déjà existant: ELV004\"},{\"row\":9,\"message\":\"Matricule déjà existant: ELV005\"}]', 1, '2026-09-03 22:50:23'),
(3, 1, 'import.xlsx', 'uploads/import-1788480371990.xlsx', 8, 8, 0, 'completed', NULL, 1, '2026-09-04 00:06:11');

-- --------------------------------------------------------

--
-- Structure de la table `messages`
--

DROP TABLE IF EXISTS `messages`;
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED NOT NULL,
  `sender_id` int UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text','image','pdf','link','circular') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `priority` enum('normal','important','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `status` enum('draft','scheduled','sent','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `scheduled_at` datetime DEFAULT NULL COMMENT 'Nullable DATETIME for scheduling',
  `sent_at` datetime DEFAULT NULL COMMENT 'Nullable DATETIME for send tracking',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_establishment_status` (`establishment_id`,`status`),
  KEY `idx_messages_scheduled_at` (`scheduled_at`),
  KEY `idx_messages_sender` (`sender_id`),
  KEY `idx_messages_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `messages`
--

INSERT INTO `messages` (`id`, `establishment_id`, `sender_id`, `title`, `content`, `message_type`, `priority`, `status`, `scheduled_at`, `sent_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Rentrée scolaire 2025-2026', 'Chers parents,\n\nNous vous informons que la rentrée scolaire 2025-2026 est fixée au lundi 8 septembre 2025. Les inscriptions sont déjà ouvertes au secrétariat.\n\nNous vous prions de vous présenter avec les documents suivants :\n- Extrait d\'acte de naissance\n- Certificat de scolarité\n- 4 photos d\'identité\n- Carnet de vaccination\n\nCordialement,\nLa Direction', 'text', 'important', 'sent', NULL, '2025-07-15 09:00:00', '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(2, 1, 2, 'Calendrier des examens du 1er trimestre', 'Bonjour,\n\nVeuillez trouver ci-joint le calendrier des évaluations du premier trimestre 2025-2026. Les examens débuteront le 15 décembre 2025.\n\nMerci de bien vouloir assurer le suivi de vos enfants.\n\nLe Secrétariat', 'pdf', 'normal', 'sent', NULL, '2025-09-20 14:30:00', '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(3, 1, 1, 'Réunion de parents - 3ème A', 'Chers parents des élèves de 3ème A,\n\nUne réunion parents-professeurs est programmée le samedi 25 octobre 2025 de 9h à 12h dans la salle des conférences.\n\nVotre présence est vivement souhaitée.\n\nMerci.\nLa Direction', 'text', 'urgent', 'sent', '2025-10-24 08:00:00', '2026-09-01 18:24:01', '2026-09-01 17:48:02', '2026-09-01 18:24:01'),
(4, 1, 1, 'Réunion des Parents', 'bonjours chères parents', 'text', 'normal', 'sent', NULL, '2026-09-03 12:35:33', '2026-09-03 12:35:33', '2026-09-03 12:35:33'),
(5, 1, 1, 'EXAMEN DE SESSIONS', 'vous avez un examen', 'text', 'important', 'scheduled', '2026-09-05 10:00:00', NULL, '2026-09-03 12:36:50', '2026-09-03 12:36:50'),
(6, 1, 1, 'EXAMEN DE SESSIONS', 'vous avez un exam', 'text', 'important', 'sent', NULL, '2026-09-03 12:41:33', '2026-09-03 12:41:33', '2026-09-03 12:41:33'),
(7, 1, 1, 'COMPO', 'COMPOSITIONS', 'text', 'normal', 'scheduled', '2026-09-07 10:10:00', NULL, '2026-09-03 13:21:05', '2026-09-03 13:21:05');

-- --------------------------------------------------------

--
-- Structure de la table `message_acknowledgements`
--

DROP TABLE IF EXISTS `message_acknowledgements`;
CREATE TABLE IF NOT EXISTS `message_acknowledgements` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `acknowledged_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_msg_ack_msg_user` (`message_id`,`user_id`),
  KEY `idx_mack_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `message_acknowledgements`
--

INSERT INTO `message_acknowledgements` (`id`, `message_id`, `user_id`, `acknowledged_at`, `created_at`) VALUES
(1, 1, 3, '2025-07-15 10:20:00', '2026-09-01 17:48:03'),
(2, 1, 4, '2025-07-15 11:35:00', '2026-09-01 17:48:03'),
(3, 1, 5, '2025-07-15 14:10:00', '2026-09-01 17:48:03');

-- --------------------------------------------------------

--
-- Structure de la table `message_attachments`
--

DROP TABLE IF EXISTS `message_attachments`;
CREATE TABLE IF NOT EXISTS `message_attachments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` int UNSIGNED NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` enum('image','pdf','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `file_size` int UNSIGNED DEFAULT NULL COMMENT 'File size in bytes',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ma_message` (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `message_attachments`
--

INSERT INTO `message_attachments` (`id`, `message_id`, `file_name`, `file_url`, `file_type`, `file_size`, `created_at`) VALUES
(1, 2, 'Calendrier_Examens_T1_2025-2026.pdf', '/uploads/attachments/calendrier_t1_2025.pdf', 'pdf', 524288, '2026-09-01 17:48:02'),
(2, 7, 'Elements#8 - Collection _ OpenSea.jpg', 'D:\\EduConnect\\backend\\uploads\\1788441665522-17978328.jpg', 'image', 12973, '2026-09-03 13:21:05');

-- --------------------------------------------------------

--
-- Structure de la table `message_reads`
--

DROP TABLE IF EXISTS `message_reads`;
CREATE TABLE IF NOT EXISTS `message_reads` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `read_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_reads_msg_user` (`message_id`,`user_id`),
  KEY `idx_mreads_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `message_reads`
--

INSERT INTO `message_reads` (`id`, `message_id`, `user_id`, `read_at`, `created_at`) VALUES
(1, 1, 3, '2025-07-15 10:15:00', '2026-09-01 17:48:03'),
(2, 1, 4, '2025-07-15 11:30:00', '2026-09-01 17:48:03'),
(3, 1, 5, '2025-07-15 14:00:00', '2026-09-01 17:48:03'),
(4, 1, 18, '2025-07-15 09:30:00', '2026-09-01 17:48:03'),
(5, 1, 19, '2025-07-15 10:00:00', '2026-09-01 17:48:03'),
(6, 2, 3, '2025-09-20 15:00:00', '2026-09-01 17:48:03'),
(7, 2, 4, '2025-09-20 16:30:00', '2026-09-01 17:48:03');

-- --------------------------------------------------------

--
-- Structure de la table `message_recipients`
--

DROP TABLE IF EXISTS `message_recipients`;
CREATE TABLE IF NOT EXISTS `message_recipients` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `delivery_status` enum('pending','delivered','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_recipients_msg_user` (`message_id`,`user_id`),
  KEY `idx_mr_user` (`user_id`),
  KEY `idx_mr_status` (`delivery_status`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `message_recipients`
--

INSERT INTO `message_recipients` (`id`, `message_id`, `user_id`, `delivery_status`, `delivered_at`, `created_at`) VALUES
(1, 1, 3, 'delivered', '2025-07-15 09:00:30', '2026-09-01 17:48:03'),
(2, 1, 4, 'delivered', '2025-07-15 09:00:31', '2026-09-01 17:48:03'),
(3, 1, 5, 'delivered', '2025-07-15 09:00:32', '2026-09-01 17:48:03'),
(4, 1, 6, 'delivered', '2025-07-15 09:00:33', '2026-09-01 17:48:03'),
(5, 1, 7, 'delivered', '2025-07-15 09:00:34', '2026-09-01 17:48:03'),
(6, 1, 18, 'delivered', '2025-07-15 09:00:35', '2026-09-01 17:48:03'),
(7, 1, 19, 'delivered', '2025-07-15 09:00:36', '2026-09-01 17:48:03'),
(8, 1, 20, 'delivered', '2025-07-15 09:00:37', '2026-09-01 17:48:03'),
(9, 2, 3, 'delivered', '2025-09-20 14:30:30', '2026-09-01 17:48:03'),
(10, 2, 4, 'delivered', '2025-09-20 14:30:31', '2026-09-01 17:48:03'),
(11, 2, 5, 'pending', NULL, '2026-09-01 17:48:03'),
(12, 2, 6, 'pending', NULL, '2026-09-01 17:48:03'),
(13, 2, 7, 'pending', NULL, '2026-09-01 17:48:03'),
(14, 3, 7, 'pending', NULL, '2026-09-01 17:48:03'),
(15, 4, 3, 'pending', NULL, '2026-09-03 12:35:33'),
(16, 4, 4, 'pending', NULL, '2026-09-03 12:35:33'),
(17, 5, 14, 'pending', NULL, '2026-09-03 12:36:50'),
(18, 5, 15, 'pending', NULL, '2026-09-03 12:36:50'),
(19, 6, 3, 'pending', NULL, '2026-09-03 12:41:33'),
(20, 6, 4, 'pending', NULL, '2026-09-03 12:41:33'),
(21, 6, 5, 'pending', NULL, '2026-09-03 12:41:33'),
(22, 6, 6, 'pending', NULL, '2026-09-03 12:41:33'),
(23, 6, 7, 'pending', NULL, '2026-09-03 12:41:33'),
(24, 7, 16, 'pending', NULL, '2026-09-03 13:21:05'),
(25, 7, 17, 'pending', NULL, '2026-09-03 13:21:05'),
(26, 7, 21, 'pending', NULL, '2026-09-03 13:21:05');

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `message_id` int UNSIGNED DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `data` json DEFAULT NULL COMMENT 'Additional payload data',
  `fcm_status` enum('pending','sent','delivered','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `fcm_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_created` (`user_id`,`created_at`),
  KEY `idx_notifications_message` (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `message_id`, `title`, `body`, `data`, `fcm_status`, `fcm_message_id`, `sent_at`, `created_at`) VALUES
(1, 3, 1, 'Nouveau message', 'Rentrée scolaire 2025-2026', '{\"type\": \"new_message\", \"priority\": \"important\", \"message_id\": 1}', 'delivered', 'fcm-msg-001-abc', '2025-07-15 09:00:30', '2026-09-01 17:48:03'),
(2, 4, 1, 'Nouveau message', 'Rentrée scolaire 2025-2026', '{\"type\": \"new_message\", \"priority\": \"important\", \"message_id\": 1}', 'delivered', 'fcm-msg-001-def', '2025-07-15 09:00:31', '2026-09-01 17:48:03'),
(3, 3, 2, 'Document partagé', 'Calendrier des examens du 1er trimestre', '{\"type\": \"new_message\", \"message_id\": 2, \"has_attachment\": true}', 'delivered', 'fcm-msg-002-ghi', '2025-09-20 14:30:30', '2026-09-01 17:48:03'),
(4, 18, 1, 'Nouveau message', 'Rentrée scolaire 2025-2026', '{\"type\": \"new_message\", \"priority\": \"important\", \"message_id\": 1}', 'delivered', 'fcm-msg-001-jkl', '2025-07-15 09:00:35', '2026-09-01 17:48:03'),
(5, 4, 2, 'Document partagé', 'Calendrier des examens du 1er trimestre', '{\"type\": \"new_message\", \"message_id\": 2, \"has_attachment\": true}', 'delivered', 'fcm-msg-002-mno', '2025-09-20 14:30:31', '2026-09-01 17:48:03'),
(6, 6, 2, 'Document partagé', 'Calendrier des examens du 1er trimestre', '{\"type\": \"new_message\", \"message_id\": 2, \"has_attachment\": true}', 'failed', NULL, '2025-09-20 14:30:33', '2026-09-01 17:48:03'),
(7, 21, NULL, 'Allô', 'comment vous allez ?', NULL, 'pending', NULL, '2026-09-03 13:32:14', '2026-09-03 13:32:14'),
(8, 22, NULL, 'Allô', 'comment vous allez ?', NULL, 'pending', NULL, '2026-09-03 13:32:14', '2026-09-03 13:32:14'),
(9, 23, NULL, 'Allô', 'comment vous allez ?', NULL, 'pending', NULL, '2026-09-03 13:32:14', '2026-09-03 13:32:14'),
(10, 3, NULL, 'salut', 'salutations', NULL, 'pending', NULL, '2026-09-03 13:33:21', '2026-09-03 13:33:21'),
(11, 4, NULL, 'salut', 'salutations', NULL, 'pending', NULL, '2026-09-03 13:33:21', '2026-09-03 13:33:21'),
(12, 5, NULL, 'salut', 'salutations', NULL, 'pending', NULL, '2026-09-03 13:33:21', '2026-09-03 13:33:21'),
(13, 6, NULL, 'salut', 'salutations', NULL, 'pending', NULL, '2026-09-03 13:33:21', '2026-09-03 13:33:21'),
(14, 7, NULL, 'salut', 'salutations', NULL, 'pending', NULL, '2026-09-03 13:33:21', '2026-09-03 13:33:21'),
(15, 23, NULL, 'bien', 'en forme', NULL, 'pending', NULL, '2026-09-03 13:33:50', '2026-09-03 13:33:50'),
(16, 22, NULL, 'viens', 'je viens', NULL, 'pending', NULL, '2026-09-03 13:34:19', '2026-09-03 13:34:19'),
(17, 23, NULL, 'viens', 'je viens', NULL, 'pending', NULL, '2026-09-03 13:34:19', '2026-09-03 13:34:19'),
(18, 3, NULL, 'Développeur web PHP', 'hauteur', NULL, 'pending', NULL, '2026-09-03 13:49:21', '2026-09-03 13:49:21'),
(19, 4, NULL, 'Développeur web PHP', 'hauteur', NULL, 'pending', NULL, '2026-09-03 13:49:21', '2026-09-03 13:49:21'),
(20, 5, NULL, 'Développeur web PHP', 'hauteur', NULL, 'pending', NULL, '2026-09-03 13:49:21', '2026-09-03 13:49:21'),
(21, 6, NULL, 'Développeur web PHP', 'hauteur', NULL, 'pending', NULL, '2026-09-03 13:49:21', '2026-09-03 13:49:21'),
(22, 7, NULL, 'Développeur web PHP', 'hauteur', NULL, 'pending', NULL, '2026-09-03 13:49:21', '2026-09-03 13:49:21'),
(23, 3, NULL, 'Développeur HTML', 'HTML', NULL, 'pending', NULL, '2026-09-03 13:52:33', '2026-09-03 13:52:33'),
(24, 4, NULL, 'Développeur HTML', 'HTML', NULL, 'pending', NULL, '2026-09-03 13:52:33', '2026-09-03 13:52:33');

-- --------------------------------------------------------

--
-- Structure de la table `parents`
--

DROP TABLE IF EXISTS `parents`;
CREATE TABLE IF NOT EXISTS `parents` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `establishment_id` int UNSIGNED NOT NULL,
  `profession` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary_contact` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parents_user` (`user_id`),
  KEY `idx_parents_establishment` (`establishment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `parents`
--

INSERT INTO `parents` (`id`, `user_id`, `establishment_id`, `profession`, `is_primary_contact`, `created_at`, `updated_at`) VALUES
(1, 3, 1, 'Commerçante', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(2, 4, 1, 'Enseignant', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(3, 5, 1, 'Fonctionnaire', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(4, 6, 1, 'Médecin', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(5, 7, 1, 'Avocate', 1, '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(6, 22, 1, NULL, 0, '2026-09-03 11:46:18', '2026-09-03 11:46:18'),
(7, 25, 1, NULL, 1, '2026-09-03 21:44:49', '2026-09-03 21:44:49'),
(8, 26, 1, NULL, 0, '2026-09-03 21:44:50', '2026-09-03 21:44:50'),
(9, 28, 1, NULL, 1, '2026-09-03 21:44:52', '2026-09-03 21:44:52'),
(10, 29, 1, NULL, 0, '2026-09-03 21:44:52', '2026-09-03 21:44:52'),
(11, 31, 1, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53'),
(12, 32, 1, NULL, 0, '2026-09-03 21:44:53', '2026-09-03 21:44:53'),
(13, 34, 1, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53'),
(14, 35, 1, NULL, 0, '2026-09-03 21:44:53', '2026-09-03 21:44:53'),
(15, 37, 1, NULL, 1, '2026-09-03 21:44:54', '2026-09-03 21:44:54'),
(16, 39, 1, NULL, 1, '2026-09-04 00:06:07', '2026-09-04 00:06:07'),
(17, 40, 1, NULL, 0, '2026-09-04 00:06:07', '2026-09-04 00:06:07'),
(18, 42, 1, NULL, 1, '2026-09-04 00:06:08', '2026-09-04 00:06:08'),
(19, 43, 1, NULL, 0, '2026-09-04 00:06:08', '2026-09-04 00:06:08'),
(20, 45, 1, NULL, 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09'),
(21, 46, 1, NULL, 0, '2026-09-04 00:06:09', '2026-09-04 00:06:09'),
(22, 48, 1, NULL, 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09'),
(23, 49, 1, NULL, 0, '2026-09-04 00:06:09', '2026-09-04 00:06:09'),
(24, 51, 1, NULL, 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10'),
(25, 53, 1, NULL, 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10'),
(26, 54, 1, NULL, 0, '2026-09-04 00:06:10', '2026-09-04 00:06:10'),
(27, 56, 1, NULL, 1, '2026-09-04 00:06:11', '2026-09-04 00:06:11'),
(28, 57, 1, NULL, 0, '2026-09-04 00:06:11', '2026-09-04 00:06:11'),
(29, 59, 1, NULL, 1, '2026-09-04 00:06:11', '2026-09-04 00:06:11');

-- --------------------------------------------------------

--
-- Structure de la table `parent_student`
--

DROP TABLE IF EXISTS `parent_student`;
CREATE TABLE IF NOT EXISTS `parent_student` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` int UNSIGNED NOT NULL,
  `student_id` int UNSIGNED NOT NULL,
  `priority` enum('parent1','parent2') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'parent1',
  `is_emergency_contact` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_student_priority` (`parent_id`,`student_id`,`priority`),
  KEY `idx_parent_student_student` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `parent_student`
--

INSERT INTO `parent_student` (`id`, `parent_id`, `student_id`, `priority`, `is_emergency_contact`, `created_at`) VALUES
(1, 1, 1, 'parent1', 1, '2026-09-01 17:48:01'),
(2, 1, 2, 'parent2', 0, '2026-09-01 17:48:01'),
(3, 2, 3, 'parent1', 1, '2026-09-01 17:48:01'),
(4, 2, 4, 'parent2', 1, '2026-09-01 17:48:01'),
(5, 3, 5, 'parent1', 1, '2026-09-01 17:48:01'),
(6, 3, 6, 'parent2', 0, '2026-09-01 17:48:01'),
(7, 4, 7, 'parent1', 1, '2026-09-01 17:48:01'),
(8, 4, 8, 'parent2', 1, '2026-09-01 17:48:01'),
(9, 5, 9, 'parent1', 1, '2026-09-01 17:48:01'),
(10, 5, 10, 'parent2', 0, '2026-09-01 17:48:01'),
(11, 7, 12, 'parent1', 1, '2026-09-03 21:44:50'),
(12, 8, 12, 'parent2', 0, '2026-09-03 21:44:51'),
(13, 9, 13, 'parent1', 1, '2026-09-03 21:44:52'),
(14, 10, 13, 'parent2', 0, '2026-09-03 21:44:52'),
(15, 11, 14, 'parent1', 1, '2026-09-03 21:44:53'),
(16, 12, 14, 'parent2', 0, '2026-09-03 21:44:53'),
(17, 13, 15, 'parent1', 1, '2026-09-03 21:44:53'),
(18, 14, 15, 'parent2', 0, '2026-09-03 21:44:53'),
(19, 15, 16, 'parent1', 1, '2026-09-03 21:44:54'),
(20, 16, 17, 'parent1', 1, '2026-09-04 00:06:07'),
(21, 17, 17, 'parent2', 0, '2026-09-04 00:06:07'),
(22, 18, 18, 'parent1', 1, '2026-09-04 00:06:08'),
(23, 19, 18, 'parent2', 0, '2026-09-04 00:06:08'),
(24, 20, 19, 'parent1', 1, '2026-09-04 00:06:09'),
(25, 21, 19, 'parent2', 0, '2026-09-04 00:06:09'),
(26, 22, 20, 'parent1', 1, '2026-09-04 00:06:09'),
(27, 23, 20, 'parent2', 0, '2026-09-04 00:06:09'),
(28, 24, 21, 'parent1', 1, '2026-09-04 00:06:10'),
(29, 25, 22, 'parent1', 1, '2026-09-04 00:06:10'),
(30, 26, 22, 'parent2', 0, '2026-09-04 00:06:10'),
(31, 27, 23, 'parent1', 1, '2026-09-04 00:06:11'),
(32, 28, 23, 'parent2', 0, '2026-09-04 00:06:11'),
(33, 29, 24, 'parent1', 1, '2026-09-04 00:06:11');

-- --------------------------------------------------------

--
-- Structure de la table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pr_user` (`user_id`),
  KEY `idx_pr_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `push_tokens`
--

DROP TABLE IF EXISTS `push_tokens`;
CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `expo_push_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_os` enum('ANDROID','IOS','WEB') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ANDROID',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_token` (`user_id`,`expo_push_token`),
  KEY `idx_pt_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `roles`
--

INSERT INTO `roles` (`id`, `name`, `label`, `description`, `level`, `created_at`) VALUES
(1, 'SUPER_ADMIN', 'Super Administrateur', 'Accès complet à la plateforme', 100, '2026-09-01 17:37:11'),
(2, 'ADMIN', 'Administrateur', 'Gestion de l\'établissement', 80, '2026-09-01 17:37:11'),
(3, 'PARENT', 'Parent', 'Parent d\'élève', 20, '2026-09-01 17:37:11'),
(4, 'STUDENT', 'Élève', 'Élève inscrit', 10, '2026-09-01 17:37:11'),
(5, 'STAFF', 'Personnel', 'Personnel de l\'établissement', 30, '2026-09-01 17:37:11');

-- --------------------------------------------------------

--
-- Structure de la table `scheduled_messages`
--

DROP TABLE IF EXISTS `scheduled_messages`;
CREATE TABLE IF NOT EXISTS `scheduled_messages` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED NOT NULL,
  `message_id` int UNSIGNED NOT NULL,
  `scheduled_for` datetime NOT NULL,
  `status` enum('pending','processing','sent','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `retry_count` int UNSIGNED NOT NULL DEFAULT '0',
  `last_attempt_at` datetime DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sm_establishment` (`establishment_id`),
  KEY `idx_sm_scheduled_for` (`scheduled_for`),
  KEY `idx_sm_status` (`status`),
  KEY `fk_sm_message` (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `scheduled_messages`
--

INSERT INTO `scheduled_messages` (`id`, `establishment_id`, `message_id`, `scheduled_for`, `status`, `retry_count`, `last_attempt_at`, `error_message`, `created_at`, `updated_at`) VALUES
(1, 1, 3, '2025-10-24 08:00:00', 'sent', 0, '2026-09-01 18:24:01', NULL, '2026-09-01 17:48:03', '2026-09-01 18:24:01'),
(2, 1, 5, '2026-09-05 10:00:00', 'pending', 0, NULL, NULL, '2026-09-03 12:36:50', '2026-09-03 12:36:50'),
(3, 1, 7, '2026-09-07 10:10:00', 'pending', 0, NULL, NULL, '2026-09-03 13:21:05', '2026-09-03 13:21:05');

-- --------------------------------------------------------

--
-- Structure de la table `staff`
--

DROP TABLE IF EXISTS `staff`;
CREATE TABLE IF NOT EXISTS `staff` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `establishment_id` int UNSIGNED NOT NULL,
  `role_title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_staff_user` (`user_id`),
  KEY `idx_staff_establishment` (`establishment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `staff`
--

INSERT INTO `staff` (`id`, `user_id`, `establishment_id`, `role_title`, `department`, `created_at`, `updated_at`) VALUES
(1, 18, 1, 'Censeur', 'Administration', '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(2, 19, 1, 'Surveillante Générale', 'Discipline', '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(3, 20, 1, 'Agent de Saisie', 'Informatique', '2026-09-01 17:48:02', '2026-09-01 17:48:02'),
(4, 23, 1, 'Proff d\'Algo', 'Informatique', '2026-09-03 11:47:35', '2026-09-03 11:47:35');

-- --------------------------------------------------------

--
-- Structure de la table `students`
--

DROP TABLE IF EXISTS `students`;
CREATE TABLE IF NOT EXISTS `students` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `class_id` int UNSIGNED NOT NULL,
  `establishment_id` int UNSIGNED NOT NULL,
  `matricule_scolaire` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admission_date` date DEFAULT NULL,
  `status` enum('active','transferred','graduated','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_students_user` (`user_id`),
  KEY `idx_students_class` (`class_id`),
  KEY `idx_students_establishment` (`establishment_id`),
  KEY `idx_students_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `students`
--

INSERT INTO `students` (`id`, `user_id`, `class_id`, `establishment_id`, `matricule_scolaire`, `admission_date`, `status`, `created_at`, `updated_at`) VALUES
(1, 8, 1, 1, 'SCO-2025-001', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(2, 9, 2, 1, 'SCO-2025-002', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(3, 10, 1, 1, 'SCO-2025-003', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(4, 11, 3, 1, 'SCO-2025-004', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(5, 12, 4, 1, 'SCO-2025-005', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(6, 13, 4, 1, 'SCO-2025-006', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(7, 14, 5, 1, 'SCO-2025-007', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(8, 15, 5, 1, 'SCO-2025-008', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(9, 16, 6, 1, 'SCO-2025-009', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(10, 17, 6, 1, 'SCO-2025-010', '2025-09-01', 'active', '2026-09-01 17:48:01', '2026-09-01 17:48:01'),
(11, 21, 6, 1, '13095862M', NULL, 'active', '2026-09-03 11:45:11', '2026-09-03 11:45:11'),
(12, 24, 1, 1, 'ELV001', '2025-09-01', 'active', '2026-09-03 21:44:49', '2026-09-03 21:44:49'),
(13, 27, 4, 1, 'ELV002', '2025-09-01', 'active', '2026-09-03 21:44:51', '2026-09-03 21:44:51'),
(14, 30, 5, 1, 'ELV003', '2025-09-01', 'active', '2026-09-03 21:44:52', '2026-09-03 21:44:52'),
(15, 33, 8, 1, 'ELV004', '2025-09-01', 'active', '2026-09-03 21:44:53', '2026-09-03 21:44:53'),
(16, 36, 2, 1, 'ELV005', '2025-09-01', 'active', '2026-09-03 21:44:54', '2026-09-03 21:44:54'),
(17, 38, 1, 1, 'ELV202601', '2025-09-01', 'active', '2026-09-04 00:06:07', '2026-09-04 00:06:07'),
(18, 41, 2, 1, 'ELV202602', '2025-09-01', 'active', '2026-09-04 00:06:08', '2026-09-04 00:06:08'),
(19, 44, 3, 1, 'ELV202603', '2025-09-01', 'active', '2026-09-04 00:06:08', '2026-09-04 00:06:08'),
(20, 47, 9, 1, 'ELV202604', '2025-09-01', 'active', '2026-09-04 00:06:09', '2026-09-04 00:06:09'),
(21, 50, 5, 1, 'ELV202605', '2025-09-01', 'active', '2026-09-04 00:06:10', '2026-09-04 00:06:10'),
(22, 52, 10, 1, 'ELV202606', '2025-09-01', 'active', '2026-09-04 00:06:10', '2026-09-04 00:06:10'),
(23, 55, 6, 1, 'ELV202607', '2025-09-01', 'active', '2026-09-04 00:06:11', '2026-09-04 00:06:11'),
(24, 58, 11, 1, 'ELV202608', '2025-09-01', 'active', '2026-09-04 00:06:11', '2026-09-04 00:06:11');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `establishment_id` int UNSIGNED DEFAULT NULL,
  `role_id` int UNSIGNED NOT NULL,
  `matricule` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Hashed phone for RGPD compliance',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fcm_token` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expires_at` datetime DEFAULT NULL,
  `otp_verified` tinyint(1) DEFAULT '0',
  `device_type` enum('android','ios','web') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `otp_attempts` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `otp_requested_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_matricule` (`matricule`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_establishment` (`establishment_id`),
  KEY `idx_users_role` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `establishment_id`, `role_id`, `matricule`, `first_name`, `last_name`, `phone`, `phone_hash`, `email`, `password_hash`, `avatar_url`, `fcm_token`, `otp_code`, `otp_expires_at`, `otp_verified`, `device_type`, `last_login_at`, `is_active`, `created_at`, `updated_at`, `otp_attempts`, `otp_requested_at`) VALUES
(1, 1, 1, 'DIR-001', 'Ibrahim', 'Koné', '+225 07 08 09 10 01', '99f93a92c3e6a92f295b7a0b9edce05eae4c6cad04270fb6b1bce27001212541', 'directeur@lareussite.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-03 09:53:39', 1, '2026-09-01 17:48:01', '2026-09-03 09:53:39', 0, NULL),
(2, 1, 2, 'SEC-001', 'Mariam', 'Diallo', '+225 07 08 09 10 02', 'b72106ab954a3a4b02057eba764d46c1efbc0719f27ef994adbe825091363c78', 'secretariat@lareussite.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, '2026-09-02 19:07:48', 1, '2026-09-01 17:48:01', '2026-09-02 19:07:48', 0, NULL),
(3, 1, 3, 'PAR-001', 'Awa', 'Touré', '+225 07 11 22 33 44', 'b1b08ae9a8f2b65350541e7149a8b9e19492d467cc586bf8a6f46a8b86fec25c', 'awa.toure@email.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(4, 1, 3, 'PAR-002', 'Jean-Baptiste', 'Coulibaly', '+225 07 22 33 44 55', 'a9eb14907e10707cc36cc51dc19b39a19089fd3d35e4b0ffd8b3c14073304c8a', 'jb.coulibaly@email.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(5, 1, 3, 'PAR-003', 'Fatoumata', 'Konaté', '+225 07 33 44 55 66', '4786558439ead7e7a515a6f18c40f870a4e8013b25552a1684cbd47792381cf9', 'f.konate@email.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(6, 1, 3, 'PAR-004', 'Moussa', 'Diabaté', '+225 07 44 55 66 77', 'c42cbed00b8f3bdbeda24a457050edde4560e695c0297dfaabf89bec12aa3a8c', 'm.diabate@email.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(7, 1, 3, 'PAR-005', 'Adjoua', 'Yao', '+225 07 55 66 77 88', '063216e1e23105a37cba9086cab5c247dcf42eb74fefd2b643c700f7b9cc9564', 'a.yao@email.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(8, 1, 4, 'ELE-2025-001', 'Aminata', 'Touré', '+225 07 90 01 02 03', 'a9086141fe0567cb1722adc3ed2a40cf23f4accd0c8fd5bf50d93454af9e9abd', 'aminata.toure@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(9, 1, 4, 'ELE-2025-002', 'Oumar', 'Touré', '+225 07 90 01 02 04', '3f430bf62daa448bb065a78c67581fa87ad53aba10812547d0ccbce0766dca2b', 'oumar.toure@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(10, 1, 4, 'ELE-2025-003', 'Kadiatou', 'Coulibaly', '+225 07 90 02 03 04', '7bad228c51fdb019f11ce452c2c5d2689ae43479eb2e9992794bc1f3e448f0ad', 'kadiatou.c@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(11, 1, 4, 'ELE-2025-004', 'Ibrahim', 'Coulibaly', '+225 07 90 02 03 05', '5630b617abda5e618052e88b044b017241a58620bda9229889788b4581132609', 'ibrahim.c@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(12, 1, 4, 'ELE-2025-005', 'Aissatou', 'Konaté', '+225 07 90 03 04 05', '505a3a2d3496b4a1764c212819d97e4a12b233ed056baaaca8e51f5dc86ba9a1', 'aissatou.k@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(13, 1, 4, 'ELE-2025-006', 'Seydou', 'Konaté', '+225 07 90 03 04 06', '4cbe9dfb1685cadce3da47cac7cdfbcd2a0a822af42c4ef68b696224e857418d', 'seydou.k@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(14, 1, 4, 'ELE-2025-007', 'Mariam', 'Diabaté', '+225 07 90 04 05 06', '862791c0c07a9f471dc70d431a442075f0e17333c61a5b54cf236932654fd9c9', 'mariam.d@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(15, 1, 4, 'ELE-2025-008', 'Aboubacar', 'Diabaté', '+225 07 90 04 05 07', 'bf188aced919dbfc2bf9626c412f6b210b7431e015b8e9e8d2f0e3a70ac92847', 'aboubacar.d@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(16, 1, 4, 'ELE-2025-009', 'Fatou', 'Yao', '+225 07 90 05 06 07', 'cb01612f0fabb966ed038e6a5f7d5f6ce35c13306b3ffda6a270d1d23793a8bd', 'fatou.yao@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(17, 1, 4, 'ELE-2025-010', 'Koffi', 'Yao', '+225 07 90 05 06 08', '7cf361be8f2079bcee922637b36e37a3a50f074cd52f97d64519df498e580b71', 'koffi.yao@eleve.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(18, 1, 5, 'PER-001', 'Mamadou', 'Traoré', '+225 07 60 01 02 03', 'de222528e551b342dce7fad7ce3d03b16da922716fe4996364e8c6ff3b37ef8d', 'm.traore@lareussite.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(19, 1, 5, 'PER-002', 'Aïssata', 'Bamba', '+225 07 60 01 02 04', '0bbe64d489010c2e1d476ec226438336ae8dc340536d3d40e79c9e134a71f436', 'a.bamba@lareussite.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(20, 1, 5, 'PER-003', 'Félix', 'N’Guessan', '+225 07 60 01 02 05', '3f1010e222b99958cc30368f7439ef3ce8834b0942356b7cac3645d36653f438', 'f.nguessan@lareussite.ci', '$2a$10$8DdJ2FhpIKi5Ba9xBUhkxuzARstkiENdyQSmufTwy0kw8vDOq8uta', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-01 17:48:01', '2026-09-01 19:21:34', 0, NULL),
(21, 1, 4, '13095862M', 'BOSSOMBRA', 'KOUAME', '0747363816', NULL, 'regiskouame09@gmail.com', '$2a$10$msNzNHGM8pTYPYQOhRL5YeA3H3RbedKKvkV8.VFObQdHvCrJ/Zfa6', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 11:45:10', '2026-09-03 11:45:10', 0, NULL),
(22, 1, 3, 'PAR-1788435978303-744387', 'BOSSOMBRA', 'ERIC', '0747363816', NULL, 'regiskouame@gmail.com', '$2a$10$69QftoUHd3wYI4QKgVigYeE.PtbiFY57bsmzn9eud5OFnLLAeBq3y', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 11:46:18', '2026-09-03 11:46:18', 0, NULL),
(23, 1, 5, 'STF-1788436055669-002585', 'Regis', 'Kouame', '0717873421', NULL, 'regis@gmail.com', '$2a$10$RyY0PLlLlOCaxq5xBNHEg.yr8asd8wxjyVQmB1vO7dkUNsmp2LI1m', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 11:47:35', '2026-09-03 11:47:35', 0, NULL),
(24, 1, 4, 'ELV001', 'Jean-Philippe', 'KOUASSI', NULL, NULL, NULL, '$2a$10$ZltA2ssoOWWybP.d9D2/YOdM4nClMd91Tu7ISJNDLwlQY6GEfhr0m', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:48', '2026-09-03 21:44:48', 0, NULL),
(25, 1, 3, 'P-ELV001', 'Parent', 'KOUASSI', '0708123456', NULL, NULL, '$2a$10$ZA9BviesD67aN3/N3Yrrre6hkvM/F94uVVCgMGNEgxXHR3aWaBjkq', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:49', '2026-09-03 21:44:49', 0, NULL),
(26, 1, 3, 'P2-ELV001', 'Parent', 'KOUASSI', '0501234567', NULL, NULL, '$2a$10$AhsPUsgf9gic1YVh/v3BF.9NbO0awTSWCakMnW6z4EKbhKZ8CwqXC', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:50', '2026-09-03 21:44:50', 0, NULL),
(27, 1, 4, 'ELV002', 'Ahou Marie', 'KONAN', NULL, NULL, NULL, '$2a$10$ykcxXesdT4bgyloDB13GiuGvcjDrznu5cG2oqRRFI3tKWArAlrd9e', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:51', '2026-09-03 21:44:51', 0, NULL),
(28, 1, 3, 'P-ELV002', 'Parent', 'KONAN', '0759876543', NULL, NULL, '$2a$10$lzqsPcewq0zXkOjQKD3DJei6fq2/o6J001.V55kgFRH.UWkl8WSXi', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:51', '2026-09-03 21:44:51', 0, NULL),
(29, 1, 3, 'P2-ELV002', 'Parent', 'KONAN', '0140112233', NULL, NULL, '$2a$10$gaFaoSsc4EbHMl5F/byc4.dMy.PJJQbrHAE9Gb56RvruwlvK1ocHq', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:52', '2026-09-03 21:44:52', 0, NULL),
(30, 1, 4, 'ELV003', 'Sékou', 'DIABATÉ', NULL, NULL, NULL, '$2a$10$KGicrxJJy6jql7bV4TqSwuDn/iV3AXOcpb38G1x5/9vGcX.t.wTka', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:52', '2026-09-03 21:44:52', 0, NULL),
(31, 1, 3, 'P-ELV003', 'Parent', 'DIABATÉ', '0544332211', NULL, NULL, '$2a$10$ton2r1RLBDVRjhnBhchRFefrUgNsyaoQRlQiRluV4WdKRZJEhitAS', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53', 0, NULL),
(32, 1, 3, 'P2-ELV003', 'Parent', 'DIABATÉ', '0707889900', NULL, NULL, '$2a$10$JpNBqYYtMaSRqZAPCO7wZu1a9/op3We4JJXHiJJenwydXjFgd0TZ.', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53', 0, NULL),
(33, 1, 4, 'ELV004', 'Fatoumata', 'BAMBA', NULL, NULL, NULL, '$2a$10$BikPgg5SmyolIQuww2U3Oe5S6hOBDJ16oJa1ky6eaDetrJm7nj8TO', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53', 0, NULL),
(34, 1, 3, 'P-ELV004', 'Parent', 'BAMBA', '0102030405', NULL, NULL, '$2a$10$U/sV.3ycc5YIimCd7yySduSNea6VBCs1sU/whSsV4N1w2RtUWoc0a', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53', 0, NULL),
(35, 1, 3, 'P2-ELV004', 'Parent', 'BAMBA', '0555667788', NULL, NULL, '$2a$10$soj0uu7YDDz/a7t5prdY.ems4Za./9tE6HDhIkKulRMwcSkGnKAMi', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53', 0, NULL),
(36, 1, 4, 'ELV005', 'Kevine Stephane', 'YAPO', NULL, NULL, NULL, '$2a$10$q5UhZkHjIb9YDF5FKOC/2eBEzsqxLg6/yrSxMr3goCOzMztMSuz1m', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:53', '2026-09-03 21:44:53', 0, NULL),
(37, 1, 3, 'P-ELV005', 'Parent', 'YAPO', '0748991122', NULL, NULL, '$2a$10$iz618jMe1BUzP/WPLG7Q.e1CcSH8AlkjrPs9IEfJZHg4gUebhjn2u', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-03 21:44:54', '2026-09-03 21:44:54', 0, NULL),
(38, 1, 4, 'ELV202601', 'Koffi Alexis', 'KOUAMÉ', NULL, NULL, NULL, '$2a$10$frMdBw52Sy/2us2JJw06NOONAV4yHOGigyLO05t8PYbO2DITJSQx2', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:07', '2026-09-04 00:06:07', 0, NULL),
(39, 1, 3, 'P-ELV202601', 'Parent', 'KOUAMÉ', '0708991122', NULL, NULL, '$2a$10$ldXtk5yQbXTnw..jwbmEvuht2TRDvRAL4CqUmgzvrLVCweIw/0KUO', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:07', '2026-09-04 00:06:07', 0, NULL),
(40, 1, 3, 'P2-ELV202601', 'Parent', 'KOUAMÉ', '0501223344', NULL, NULL, '$2a$10$1Q9hGluY5yDFyZ3TeJhdX.YVJcWcwUApym/7sZzWip6es8Dphb3oS', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:07', '2026-09-04 00:06:07', 0, NULL),
(41, 1, 4, 'ELV202602', 'Ahou Sandrine', 'TANO', NULL, NULL, NULL, '$2a$10$d1sSIdrVihssT2PmVNgmkehg.B4ZStY2JxxGJDGjQfUv.NHXRdzl.', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:08', '2026-09-04 00:06:08', 0, NULL),
(42, 1, 3, 'P-ELV202602', 'Parent', 'TANO', '0759112233', NULL, NULL, '$2a$10$1mvu0.uPsYQKIJkG9i71bucCDwnhheQwDewP5zH0SHxdJFoGcSED6', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:08', '2026-09-04 00:06:08', 0, NULL),
(43, 1, 3, 'P2-ELV202602', 'Parent', 'TANO', '0140223344', NULL, NULL, '$2a$10$8YrtAJvyxHiZn2Tf/7cWae1KRE07kJXrLVTTGhDgnKJpRtcbyNWru', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:08', '2026-09-04 00:06:08', 0, NULL),
(44, 1, 4, 'ELV202603', 'Kouassi Fabrice', 'N\'DRI', NULL, NULL, NULL, '$2a$10$3PKAKVw88bku0aAtpPszFezotKIiu8dH2UlZo8frIbzZeTdfOjpzi', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:08', '2026-09-04 00:06:08', 0, NULL),
(45, 1, 3, 'P-ELV202603', 'Parent', 'N\'DRI', '0544556677', NULL, NULL, '$2a$10$jxKPof41Ilbxdkjxedr4/u1HAXvy1s0tJ/klrEHo0MEuvwnO5Gm/W', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:08', '2026-09-04 00:06:08', 0, NULL),
(46, 1, 3, 'P2-ELV202603', 'Parent', 'N\'DRI', '0707112233', NULL, NULL, '$2a$10$yTUI2LThBpcP1Z8HHMuyv.lWo1lBBokWtZlvy9GUA77x0EY1VsSvS', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09', 0, NULL),
(47, 1, 4, 'ELV202604', 'Mariam', 'SYLLA', NULL, NULL, NULL, '$2a$10$xIqtzhXRq6Cd1JdlnXwijuDVZlvetKIVb15j6xGv8PUQALrYNqvjW', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09', 0, NULL),
(48, 1, 3, 'P-ELV202604', 'Parent', 'SYLLA', '0102334455', NULL, NULL, '$2a$10$v6ngmwajCkF3e98m8eCnp.Dw0EabFb.rIIqvLZ8ud5jm/h4fICSUu', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09', 0, NULL),
(49, 1, 3, 'P2-ELV202604', 'Parent', 'SYLLA', '0555112233', NULL, NULL, '$2a$10$vREbxK4XRo.WFRzQSyqmSOomI2VS1iZyT3X3CGJw78zs099BesQzi', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:09', '2026-09-04 00:06:09', 0, NULL),
(50, 1, 4, 'ELV202605', 'Yao Constant', 'KOFFI', NULL, NULL, NULL, '$2a$10$8RENu/Ncn3daeTKxdSU9bOcS7oSMzQnnE8/6HvrDdbRCS3I.fcCEe', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10', 0, NULL),
(51, 1, 3, 'P-ELV202605', 'Parent', 'KOFFI', '0748112233', NULL, NULL, '$2a$10$/SDOgyu1jb2ZmdUP7gnwsuMJCKWVHgUqSjMxDhQyqVD1i4oyYUv1u', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10', 0, NULL),
(52, 1, 4, 'ELV202606', 'Oumar', 'CISSE', NULL, NULL, NULL, '$2a$10$y.L7L2UKaaY8kxATUSPjuuBdOaKZH5u09OxRAUhji70kTTYp0Lce2', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10', 0, NULL),
(53, 1, 3, 'P-ELV202606', 'Parent', 'CISSE', '0505889900', NULL, NULL, '$2a$10$FyUfpGq4aU4btngUNknznuflvEVgI31V2ydEm7ubbHmWp5tYegDgO', NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '2026-09-04 00:06:10', '2026-09-04 00:07:48', 0, NULL),
(54, 1, 3, 'P2-ELV202606', 'Parent', 'CISSE', '0177223344', NULL, NULL, '$2a$10$y5cgMTyQMVL206JQ1jQhIeWc3bUV1RDcwQTpqlzFXLuzG/oSHmVCK', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:10', '2026-09-04 00:06:10', 0, NULL),
(55, 1, 4, 'ELV202607', 'Aïcha', 'BAMBA', NULL, NULL, NULL, '$2a$10$KfyfhK/W5ea09alBwGEcmOoMnPpmyJzYGGbsEr.WhykbM2zjRa6T2', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:11', '2026-09-04 00:06:11', 0, NULL),
(56, 1, 3, 'P-ELV202607', 'Parent', 'BAMBA', '0701998877', NULL, NULL, '$2a$10$f3/O3GDb8B1S/YlIULHWyuc3Ds8gDH.8ByS9pDX3oqvXyIJXIirCq', NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, '2026-09-04 00:06:11', '2026-09-04 00:07:31', 0, NULL),
(57, 1, 3, 'P2-ELV202607', 'Parent', 'BAMBA', '0545223344', NULL, 'BAMBA@gmail.com', '$2a$10$NaJ72NtdSGMJZXUk2BJUNeHl9CmXmjct5sPXLCVM0FpUWo6lP7g0a', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:11', '2026-09-04 00:08:22', 0, NULL),
(58, 1, 4, 'ELV202608', 'Kouao Stéphane', 'ADOU', NULL, NULL, NULL, '$2a$10$5bnueu7bj7mi2YZxQFgoIu40M6QTN18b9czjLOEHz6x0aW3YB5/72', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:11', '2026-09-04 00:06:11', 0, NULL),
(59, 1, 3, 'P-ELV202608', 'Parent', 'ADOU', '0141889900', NULL, NULL, '$2a$10$dnDNDwrGHwNUlw9gReZEdes2u9cG/BeyJ86alVUDCLQtwfS5dXbvu', NULL, NULL, NULL, NULL, 0, NULL, NULL, 1, '2026-09-04 00:06:11', '2026-09-04 00:06:11', 0, NULL);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_dashboard_stats`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `v_dashboard_stats`;
CREATE TABLE IF NOT EXISTS `v_dashboard_stats` (
`establishment_id` int unsigned
,`establishment_name` varchar(255)
,`total_classes` bigint
,`total_messages` bigint
,`total_parents` bigint
,`total_staff` bigint
,`total_students` bigint
,`total_users` bigint
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_message_read_stats`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `v_message_read_stats`;
CREATE TABLE IF NOT EXISTS `v_message_read_stats` (
`acknowledged_count` bigint
,`created_at` timestamp
,`delivered_count` decimal(23,0)
,`failed_count` decimal(23,0)
,`message_id` int unsigned
,`message_status` enum('draft','scheduled','sent','archived')
,`message_type` enum('text','image','pdf','link','circular')
,`pending_count` decimal(23,0)
,`read_count` bigint
,`read_percentage` decimal(26,2)
,`title` varchar(255)
,`total_recipients` bigint
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_parent_children`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `v_parent_children`;
CREATE TABLE IF NOT EXISTS `v_parent_children` (
`class_id` int unsigned
,`class_level` varchar(50)
,`class_name` varchar(100)
,`class_section` varchar(10)
,`is_emergency_contact` tinyint(1)
,`matricule_scolaire` varchar(50)
,`parent_email` varchar(255)
,`parent_first_name` varchar(100)
,`parent_id` int unsigned
,`parent_last_name` varchar(100)
,`parent_phone` varchar(30)
,`parent_priority` enum('parent1','parent2')
,`student_first_name` varchar(100)
,`student_id` int unsigned
,`student_last_name` varchar(100)
,`student_status` enum('active','transferred','graduated','suspended')
);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `users`
--
ALTER TABLE `users` ADD FULLTEXT KEY `ft_users_name` (`first_name`,`last_name`);

-- --------------------------------------------------------

--
-- Structure de la vue `v_dashboard_stats`
--
DROP TABLE IF EXISTS `v_dashboard_stats`;

DROP VIEW IF EXISTS `v_dashboard_stats`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_dashboard_stats`  AS SELECT `e`.`id` AS `establishment_id`, `e`.`name` AS `establishment_name`, (select count(0) from `students` `s` where ((`s`.`establishment_id` = `e`.`id`) and (`s`.`status` = 'active'))) AS `total_students`, (select count(0) from `parents` `p` where (`p`.`establishment_id` = `e`.`id`)) AS `total_parents`, (select count(0) from `staff` `st` where (`st`.`establishment_id` = `e`.`id`)) AS `total_staff`, (select count(0) from `classes` `c` where ((`c`.`establishment_id` = `e`.`id`) and (`c`.`is_active` = 1))) AS `total_classes`, (select count(0) from `messages` `m` where (`m`.`establishment_id` = `e`.`id`)) AS `total_messages`, (select count(0) from `users` `u` where ((`u`.`establishment_id` = `e`.`id`) and (`u`.`is_active` = 1))) AS `total_users` FROM `establishments` AS `e` ;

-- --------------------------------------------------------

--
-- Structure de la vue `v_message_read_stats`
--
DROP TABLE IF EXISTS `v_message_read_stats`;

DROP VIEW IF EXISTS `v_message_read_stats`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_message_read_stats`  AS SELECT `m`.`id` AS `message_id`, `m`.`title` AS `title`, `m`.`message_type` AS `message_type`, `m`.`status` AS `message_status`, `m`.`created_at` AS `created_at`, count(distinct `mr`.`id`) AS `total_recipients`, sum((case when (`mr`.`delivery_status` = 'delivered') then 1 else 0 end)) AS `delivered_count`, sum((case when (`mr`.`delivery_status` = 'failed') then 1 else 0 end)) AS `failed_count`, sum((case when (`mr`.`delivery_status` = 'pending') then 1 else 0 end)) AS `pending_count`, count(distinct `rd`.`id`) AS `read_count`, count(distinct `ak`.`id`) AS `acknowledged_count`, (case when (count(distinct `mr`.`id`) > 0) then round(((count(distinct `rd`.`id`) * 100.0) / count(distinct `mr`.`id`)),2) else 0.00 end) AS `read_percentage` FROM (((`messages` `m` left join `message_recipients` `mr` on((`mr`.`message_id` = `m`.`id`))) left join `message_reads` `rd` on((`rd`.`message_id` = `m`.`id`))) left join `message_acknowledgements` `ak` on((`ak`.`message_id` = `m`.`id`))) GROUP BY `m`.`id`, `m`.`title`, `m`.`message_type`, `m`.`status`, `m`.`created_at` ;

-- --------------------------------------------------------

--
-- Structure de la vue `v_parent_children`
--
DROP TABLE IF EXISTS `v_parent_children`;

DROP VIEW IF EXISTS `v_parent_children`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_parent_children`  AS SELECT `p`.`id` AS `parent_id`, `u_p`.`first_name` AS `parent_first_name`, `u_p`.`last_name` AS `parent_last_name`, `u_p`.`phone` AS `parent_phone`, `u_p`.`email` AS `parent_email`, `s`.`id` AS `student_id`, `u_s`.`first_name` AS `student_first_name`, `u_s`.`last_name` AS `student_last_name`, `s`.`matricule_scolaire` AS `matricule_scolaire`, `c`.`id` AS `class_id`, `c`.`name` AS `class_name`, `c`.`level` AS `class_level`, `c`.`section` AS `class_section`, `ps`.`priority` AS `parent_priority`, `ps`.`is_emergency_contact` AS `is_emergency_contact`, `s`.`status` AS `student_status` FROM (((((`parents` `p` join `users` `u_p` on((`u_p`.`id` = `p`.`user_id`))) join `parent_student` `ps` on((`ps`.`parent_id` = `p`.`id`))) join `students` `s` on((`s`.`id` = `ps`.`student_id`))) join `users` `u_s` on((`u_s`.`id` = `s`.`user_id`))) join `classes` `c` on((`c`.`id` = `s`.`class_id`))) ;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `administrators`
--
ALTER TABLE `administrators`
  ADD CONSTRAINT `fk_admin_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `fk_classes_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `fk_groups_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `group_members`
--
ALTER TABLE `group_members`
  ADD CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_gm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `imports`
--
ALTER TABLE `imports`
  ADD CONSTRAINT `fk_imports_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_imports_user` FOREIGN KEY (`imported_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Contraintes pour la table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_messages_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Contraintes pour la table `message_acknowledgements`
--
ALTER TABLE `message_acknowledgements`
  ADD CONSTRAINT `fk_mack_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mack_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD CONSTRAINT `fk_ma_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `message_reads`
--
ALTER TABLE `message_reads`
  ADD CONSTRAINT `fk_mreads_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mreads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `message_recipients`
--
ALTER TABLE `message_recipients`
  ADD CONSTRAINT `fk_mr_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `parents`
--
ALTER TABLE `parents`
  ADD CONSTRAINT `fk_parents_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_parents_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `parent_student`
--
ALTER TABLE `parent_student`
  ADD CONSTRAINT `fk_ps_parent` FOREIGN KEY (`parent_id`) REFERENCES `parents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ps_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_pr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `push_tokens`
--
ALTER TABLE `push_tokens`
  ADD CONSTRAINT `fk_pt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `scheduled_messages`
--
ALTER TABLE `scheduled_messages`
  ADD CONSTRAINT `fk_sm_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sm_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `staff`
--
ALTER TABLE `staff`
  ADD CONSTRAINT `fk_staff_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_students_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_establishment` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
