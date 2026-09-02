# Documentation de la base de données

Ce document décrit la structure, les tables, les vues et les décisions de conception de la base de données MySQL d'EduConnect.

---

## Configuration WAMPServer / MySQL

EduConnect utilise MySQL 8.0 fourni par WAMPServer. Les paramètres de connexion par défaut sont :

| Paramètre | Valeur |
|---|---|
| **Hôte** | `localhost` |
| **Port** | `3306` |
| **Utilisateur** | `root` |
| **Mot de passe** | *(vide)* |
| **Base de données** | `educonnect` |
| **Interclassement** | `utf8mb4_unicode_ci` |

---

## Importation de la base de données

### Via phpMyAdmin

1. Ouvrez [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
2. Cliquez sur l'onglet **Importer**
3. Sélectionnez le fichier `database/educonnect.sql`
4. Cliquez sur **Exécuter**
5. Importez ensuite `database/seed.sql` pour les données de test

### Via ligne de commande

```bash
mysql -u root educonnect < database/educonnect.sql
mysql -u root educonnect < database/seed.sql
```

---

## Vue d'ensemble des tables (20 tables)

La base de données comporte **20 tables** organisées en 6 groupes fonctionnels.

### Tables de gestion des utilisateurs (4 tables)

| Table | Description |
|---|---|
| `users` | Table centrale des utilisateurs. Contient les informations d'authentification (email, mot de passe hashé, rôle) et les noms (prénom, nom). Tous les types d'utilisateurs (admin, parent, personnel) ont un enregistrement ici. |
| `students` | Fiches des élèves. Liée à `users` via `user_id` (l'élève a aussi un compte utilisateur). Contient le matricule, la classe et les informations spécifiques. |
| `parents` | Fiches des parents/tuteurs. Liée à `users` via `user_id`. Contient le matricule, le numéro de téléphone (hashé), la profession. |
| `staff` | Fiches du personnel (enseignants, direction). Liée à `users` via `user_id`. Contient la fonction, le département, le statut. |

### Tables de gestion des messages (4 tables)

| Table | Description |
|---|---|
| `messages` | Messages envoyés. Contient le titre, le contenu, le type, la priorité, l'expéditeur, la date de planification et le statut. |
| `message_recipients` | Liste des destinataires d'un message. Chaque ligne associe un message à un utilisateur destinataire. |
| `message_reads` | Suivi des lectures. Enregistre la date et l'heure à laquelle un destinataire a lu un message. |
| `message_acknowledgements` | Accusés de réception. Séparé de `message_reads` car un parent peut lire sans acquitter (prendre connaissance). Contient un champ de commentaire optionnel. |

### Tables de structure scolaire (3 tables)

| Table | Description |
|---|---|
| `classes` | Classes de l'établissement (ex. : 6ème A, 5ème B). Contient le nom, le niveau, la capacité et le responsable. |
| `student_classes` | Table de liaison many-to-many entre `students` et `classes`. Un élève peut appartenir à plusieurs classes (historique). |
| `groups` | Groupes de communication. Peuvent être statiques (membres manuels) ou dynamiques (groupes intelligents avec filtres JSON). |

### Tables de gestion des groupes (2 tables)

| Table | Description |
|---|---|
| `group_members` | Membres d'un groupe (pour les groupes statiques). |
| `group_filters` | Filtres JSON pour les groupes intelligents (dynamiques). Ex. : `{ "classId": 3, "status": "active" }`. |

### Tables de suivi et d'audit (3 tables)

| Table | Description |
|---|---|
| `import_history` | Historique des importations Excel. Enregistre le fichier, le nombre de lignes importées, les erreurs et la date. |
| `audit_logs` | Journal d'audit pour la conformité RGPD. Enregistre chaque action sensible (création, modification, suppression de données utilisateur). |
| `notification_tokens` | Tokens d'enregistrement Firebase pour les notifications push. Un utilisateur peut avoir plusieurs tokens (plusieurs appareils). |

### Tables système (4 tables)

| Table | Description |
|---|---|
| `parent_children` | Association parents-enfants. Table de liaison many-to-many entre `parents` et `students`. |
| `attachments` | Pièces jointes des messages. Stocke le nom, le type MIME, la taille et le chemin du fichier. |
| `settings` | Paramètres de l'application (configuration globale). |
| `otp_codes` | Codes OTP temporaires pour l'authentification mobile. Sont supprimés après utilisation ou expiration. |

---

## Résumé des relations entre entités

```
users (1) ──── (0..1) students
users (1) ──── (0..1) parents
users (1) ──── (0..1) staff

students (N) ── (N) student_classes ── (N) classes

parents (N) ── (N) parent_children ── (N) students

messages (1) ── (N) message_recipients
                       │
                       └─── users (destinataires)

messages (1) ── (N) message_reads
                  └─── users (lecteurs)

messages (1) ── (N) message_acknowledgements
                  └─── users (acquittants)

messages (1) ── (N) attachments

groups (1) ── (N) group_members ── (N) users
groups (1) ── (N) group_filters

users (1) ── (N) notification_tokens
```

---

## Décisions de conception clés

### Noms stockés uniquement dans la table `users` (normalisation)

Les noms (prénom et nom) sont stockés **uniquement** dans la table `users`. Les tables `students`, `parents` et `staff` n'ont pas de colonnes nom/prénom : elles s'y réfèrent via la clé étrangère `user_id`.

**Avantage** : Évite la redondance des données et garantit la cohérence des noms.

**Conséquence** : Pour obtenir le nom complet d'un parent, il faut joindre `parents` avec `users` :

```sql
SELECT u.first_name, u.last_name, p.matricule, p.phone
FROM parents p
JOIN users u ON p.user_id = u.id;
```

### Tables séparées `students`, `parents`, `staff` liées par `user_id`

Chaque acteur dispose de sa propre table avec des champs spécifiques, mais partage un enregistrement dans `users` pour l'authentification et les informations communes.

| Table | Champs spécifiques |
|---|---|
| `students` | `matricule`, `class_id`, `date_of_birth`, `gender`, `status` |
| `parents` | `matricule`, `phone` (hashé), `profession`, `address` |
| `staff` | `function`, `department`, `status` |

### Suivi des lectures dans `message_reads` (pas dans `message_recipients`)

La lecture est enregistrée dans une table séparée `message_reads` et non directement dans `message_recipients`. Cela permet de :

- Stocker la **date et l'heure précise** de lecture
- Enregistrer **plusieurs lectures** si nécessaire (historique)
- Séparer la notion de destinataire de la notion de lecture

### Accusés de réception dans `message_acknowledgements` (table séparée)

Les accusés de réception sont distincts des lectures. Un parent peut :

1. **Lire** le message (enregistré dans `message_reads`)
2. **Acquitter** le message (enregistré dans `message_acknowledgements`)

La table `message_acknowledgements` contient un champ `comment` optionnel permettant au parent de laisser un commentaire.

### Groupes intelligents avec filtres JSON

Les groupes peuvent être de deux types :

- **Statiques** : les membres sont ajoutés manuellement dans `group_members`
- **Dynamiques (intelligents)** : les membres sont calculés automatiquement via des filtres JSON stockés dans `group_filters`

Exemple de filtre JSON :

```json
{
  "classId": 3,
  "status": "active"
}
```

Ce filtre sélectionne tous les parents dont les enfants sont dans la classe 3 et sont actifs.

### Messages planifiés avec mécanisme de relance

Les messages planifiés ont un champ `scheduled_at` dans la table `messages` et un statut `SCHEDULED`. Un **planificateur de tâches** (node-cron) vérifie périodiquement les messages à envoyer et les traite. En cas d'échec d'envoi, un mécanisme de **relance** (retry) est prévu.

### Journaux d'audit pour la conformité RGPD

La table `audit_logs` enregistre chaque action sensible effectuée sur la plateforme :

- Création, modification, suppression d'utilisateurs
- Envoi de messages
- Importation de données
- Export de données

Chaque entrée contient :

- `user_id` : l'utilisateur qui a effectué l'action
- `action` : type d'action (CREATE, UPDATE, DELETE, LOGIN, etc.)
- `entity` : entité concernée (User, Message, etc.)
- `entity_id` : identifiant de l'entité
- `details` : détails supplémentaires au format JSON
- `ip_address` : adresse IP de l'utilisateur
- `created_at` : date et heure de l'action

---

## Vues

La base de données inclut **3 vues** pour simplifier les requêtes fréquentes.

### `v_message_read_stats`

Vue de synthèse des statistiques de lecture des messages.

```sql
-- Exemple d'utilisation
SELECT * FROM v_message_read_stats WHERE message_id = 1;
```

| Colonne | Description |
|---|---|
| `message_id` | Identifiant du message |
| `total_recipients` | Nombre total de destinataires |
| `read_count` | Nombre de destinataires ayant lu |
| `acknowledged_count` | Nombre de destinataires ayant acquitté |
| `read_rate` | Taux de lecture (en pourcentage) |

### `v_parent_children`

Vue listant les enfants de chaque parent avec leurs classes.

```sql
-- Exemple d'utilisation
SELECT * FROM v_parent_children WHERE parent_id = 1;
```

| Colonne | Description |
|---|---|
| `parent_id` | Identifiant du parent |
| `parent_name` | Nom complet du parent |
| `child_id` | Identifiant de l'enfant |
| `child_name` | Nom complet de l'enfant |
| `class_name` | Nom de la classe de l'enfant |

### `v_dashboard_stats`

Vue de synthèse pour le tableau de bord de l'administration.

```sql
-- Exemple d'utilisation
SELECT * FROM v_dashboard_stats;
```

| Colonne | Description |
|---|---|
| `total_students` | Nombre total d'élèves |
| `total_parents` | Nombre total de parents |
| `total_staff` | Nombre total de personnels |
| `total_messages` | Nombre total de messages envoyés |
| `total_classes` | Nombre total de classes |
| `messages_today` | Nombre de messages envoyés aujourd'hui |

---

## Paramètres de connexion WAMP

Récapitulatif des paramètres à utiliser dans le fichier `backend/.env` :

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=educonnect
```

> **Attention** : Ne mettez **aucun espace** autour du signe `=` dans le fichier `.env`.
