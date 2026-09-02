# Documentation de l'API REST

Ce document décrit l'ensemble des endpoints de l'API REST d'EduConnect.

---

## Informations générales

- **URL de base** : `http://localhost:3000/api`
- **Format des réponses** : JSON
- **Authentification** : Bearer JWT Token

---

## Authentification

Toutes les routes protégées nécessitent un en-tête d'autorisation :

```
Authorization: Bearer <votre_token_jwt>
```

Le token JWT est obtenu lors de la connexion (login ou OTP) et doit être inclus dans chaque requête protégée.

---

## Format de réponse commun

### Succès

```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}
```

### Erreur

```json
{
  "success": false,
  "message": "Description de l'erreur"
}
```

### Réponse paginée

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Codes HTTP utilisés

| Code | Signification |
|---|---|
| `200` | Succès |
| `201` | Ressource créée |
| `204` | Suppression réussie (pas de contenu) |
| `400` | Requête invalide |
| `401` | Non authentifié |
| `403` | Accès refusé (rôle insuffisant) |
| `404` | Ressource introuvable |
| `409` | Conflit (doublon) |
| `422` | Erreur de validation |
| `500` | Erreur interne du serveur |

---

## Rôles et permissions (RBAC)

| Rôle | Permissions |
|---|---|
| **SUPER_ADMIN** | Accès complet à toutes les fonctionnalités. Gestion des utilisateurs, messages, statistiques, paramètres, audit. |
| **ADMIN** | La plupart des fonctionnalités. Gestion des messages, groupes, classes, imports, statistiques. Pas de gestion des paramètres système. |
| **PARENT** | Lecture des messages, envoi d'accusés de lecture, consultation des informations de ses enfants. |
| **STUDENT** | Lecture des messages. |
| **STAFF** | Lecture des messages. |

---

## Endpoints

---

### Authentification (`/auth`)

#### `POST /auth/login`

Connexion par email et mot de passe (pour les administrateurs).

- **Authentification** : Non
- **Rôles** : Public

**Corps de la requête :**

```json
{
  "email": "directeur@lareussite.ci",
  "password": "Admin@2026"
}
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "directeur@lareussite.ci",
      "role": "SUPER_ADMIN",
      "first_name": "Directeur",
      "last_name": "Général"
    }
  }
}
```

---

#### `POST /auth/otp/request`

Demande d'envoi d'un code OTP (pour les parents sur mobile).

- **Authentification** : Non
- **Rôles** : Public

**Corps de la requête :**

```json
{
  "matricule": "PAR-001",
  "phone": "+2250700000010"
}
```

**Réponse :**

```json
{
  "success": true,
  "message": "Code OTP envoyé"
}
```

> **Note** : En mode développement, le code OTP est affiché dans la console du backend.

---

#### `POST /auth/otp/verify`

Vérification du code OTP et obtention du token JWT.

- **Authentification** : Non
- **Rôles** : Public

**Corps de la requête :**

```json
{
  "matricule": "PAR-001",
  "code": "123456"
}
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 3,
      "matricule": "PAR-001",
      "role": "PARENT",
      "first_name": "Koné",
      "last_name": "Aminata"
    }
  }
}
```

---

#### `POST /auth/logout`

Déconnexion de l'utilisateur.

- **Authentification** : Oui

**Réponse :**

```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

#### `GET /auth/profile`

Récupération du profil de l'utilisateur connecté.

- **Authentification** : Oui

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "directeur@lareussite.ci",
    "role": "SUPER_ADMIN",
    "first_name": "Directeur",
    "last_name": "Général",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### Messages (`/messages`)

#### `GET /messages`

Liste des messages (pour les utilisateurs mobiles et l'administration).

- **Authentification** : Oui
- **Rôles** : Tous
- **Pagination** : Oui (`?page=1&limit=20`)

**Paramètres de requête (admin) :**

| Paramètre | Type | Description |
|---|---|---|
| `page` | number | Numéro de page (défaut : 1) |
| `limit` | number | Éléments par page (défaut : 20) |
| `search` | string | Recherche par titre ou contenu |
| `status` | string | Filtrer par statut (SENT, SCHEDULED, DRAFT) |
| `type` | string | Filtrer par type (INFO, URGENT, ANNOUNCEMENT) |
| `classId` | number | Filtrer par classe |
| `groupId` | number | Filtrer par groupe |
| `startDate` | string | Date de début (ISO 8601) |
| `endDate` | string | Date de fin (ISO 8601) |

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Réunion de parents",
      "content": "Chers parents, une réunion est prévue...",
      "type": "ANNOUNCEMENT",
      "priority": "HIGH",
      "status": "SENT",
      "sender": { "id": 1, "name": "Directeur Général" },
      "created_at": "2025-01-15T10:00:00.000Z",
      "is_read": true,
      "read_at": "2025-01-15T11:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

#### `GET /messages/unread-count`

Nombre de messages non lus pour l'utilisateur connecté.

- **Authentification** : Oui
- **Rôles** : PARENT, STUDENT, STAFF

**Réponse :**

```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

---

#### `GET /messages/:id`

Détail d'un message.

- **Authentification** : Oui
- **Rôles** : Tous

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Réunion de parents",
    "content": "Chers parents, une réunion est prévue le vendredi 20 janvier à 18h...",
    "type": "ANNOUNCEMENT",
    "priority": "HIGH",
    "status": "SENT",
    "sender": { "id": 1, "name": "Directeur Général", "role": "SUPER_ADMIN" },
    "recipients": [
      { "id": 3, "name": "Koné Aminata", "is_read": true, "read_at": "..." },
      { "id": 4, "name": "Traoré Moussa", "is_read": false }
    ],
    "attachments": [
      { "id": 1, "filename": "invitation.pdf", "url": "/uploads/..." }
    ],
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

---

#### `GET /messages/:id/statistics`

Statistiques de lecture d'un message.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Réponse :**

```json
{
  "success": true,
  "data": {
    "message_id": 1,
    "total_recipients": 120,
    "read_count": 85,
    "acknowledged_count": 42,
    "unread_count": 35,
    "read_rate": 70.8,
    "acknowledgement_rate": 35.0
  }
}
```

---

#### `POST /messages`

Envoi d'un nouveau message.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête :**

```json
{
  "title": "Réunion de parents",
  "content": "Chers parents, une réunion est prévue...",
  "type": "ANNOUNCEMENT",
  "priority": "HIGH",
  "target_type": "class",
  "target_ids": [1, 2, 3],
  "attachment_ids": [1]
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `title` | string | Oui | Titre du message |
| `content` | string | Oui | Contenu du message |
| `type` | string | Non | Type (INFO, URGENT, ANNOUNCEMENT) |
| `priority` | string | Non | Priorité (LOW, MEDIUM, HIGH) |
| `target_type` | string | Oui | Type de cible : `class`, `group`, `user` |
| `target_ids` | number[] | Oui | Identifiants des cibles |
| `attachment_ids` | number[] | Non | Identifiants des pièces jointes |

---

#### `POST /messages/schedule`

Planification d'un message pour un envoi ultérieur.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête :**

```json
{
  "title": "Rappel : paiement des frais",
  "content": "N'oubliez pas de régler les frais scolaires...",
  "type": "REMINDER",
  "priority": "MEDIUM",
  "target_type": "all",
  "target_ids": [],
  "scheduled_at": "2025-02-01T08:00:00.000Z"
}
```

---

#### `POST /messages/:id/read`

Marquer un message comme lu (pour les utilisateurs mobiles).

- **Authentification** : Oui
- **Rôles** : PARENT, STUDENT, STAFF

**Réponse :**

```json
{
  "success": true,
  "message": "Message marqué comme lu"
}
```

---

#### `POST /messages/:id/acknowledge`

Acquitter un message (prendre connaissance).

- **Authentification** : Oui
- **Rôles** : PARENT

**Corps de la requête (optionnel) :**

```json
{
  "comment": "Bien noté, je serai présent"
}
```

**Réponse :**

```json
{
  "success": true,
  "message": "Message acquitté"
}
```

---

#### `PATCH /messages/:id/cancel`

Annuler un message planifié.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Réponse :**

```json
{
  "success": true,
  "message": "Message planifié annulé"
}
```

---

#### `GET /messages/history`

Historique des messages (avec filtres avancés pour l'administration).

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN
- **Pagination** : Oui

**Paramètres de requête :**

| Paramètre | Type | Description |
|---|---|---|
| `page` | number | Numéro de page |
| `limit` | number | Éléments par page |
| `search` | string | Recherche textuelle |
| `status` | string | Statut (SENT, SCHEDULED, CANCELLED, DRAFT) |
| `type` | string | Type de message |
| `senderId` | number | Identifiant de l'expéditeur |
| `startDate` | string | Date de début |
| `endDate` | string | Date de fin |

---

#### `POST /messages/upload`

Téléchargement d'une pièce jointe pour un message.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête** : `multipart/form-data`

| Champ | Type | Description |
|---|---|---|
| `file` | File | Fichier à uploader |

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "document.pdf",
    "url": "/uploads/messages/document.pdf",
    "size": 102400,
    "mime_type": "application/pdf"
  }
}
```

---

### Utilisateurs (`/users`)

#### `GET /users`

Liste de tous les utilisateurs.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN
- **Pagination** : Oui

**Paramètres de requête :**

| Paramètre | Type | Description |
|---|---|---|
| `page` | number | Numéro de page |
| `limit` | number | Éléments par page |
| `role` | string | Filtrer par rôle (PARENT, STUDENT, STAFF) |
| `search` | string | Recherche par nom ou email |
| `classId` | number | Filtrer par classe (pour les élèves et parents) |

---

#### `GET /users/students/list`

Liste des élèves.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN
- **Pagination** : Oui

---

#### `GET /users/parents/list`

Liste des parents.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN
- **Pagination** : Oui

---

#### `GET /users/staff/list`

Liste du personnel.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN
- **Pagination** : Oui

---

#### `POST /users`

Création d'un utilisateur.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête :**

```json
{
  "first_name": "Koné",
  "last_name": "Aminata",
  "email": "amine.kone@email.com",
  "password": "MotDePasse@2026",
  "role": "PARENT",
  "phone": "+2250700000010",
  "matricule": "PAR-010",
  "profession": "Commerçante",
  "children_ids": [1, 2]
}
```

---

#### `PUT /users/:id`

Modification d'un utilisateur.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête :** (champs partiels autorisés)

```json
{
  "first_name": "Nouveau prénom",
  "phone": "+2250700000020"
}
```

---

#### `DELETE /users/:id`

Suppression d'un utilisateur.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN
- **Code de réponse** : `204 No Content`

---

### Classes (`/classes`)

#### `GET /classes`

Liste de toutes les classes.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

---

#### `POST /classes`

Création d'une classe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête :**

```json
{
  "name": "6ème A",
  "level": "6ème",
  "capacity": 40,
  "responsible_id": 5
}
```

---

#### `PUT /classes/:id`

Modification d'une classe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

---

#### `DELETE /classes/:id`

Suppression d'une classe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN
- **Code de réponse** : `204 No Content`

---

### Groupes (`/groups`)

#### `GET /groups`

Liste de tous les groupes.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

---

#### `POST /groups`

Création d'un groupe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête (groupe statique) :**

```json
{
  "name": "Parents CM2",
  "description": "Tous les parents des élèves de CM2",
  "type": "static",
  "member_ids": [3, 4, 5, 6]
}
```

**Corps de la requête (groupe intelligent) :**

```json
{
  "name": "Parents 6ème actifs",
  "description": "Parents des élèves actifs de 6ème",
  "type": "smart",
  "filters": {
    "classId": 1,
    "status": "active"
  }
}
```

---

#### `PUT /groups/:id`

Modification d'un groupe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

---

#### `DELETE /groups/:id`

Suppression d'un groupe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN
- **Code de réponse** : `204 No Content`

---

#### `GET /groups/:id/members`

Liste des membres d'un groupe.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Réponse :**

```json
{
  "success": true,
  "data": [
    { "id": 3, "name": "Koné Aminata", "phone": "+22507****010" },
    { "id": 4, "name": "Traoré Moussa", "phone": "+22507****011" }
  ]
}
```

> **Note** : Les numéros de téléphone sont masqués pour protéger la vie privée.

---

### Import (`/import`)

#### `POST /import/students`

Importation d'élèves et parents depuis un fichier Excel.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête** : `multipart/form-data`

| Champ | Type | Description |
|---|---|---|
| `file` | File | Fichier Excel (.xlsx, .xls) |

**Réponse :**

```json
{
  "success": true,
  "data": {
    "import_id": 1,
    "total_rows": 150,
    "imported": 145,
    "errors": 5,
    "error_details": [
      { "row": 12, "error": "Numéro de téléphone invalide" },
      { "row": 45, "error": "Matricule en doublon" }
    ]
  }
}
```

---

#### `GET /import/history`

Historique des importations.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN
- **Pagination** : Oui

---

### Notifications (`/notifications`)

#### `GET /notifications`

Liste des notifications de l'utilisateur connecté.

- **Authentification** : Oui
- **Rôles** : Tous
- **Pagination** : Oui

---

#### `POST /notifications/register-token`

Enregistrement du token Firebase pour les notifications push.

- **Authentification** : Oui
- **Rôles** : Tous

**Corps de la requête :**

```json
{
  "token": "fCM_token_du_peripherique",
  "platform": "android"
}
```

---

### Statistiques (`/statistics`)

#### `GET /statistics/dashboard`

Statistiques du tableau de bord.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Réponse :**

```json
{
  "success": true,
  "data": {
    "total_students": 450,
    "total_parents": 380,
    "total_staff": 35,
    "total_classes": 18,
    "total_messages": 1200,
    "messages_today": 5,
    "unread_rate": 28.5,
    "acknowledgement_rate": 65.2
  }
}
```

---

#### `GET /statistics/messages`

Statistiques détaillées sur les messages.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Paramètres de requête :**

| Paramètre | Type | Description |
|---|---|---|
| `period` | string | Période : `day`, `week`, `month`, `year` |
| `startDate` | string | Date de début (ISO 8601) |
| `endDate` | string | Date de fin (ISO 8601) |

**Réponse :**

```json
{
  "success": true,
  "data": {
    "total_sent": 250,
    "total_read": 185,
    "total_acknowledged": 95,
    "read_rate": 74.0,
    "acknowledgement_rate": 38.0,
    "by_type": {
      "INFO": { "sent": 150, "read": 120 },
      "URGENT": { "sent": 50, "read": 45 },
      "ANNOUNCEMENT": { "sent": 50, "read": 20 }
    },
    "daily_stats": [
      { "date": "2025-01-15", "sent": 10, "read": 8 },
      { "date": "2025-01-16", "sent": 15, "read": 12 }
    ]
  }
}
```

---

### Upload (`/upload`)

#### `POST /upload`

Téléchargement d'un fichier.

- **Authentification** : Oui
- **Rôles** : SUPER_ADMIN, ADMIN

**Corps de la requête** : `multipart/form-data`

| Champ | Type | Description |
|---|---|---|
| `file` | File | Fichier à uploader |

**Réponse :**

```json
{
  "success": true,
  "data": {
    "url": "/uploads/fichier_1234567890.pdf",
    "filename": "fichier_1234567890.pdf",
    "size": 204800,
    "mime_type": "application/pdf"
  }
}
```

---

### Santé (`/health`)

#### `GET /health`

Vérification de l'état de l'API.

- **Authentification** : Non

**Réponse :**

```json
{
  "success": true,
  "message": "EduConnect API opérationnelle",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Tableau récapitulatif des endpoints

| Méthode | Route | Description | Auth | Rôles |
|---|---|---|---|---|
| POST | `/auth/login` | Connexion email/mot de passe | Non | Public |
| POST | `/auth/otp/request` | Demande de code OTP | Non | Public |
| POST | `/auth/otp/verify` | Vérification du code OTP | Non | Public |
| POST | `/auth/logout` | Déconnexion | Oui | Tous |
| GET | `/auth/profile` | Profil utilisateur | Oui | Tous |
| GET | `/messages` | Liste des messages | Oui | Tous |
| GET | `/messages/unread-count` | Nombre de messages non lus | Oui | PARENT, STUDENT, STAFF |
| GET | `/messages/:id` | Détail d'un message | Oui | Tous |
| GET | `/messages/:id/statistics` | Statistiques d'un message | Oui | SUPER_ADMIN, ADMIN |
| POST | `/messages` | Envoyer un message | Oui | SUPER_ADMIN, ADMIN |
| POST | `/messages/schedule` | Planifier un message | Oui | SUPER_ADMIN, ADMIN |
| POST | `/messages/:id/read` | Marquer comme lu | Oui | PARENT, STUDENT, STAFF |
| POST | `/messages/:id/acknowledge` | Acquitter un message | Oui | PARENT |
| PATCH | `/messages/:id/cancel` | Annuler un message planifié | Oui | SUPER_ADMIN, ADMIN |
| GET | `/messages/history` | Historique des messages | Oui | SUPER_ADMIN, ADMIN |
| POST | `/messages/upload` | Uploader une pièce jointe | Oui | SUPER_ADMIN, ADMIN |
| GET | `/users` | Liste des utilisateurs | Oui | SUPER_ADMIN, ADMIN |
| GET | `/users/students/list` | Liste des élèves | Oui | SUPER_ADMIN, ADMIN |
| GET | `/users/parents/list` | Liste des parents | Oui | SUPER_ADMIN, ADMIN |
| GET | `/users/staff/list` | Liste du personnel | Oui | SUPER_ADMIN, ADMIN |
| POST | `/users` | Créer un utilisateur | Oui | SUPER_ADMIN, ADMIN |
| PUT | `/users/:id` | Modifier un utilisateur | Oui | SUPER_ADMIN, ADMIN |
| DELETE | `/users/:id` | Supprimer un utilisateur | Oui | SUPER_ADMIN |
| GET | `/classes` | Liste des classes | Oui | SUPER_ADMIN, ADMIN |
| POST | `/classes` | Créer une classe | Oui | SUPER_ADMIN, ADMIN |
| PUT | `/classes/:id` | Modifier une classe | Oui | SUPER_ADMIN, ADMIN |
| DELETE | `/classes/:id` | Supprimer une classe | Oui | SUPER_ADMIN |
| GET | `/groups` | Liste des groupes | Oui | SUPER_ADMIN, ADMIN |
| POST | `/groups` | Créer un groupe | Oui | SUPER_ADMIN, ADMIN |
| PUT | `/groups/:id` | Modifier un groupe | Oui | SUPER_ADMIN, ADMIN |
| DELETE | `/groups/:id` | Supprimer un groupe | Oui | SUPER_ADMIN |
| GET | `/groups/:id/members` | Membres d'un groupe | Oui | SUPER_ADMIN, ADMIN |
| POST | `/import/students` | Importer des élèves (Excel) | Oui | SUPER_ADMIN, ADMIN |
| GET | `/import/history` | Historique des imports | Oui | SUPER_ADMIN, ADMIN |
| GET | `/notifications` | Liste des notifications | Oui | Tous |
| POST | `/notifications/register-token` | Enregistrer un token push | Oui | Tous |
| GET | `/statistics/dashboard` | Statistiques du tableau de bord | Oui | SUPER_ADMIN, ADMIN |
| GET | `/statistics/messages` | Statistiques des messages | Oui | SUPER_ADMIN, ADMIN |
| POST | `/upload` | Uploader un fichier | Oui | SUPER_ADMIN, ADMIN |
| GET | `/health` | Santé de l'API | Non | Public |
