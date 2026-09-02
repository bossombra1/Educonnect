# EduConnect - Plateforme de Communication Scolaire

EduConnect est une plateforme complète de communication entre les établissements scolaires et les parents d'élèves. Elle permet aux administrateurs d'envoyer des messages ciblés aux parents, de gérer les groupes intelligents, de programmer des envois planifiés et de suivre les accusés de lecture en temps réel.

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| **Authentification OTP mobile** | Parents : téléphone enregistré ; élèves/personnel : matricule de compte + téléphone, puis code OTP |
| **Notifications push** | Notifications instantanées via Firebase Cloud Messaging (FCM) |
| **Mode hors ligne** | Consultation des messages en mode déconnecté avec synchronisation automatique |
| **Panneau d'administration** | Interface web complète pour gérer l'établissement |
| **Importation Excel** | Importation en masse des élèves et parents depuis un fichier Excel |
| **Accusés de lecture** | Suivi en temps réel des messages lus et acquittés |
| **Messages planifiés** | Programmation d'envois de messages à une date et heure ultérieures |
| **Groupes intelligents** | Création de groupes dynamiques basés sur des filtres (classe, statut, etc.) |
| **Statistiques** | Tableaux de bord avec graphiques détaillés sur les messages et les taux de lecture |

## Architecture d'ensemble

```
EduConnect/
├── backend/                # API REST (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/         # Configuration (BDD, environnement, Firebase)
│   │   ├── controllers/    # Contrôleurs des routes
│   │   ├── middleware/      # Authentification, RBAC, validation, audit
│   │   ├── repositories/   # Couche d'accès aux données
│   │   ├── routes/         # Définition des routes API
│   │   ├── services/       # Logique métier
│   │   ├── jobs/           # Tâches planifiées (node-cron)
│   │   ├── types/          # Types TypeScript
│   │   ├── app.ts          # Application Express
│   │   └── server.ts       # Point d'entrée du serveur
│   └── package.json
├── admin-web/              # Interface d'administration (React + Vite + Tailwind)
├── mobile/                 # Application mobile (React Native + Expo)
├── database/
│   ├── educonnect.sql      # Structure de la base de données
│   └── seed.sql            # Données de test
└── docs/                   # Documentation
```

## Stack technique

| Composant | Technologies |
|---|---|
| **Base de données** | MySQL 8.0 (via WAMPServer) |
| **Backend** | Node.js 18+, Express, TypeScript (ESM), mysql2, JWT, bcrypt, node-cron, multer, xlsx, firebase-admin |
| **Admin Web** | React 18, Vite, TypeScript, Tailwind CSS, React Router, Recharts, lucide-react, Zustand |
| **Application mobile** | React Native, Expo, Expo Router, TypeScript, expo-notifications, Firebase FCM, AsyncStorage |
| **Notifications push** | Firebase Cloud Messaging (FCM) |

## Prérequis

- **Node.js 18+**
- **npm** (inclus avec Node.js) ou **yarn**
- **WAMPServer** avec MySQL
- **Android Studio** (pour la compilation APK) ou **Expo Go** (pour le développement)
- **Git** (optionnel)

## Démarrage rapide

### Étape 1 — Base de données

1. Lancez WAMPServer.
2. Ouvrez phpMyAdmin.
3. Créez la base `educonnect` ou importez `database/educonnect.sql`.
4. Appliquez `database/migrations/001_audit_security_and_stats.sql` sur une base existante pour les corrections de sécurité/statistiques.
5. Importez `database/seed.sql` uniquement pour les données de test.

### Étape 2 — Backend (API)

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

Vérification : `http://localhost:3000/api/health`

### Étape 3 — Interface d'administration

```bash
cd admin-web
npm install
npm run dev
```

L'interface utilise `/api` et le proxy Vite vers le backend local.

### Étape 4 — Application mobile

```bash
cd mobile
npm install
npx expo start
```

- Android Emulator : `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api`
- Téléphone physique sur le même Wi-Fi : utilisez l'IPv4 LAN du PC, par exemple `http://192.168.1.20:3000/api`.
- iOS Simulator : `http://localhost:3000/api` peut être utilisé.
- Le pare-feu Windows doit autoriser le port 3000 pour un appareil physique.

## Authentification mobile

### Parent

Le parent **n'utilise pas le matricule interne du compte**. Il saisit son numéro de téléphone enregistré par l'établissement. Si plusieurs comptes parents utilisent le même numéro, l'application demande le **matricule scolaire de l'enfant** afin d'identifier le compte sans choisir arbitrairement.

Après vérification de l'OTP, le backend délivre un JWT et retourne le profil du parent ainsi que ses enfants liés via `parent_student`.

### Élève / Personnel

L'élève ou le membre du personnel utilise le **matricule du compte `users.matricule` + téléphone**, puis saisit le code OTP.

> `users.matricule` et `students.matricule_scolaire` sont deux identifiants différents. Le second sert notamment à identifier un enfant lorsqu'un numéro de parent est partagé.

### Sécurité OTP

- OTP généré aléatoirement côté serveur.
- OTP stocké sous forme de hash bcrypt, jamais en clair.
- Expiration après 10 minutes.
- Invalidation après utilisation.
- Maximum de 5 tentatives par code.
- Limitation des demandes et vérifications par adresse IP.
- Délai minimal entre deux demandes pour un même compte.
- Aucun OTP ne doit être écrit dans les logs.

L'envoi SMS réel reste à connecter à un fournisseur SMS : la fonction backend actuelle prépare et sécurise le code mais ne simule pas un SMS réussi.

## Comptes de test

Les comptes de test sont créés par `database/seed.sql`.

> Pour l'OTP, ne considérez jamais une valeur de démonstration comme un SMS réellement envoyé. Configurez un fournisseur SMS avant une utilisation réelle.

## Variables d'environnement

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port du serveur backend | `3000` |
| `NODE_ENV` | Environnement d'exécution | `development` |
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | *(vide avec WAMP)* |
| `DB_NAME` | Nom de la base de données | `educonnect` |
| `JWT_SECRET` | Clé secrète JWT | *(à générer)* |
| `JWT_EXPIRES_IN` | Durée de vie JWT | `24h` |
| `FIREBASE_PROJECT_ID` | Identifiant Firebase | — |
| `FIREBASE_PRIVATE_KEY` | Clé privée Firebase | — |
| `FIREBASE_CLIENT_EMAIL` | Compte de service Firebase | — |
| `UPLOAD_DIR` | Répertoire des fichiers | `./uploads` |
| `EXPO_PUBLIC_API_URL` | URL API utilisée par Expo | `http://10.0.2.2:3000/api` |

## Dépannage

### L'application mobile affiche `Network Error`

1. Vérifiez que le backend répond sur `http://localhost:3000/api/health` depuis le PC.
2. Sur Android Emulator, utilisez `10.0.2.2` au lieu de `localhost`.
3. Sur un téléphone physique, utilisez l'IPv4 LAN du PC et assurez-vous que le téléphone et le PC sont sur le même réseau.
4. Autorisez le port 3000 dans le pare-feu Windows si nécessaire.
5. Redémarrez Expo après avoir changé `EXPO_PUBLIC_API_URL`.

### Erreur `ECONNREFUSED` lors de la connexion à MySQL

- Vérifiez que WAMPServer est démarré.
- Vérifiez `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` et `DB_NAME` dans `backend/.env`.

### Erreur `npm install`

- Vérifiez Node.js 18+.
- Réinstallez les dépendances avec `npm install` si nécessaire.

### Le code OTP n'arrive pas

Le backend ne doit pas prétendre qu'un SMS a été envoyé tant qu'un fournisseur SMS réel n'est pas configuré. Vérifiez la configuration et l'intégration du fournisseur SMS avant les tests de production.

### Notifications push

- Vérifiez `google-services.json` dans `mobile/`.
- Vérifiez les clés Firebase dans `backend/.env`.
- Vérifiez les permissions de notification sur l'appareil.

### Erreur de CORS dans le navigateur

- L'API configure CORS.
- L'Admin Web utilise `/api` avec le proxy Vite.
- Vérifiez que le backend est bien démarré sur le port 3000.

## Licence

Ce projet est propriétaire. Tous droits réservés.
