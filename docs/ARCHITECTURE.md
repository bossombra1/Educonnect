# Documentation de l'architecture

Ce document décrit l'architecture technique complète d'EduConnect.

---

## Diagramme d'architecture globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EDUCONNECT                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐ │
│  │              │     │              │     │                      │ │
│  │  Admin Web   │────▶│  Backend API │────▶│  Base de données    │ │
│  │  React+Vite  │     │  Express+TS  │     │  MySQL (WAMPServer) │ │
│  │  :5173       │     │  :3000       │     │  :3306              │ │
│  │              │     │              │     │                      │ │
│  └──────────────┘     │              │     └──────────────────────┘ │
│                        │              │                              │
│  ┌──────────────┐     │              │     ┌──────────────────────┐ │
│  │              │     │              │     │                      │ │
│  │  App Mobile  │◀────│              │────▶│  Firebase Cloud      │ │
│  │  RN + Expo   │     │              │     │  Messaging (FCM)    │ │
│  │              │     └──────────────┘     │                      │ │
│  │  Expo Go     │                            └──────────────────────┘ │
│  │  :8081       │                                                     │
│  └──────────────┘                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Flux de données principal

```
1. Admin envoie un message
   ┌──────────┐    POST /messages    ┌──────────┐    INSERT     ┌────────┐
   │ Admin Web│ ──────────────────▶  │ Backend   │ ──────────▶  │  MySQL  │
   └──────────┘                       └────┬─────┘             └────────┘
                                          │
2. Backend envoie une notification         │ SELECT destinataires
                                          ▼
                                   ┌──────────────┐
                                   │  Firebase    │
                                   │  FCM         │
                                   └──────┬───────┘
                                          │ Push notification
3. Mobile reçoit la notification           ▼
                                   ┌──────────┐
                                   │ App      │
                                   │ Mobile   │
                                   └────┬─────┘
                                        │
4. Utilisateur lit le message               │ POST /messages/:id/read
                                        ▼
                                   ┌──────────┐    UPDATE      ┌────────┐
                                   │ Backend   │ ──────────▶  │  MySQL  │
                                   └──────────┘               └────────┘
```

---

## Description des composants

---

### Application Mobile

**Technologies :** React Native + Expo + TypeScript

L'application mobile est destinée aux parents d'élèves. Elle permet de consulter les messages de l'établissement, de les marquer comme lus et de les acquitter.

| Caractéristique | Détail |
|---|---|
| **Framework** | React Native avec Expo |
| **Routing** | Expo Router (navigation basée sur les fichiers) |
| **Langage** | TypeScript |
| **Onglets principaux** | 4 onglets : Accueil, Messages, Notifications, Profil |
| **Mode hors ligne** | Oui — cache avec AsyncStorage |
| **Notifications push** | expo-notifications + Firebase FCM |

#### Structure des onglets

| Onglet | Description |
|---|---|
| **Accueil** (`(tabs)/index.tsx`) | Résumé des messages récents, statistiques personnelles, bannière hors ligne |
| **Messages** (`(tabs)/messages.tsx`) | Liste de tous les messages reçus avec indicateur de lecture |
| **Notifications** (`(tabs)/notifications.tsx`) | Historique des notifications push reçues |
| **Profil** (`(tabs)/profile.tsx`) | Informations du profil, liste des enfants, paramètres |

#### Écrans secondaires

| Écran | Chemin | Description |
|---|---|---|
| **Bienvenue** | `auth/welcome.tsx` | Page d'accueil de l'application |
| **Connexion** | `auth/login.tsx` | Saisie du matricule et du numéro de téléphone |
| **Code OTP** | `auth/otp.tsx` | Saisie du code OTP reçu |
| **Détail du message** | `messages/[id].tsx` | Contenu complet d'un message, accusés |
| **Fiche enfant** | `children/[id].tsx` | Informations d'un enfant |
| **Paramètres** | `settings/index.tsx` | Configuration de l'application |

#### Architecture interne

```
mobile/
├── app/                    # Routes Expo Router
│   ├── (tabs)/             # Onglets principaux
│   │   ├── _layout.tsx     # Layout des onglets
│   │   ├── index.tsx       # Accueil
│   │   ├── messages.tsx    # Messages
│   │   ├── notifications.tsx # Notifications
│   │   └── profile.tsx     # Profil
│   ├── auth/               # Écrans d'authentification
│   ├── messages/           # Détail d'un message
│   ├── children/           # Fiche enfant
│   ├── settings/           # Paramètres
│   └── _layout.tsx         # Layout racine
├── src/
│   ├── components/
│   │   ├── shared/         # Composants partagés (MessageCard, EmptyState)
│   │   └── ui/             # Composants UI (OfflineBanner, LoadingScreen)
│   ├── hooks/              # Hooks personnalisés
│   │   ├── useAuth.ts      # Gestion de l'authentification
│   │   ├── useConnectivity.ts # Détection de la connectivité
│   │   └── useMessages.ts  # Gestion des messages
│   ├── notifications/
│   │   ├── index.ts        # Initialisation et configuration
│   │   └── handlers.ts     # Gestionnaires de réception
│   ├── services/
│   │   ├── api.ts          # Client HTTP avec intercepteurs
│   │   ├── auth.service.ts # Service d'authentification
│   │   └── message.service.ts # Service des messages
│   ├── storage/
│   │   ├── storage.ts      # Gestion du stockage local
│   │   └── offline.ts      # File d'attente hors ligne
│   ├── theme/              # Thème (couleurs, polices)
│   └── types/              # Types TypeScript
├── app.json                # Configuration Expo
├── eas.json                # Configuration EAS Build
├── babel.config.js
├── metro.config.js
└── package.json
```

---

### Admin Web (Interface d'administration)

**Technologies :** React 18 + Vite + TypeScript + Tailwind CSS

L'interface d'administration permet aux gestionnaires de l'établissement de piloter l'ensemble de la plateforme.

| Caractéristique | Détail |
|---|---|
| **Framework** | React 18 avec Vite |
| **Langage** | TypeScript |
|---|---|
| **Styles** | Tailwind CSS |
| **Routing** | React Router |
| **Icônes** | lucide-react |
| **Graphiques** | Recharts |
| **Gestion d'état** | Zustand |
| **Nombre de pages** | 13 |

#### Liste des pages

| Page | Chemin | Description |
|---|---|---|
| **Connexion** | `/login` | Authentification email/mot de passe |
| **Tableau de bord** | `/` | Statistiques globales, KPI, graphiques |
| **Messages** | `/messages` | Envoi et gestion des messages |
| **Messages planifiés** | `/scheduled-messages` | Gestion des messages planifiés |
| **Historique** | `/history` | Historique complet des messages envoyés |
| **Élèves** | `/students` | Gestion des élèves |
| **Parents** | `/parents` | Gestion des parents |
| **Personnel** | `/staff` | Gestion du personnel |
| **Utilisateurs** | `/users` | Vue globale de tous les utilisateurs |
| **Classes** | `/classes` | Gestion des classes |
| **Groupes** | `/groups` | Gestion des groupes (statiques et intelligents) |
| **Statistiques** | `/statistics` | Statistiques détaillées avec graphiques |
| **Paramètres** | `/settings` | Configuration de la plateforme |

#### Architecture interne

```
admin-web/
├── src/
│   ├── components/ui/      # Composants UI réutilisables
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── EmptyState.tsx
│   │   ├── FileUpload.tsx
│   │   ├── Input.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── Modal.tsx
│   │   ├── Pagination.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── Select.tsx
│   │   ├── StatCard.tsx
│   │   └── Table.tsx
│   ├── hooks/
│   │   └── useAuth.ts      # Hook d'authentification
│   ├── layouts/
│   │   └── AdminLayout.tsx  # Mise en page avec barre latérale
│   ├── pages/              # 13 pages de l'application
│   ├── routes/
│   │   └── index.tsx        # Configuration des routes
│   ├── services/           # Appels API
│   │   ├── api.ts          # Client HTTP (axios)
│   │   ├── auth.service.ts
│   │   ├── class.service.ts
│   │   ├── group.service.ts
│   │   ├── import.service.ts
│   │   ├── message.service.ts
│   │   ├── notification.service.ts
│   │   ├── statistics.service.ts
│   │   └── user.service.ts
│   ├── store/
│   │   └── authStore.ts    # État d'authentification (Zustand)
│   ├── types/
│   │   └── index.ts        # Types TypeScript partagés
│   ├── utils/
│   │   ├── cn.ts           # Utilitaire de noms de classes
│   │   └── formatters.ts   # Formateurs de dates, nombres, etc.
│   ├── App.tsx
│   ├── index.css           # Styles Tailwind
│   └── main.tsx            # Point d'entrée
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

### Backend API

**Technologies :** Node.js + Express + TypeScript (ESM)

Le backend est le cœur de l'application. Il expose l'API REST, gère l'authentification, le contrôle d'accès, l'envoi de notifications et le planificateur de tâches.

| Caractéristique | Détail |
|---|---|
| **Runtime** | Node.js 18+ |
| **Framework** | Express |
| **Langage** | TypeScript (modules ESM) |
| **Authentification** | JWT (JSON Web Tokens) avec httpOnly cookies |
| **Hachage** | bcrypt pour les mots de passe, SHA-256 pour les téléphones |
| **Base de données** | mysql2 (pool de connexions) |
| **Planificateur** | node-cron |
| **Upload** | multer |
| **Import Excel** | xlsx (SheetJS) |
| **Notifications push** | firebase-admin |

#### Architecture en couches

Le backend suit une architecture en **3 couches** :

```
Routes → Controllers → Services → Repositories → MySQL
```

| Couche | Rôle |
|---|---|
| **Routes** (`src/routes/`) | Définition des endpoints, validation des entrées, application du middleware |
| **Controllers** (`src/controllers/`) | Traitement des requêtes, appel des services, formatage des réponses |
| **Services** (`src/services/`) | Logique métier, orchestration, appels aux repositories et Firebase |
| **Repositories** (`src/repositories/`) | Requêtes SQL, accès à la base de données |

#### Middleware

| Middleware | Fichier | Description |
|---|---|---|
| **Authentification** | `middleware/auth.ts` | Vérification du token JWT, injection de `req.user` |
| **RBAC** | `middleware/rbac.ts` | Contrôle d'accès basé sur les rôles |
| **Validation** | `middleware/validator.ts` | Validation des données de requête |
| **Upload** | `middleware/upload.ts` | Gestion des fichiers uploadés (multer) |
| **Audit** | `middleware/audit.ts` | Enregistrement des actions dans les journaux d'audit |

#### Services

| Service | Fichier | Description |
|---|---|---|
| **Auth** | `services/auth.service.ts` | Authentification email/password et OTP |
| **OTP** | `services/otp.service.ts` | Génération, stockage et vérification des codes OTP |
| **Message** | `services/message.service.ts` | Création, envoi, lecture et acquittement des messages |
| **Notification** | `services/notification.service.ts` | Envoi de notifications push via Firebase FCM |
| **Group** | `services/group.service.ts` | Gestion des groupes statiques et intelligents |
| **Import** | `services/import.service.ts` | Importation de données depuis des fichiers Excel |
| **Statistics** | `services/statistics.service.ts` | Calcul des statistiques de lecture et d'envoi |
| **Scheduled Message** | `services/scheduled-message.service.ts` | Gestion des messages planifiés avec relance |

#### Planificateur de tâches

| Fichier | Description |
|---|---|
| `jobs/scheduler.ts` | Planificateur principal (node-cron). Vérifie périodiquement les messages planifiés prêts à être envoyés. Gère les relances en cas d'échec. |

#### Architecture interne

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts     # Configuration du pool MySQL
│   │   ├── env.ts          # Chargement et validation des variables d'environnement
│   │   └── firebase.ts     # Initialisation de Firebase Admin
│   ├── controllers/        # Contrôleurs de chaque domaine
│   ├── middleware/          # Middleware Express
│   ├── repositories/
│   │   └── base.repository.ts # Repository de base avec méthodes CRUD
│   ├── routes/             # Définition des routes
│   │   └── index.ts        # Regroupement de toutes les routes
│   ├── services/           # Logique métier
│   ├── jobs/
│   │   └── scheduler.ts    # Tâches planifiées (cron)
│   ├── types/
│   │   └── index.ts        # Types et interfaces TypeScript
│   ├── app.ts              # Configuration Express (middleware, routes, gestion d'erreurs)
│   └── server.ts           # Point d'entrée (démarrage du serveur)
├── package.json
└── tsconfig.json
```

---

### Base de données

**Technologies :** MySQL 8.0 (via WAMPServer)

| Caractéristique | Détail |
|---|---|
| **Moteur** | MySQL 8.0 |
| **Hébergement** | WAMPServer (local) |
| **Nombre de tables** | 20 |
| **Nombre de vues** | 3 |
| **Interclassement** | utf8mb4_unicode_ci |
| **Conformité** | RGPD (logs d'audit, hachage des données sensibles) |

Pour plus de détails, consultez le [document de la base de données](./DATABASE.md).

---

## Stratégie hors ligne

L'application mobile est conçue pour fonctionner **hors ligne**. La stratégie est la suivante :

### Cache des messages

1. Lorsque l'utilisateur consulte des messages, ils sont **mis en cache dans AsyncStorage**
2. Les messages sont stockés avec leur identifiant et un horodatage
3. Lors de l'ouverture de l'application, si le réseau n'est pas disponible, les messages sont affichés depuis le cache

### File d'attente des accusés de lecture

1. Lorsque l'utilisateur marque un message comme lu (ou l'acquitte) **hors ligne**, l'action est **stockée localement** dans une file d'attente
2. Dès que la connexion est rétablie, les actions en attente sont **envoyées au serveur** de manière séquentielle
3. Une **bannière hors ligne** est affichée pour informer l'utilisateur que les actions seront synchronisées ultérieurement

### Détection de la connectivité

- Le hook `useConnectivity` utilise l'API de connectivité de React Native
- La bannière `OfflineBanner` s'affiche automatiquement en cas de déconnexion
- La synchronisation est déclenchée automatiquement lors du retour en ligne

---

## Sécurité

### Authentification JWT

- Les tokens JWT sont transmis via des **cookies httpOnly** (protection contre le XSS)
- Durée de vie par défaut : **24 heures**
- Le token contient : `id`, `email`, `role` de l'utilisateur

### Hachage des mots de passe

- Les mots de passe sont hachés avec **bcrypt** (salt rounds par défaut : 10)
- Les mots de passe ne sont **jamais stockés en clair**

### Protection des numéros de téléphone

- Les numéros de téléphone sont hachés avec **SHA-256** dans la base de données
- Le numéro en clair n'est utilisé que lors de la vérification OTP, puis supprimé de la mémoire
- **Aucun parent ne peut voir le numéro d'un autre parent**

### Contrôle d'accès (RBAC)

- Chaque route est protégée par le middleware `auth` (vérification du token)
- Certaines routes ont en plus le middleware `rbac` (vérification du rôle)
- Les rôles sont hiérarchisés : `SUPER_ADMIN` > `ADMIN` > `STAFF` > `PARENT` > `STUDENT`

### Journaux d'audit (RGPD)

- Chaque action sensible est enregistrée dans la table `audit_logs`
- Informations tracées : utilisateur, action, entité, date, adresse IP
- Ces logs permettent de répondre aux obligations de traçabilité du **RGPD**

---

## Mises à jour OTA (Over The Air)

EduConnect utilise deux mécanismes de mise à jour pour l'application mobile :

### Mises à jour mineures — Expo Updates

- Les mises à jour mineures (corrections de bugs, ajustements d'interface) sont distribuées **automatiquement** via Expo Updates
- Aucune action n'est requise de la part de l'utilisateur
- La mise à jour est téléchargée en arrière-plan et appliquée au prochain lancement de l'application

### Mises à jour majeures — EAS Build

- Les mises à jour majeures (nouvelles fonctionnalités, changements natifs) nécessitent une **nouvelle compilation**
- La compilation est effectuée avec EAS Build : `eas build --platform android`
- L'APK/AAB est ensuite publié sur le **Google Play Store** et/ou l'**App Store**

---

## Structure complète du projet

```
EduConnect/
│
├── README.md                         # Ce fichier
├── docs/                             # Documentation
│   ├── INSTALLATION.md               # Guide d'installation
│   ├── DATABASE.md                   # Documentation de la base de données
│   ├── API.md                        # Documentation de l'API REST
│   └── ARCHITECTURE.md               # Ce document
│
├── backend/                          # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── firebase.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── class.controller.ts
│   │   │   ├── group.controller.ts
│   │   │   ├── import.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── statistics.controller.ts
│   │   │   └── upload.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── audit.ts
│   │   │   ├── rbac.ts
│   │   │   ├── upload.ts
│   │   │   └── validator.ts
│   │   ├── repositories/
│   │   │   └── base.repository.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── class.routes.ts
│   │   │   ├── group.routes.ts
│   │   │   ├── import.routes.ts
│   │   │   ├── message.routes.ts
│   │   │   ├── notification.routes.ts
│   │   │   ├── statistics.routes.ts
│   │   │   ├── upload.routes.ts
│   │   │   └── user.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── group.service.ts
│   │   │   ├── import.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── otp.service.ts
│   │   │   ├── scheduled-message.service.ts
│   │   │   └── statistics.service.ts
│   │   ├── jobs/
│   │   │   └── scheduler.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── admin-web/                        # Interface d'administration (React)
│   ├── src/
│   │   ├── components/ui/
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── Table.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── layouts/
│   │   │   └── AdminLayout.tsx
│   │   ├── pages/
│   │   │   ├── Classes/
│   │   │   ├── Dashboard/
│   │   │   ├── Groups/
│   │   │   ├── History/
│   │   │   ├── Login/
│   │   │   ├── Messages/
│   │   │   ├── Notifications/  (service)
│   │   │   ├── Parents/
│   │   │   ├── ScheduledMessages/
│   │   │   ├── Settings/
│   │   │   ├── Staff/
│   │   │   ├── Statistics/
│   │   │   └── Users/
│   │   ├── routes/
│   │   │   └── index.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── class.service.ts
│   │   │   ├── group.service.ts
│   │   │   ├── import.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── statistics.service.ts
│   │   │   └── user.service.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── cn.ts
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── mobile/                           # Application mobile (React Native + Expo)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── notifications.tsx
│   │   │   └── profile.tsx
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── otp.tsx
│   │   │   └── welcome.tsx
│   │   ├── messages/
│   │   │   └── [id].tsx
│   │   ├── children/
│   │   │   └── [id].tsx
│   │   ├── settings/
│   │   │   └── index.tsx
│   │   └── _layout.tsx
│   ├── src/
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── MessageCard.tsx
│   │   │   └── ui/
│   │   │       ├── LoadingScreen.tsx
│   │   │       └── OfflineBanner.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useConnectivity.ts
│   │   │   └── useMessages.ts
│   │   ├── notifications/
│   │   │   ├── handlers.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.service.ts
│   │   │   └── message.service.ts
│   │   ├── storage/
│   │   │   ├── offline.ts
│   │   │   └── storage.ts
│   │   ├── theme/
│   │   │   └── index.ts
│   │   └── types/
│   │       └── index.ts
│   ├── app.json
│   ├── eas.json
│   ├── babel.config.js
│   ├── metro.config.js
│   ├── tsconfig.json
│   └── package.json
│
└── database/
    ├── educonnect.sql                # Structure de la base de données
    └── seed.sql                      # Données de test
```
