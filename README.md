# EduConnect - Plateforme de Communication Scolaire

EduConnect est une plateforme complète de communication entre les établissements scolaires et les parents d'élèves. Elle permet aux administrateurs d'envoyer des messages ciblés aux parents, de gérer les groupes intelligents, de programmer des envois planifiés et de suivre les accusés de lecture en temps réel.

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| **Authentification OTP mobile** | Connexion sécurisée des parents via matricule + numéro de téléphone avec code OTP |
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
│   ├── src/
│   │   ├── components/ui/  # Composants UI réutilisables
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── layouts/        # Mise en page
│   │   ├── pages/          # Pages de l'application
│   │   ├── routes/         # Configuration des routes
│   │   ├── services/       # Appels API
│   │   ├── store/          # Gestion d'état (Zustand)
│   │   ├── types/          # Types TypeScript
│   │   └── utils/          # Utilitaires
│   └── package.json
├── mobile/                 # Application mobile (React Native + Expo)
│   ├── app/                # Routes Expo Router
│   │   ├── (tabs)/         # Onglets principaux
│   │   ├── auth/           # Écrans d'authentification
│   │   ├── messages/       # Détail d'un message
│   │   ├── settings/       # Paramètres
│   │   └── children/       # Fiches enfants
│   ├── src/
│   │   ├── components/     # Composants partagés et UI
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── notifications/  # Gestion des notifications push
│   │   ├── services/       # Appels API
│   │   ├── storage/        # Stockage local et mode hors ligne
│   │   ├── theme/          # Thème de l'application
│   │   └── types/          # Types TypeScript
│   └── package.json
├── database/
│   ├── educonnect.sql      # Structure de la base de données
│   └── seed.sql            # Données de test
└── docs/                   # Documentation
    ├── INSTALLATION.md     # Guide d'installation détaillé
    ├── DATABASE.md         # Documentation de la base de données
    ├── API.md              # Documentation de l'API REST
    └── ARCHITECTURE.md     # Documentation de l'architecture
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

- **Node.js 18+** ([https://nodejs.org](https://nodejs.org))
- **npm** (inclus avec Node.js) ou **yarn**
- **WAMPServer** avec MySQL ([https://www.wampserver.com](https://www.wampserver.com))
- **Android Studio** (pour la compilation APK) ou **Expo Go** (pour le développement)
- **Git** (optionnel)

## Démarrage rapide

### Étape 1 — Base de données

1. Lancez **WAMPServer** (l'icône WAMP dans la barre de tâches doit devenir **verte**)
2. Ouvrez **phpMyAdmin** dans votre navigateur : [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
3. Créez une base de données nommée `educonnect` (ou importez directement)
4. Importez le fichier `database/educonnect.sql` dans phpMyAdmin
5. Importez également le fichier `database/seed.sql` pour les données de test

### Étape 2 — Backend (API)

```bash
cd backend
copy .env.example .env    # Sous Windows
# cp .env.example .env       # Sous Linux/Mac
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

Vérifiez le bon fonctionnement : [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Étape 3 — Interface d'administration (Admin Web)

```bash
cd admin-web
npm install
npm run dev
```

L'interface s'ouvre automatiquement dans votre navigateur : [http://localhost:5173](http://localhost:5173)

### Étape 4 — Application mobile

```bash
cd mobile
npm install
npx expo start
```

1. Installez **Expo Go** sur votre smartphone Android
2. Scannez le **code QR** affiché dans le terminal
3. L'application s'ouvre sur votre téléphone

## Comptes de test

Les comptes suivants sont créés par le fichier `database/seed.sql` :

| Rôle | Identifiant | Mot de passe | Notes |
|---|---|---|---|
| **Super Admin** | `directeur@lareussite.ci` | `Admin@2026` | Accès complet à toutes les fonctionnalités |
| **Admin** | `secretariat@lareussite.ci` | `Admin@2026` | Accès à la plupart des fonctionnalités |
| **Parent (mobile)** | Matricule : `PAR-001` | — | Téléphone : `+2250700000010` |

> **Note pour l'authentification mobile** : Le code OTP est affiché dans la **console du backend** (terminal où tourne `npm run dev`). Saisissez ce code dans l'application mobile pour vous connecter.

## Compilation APK

Pour générer un fichier APK de prévisualisation :

```bash
cd mobile
eas build --platform android --profile preview
```

> **Prérequis** : Installez EAS CLI avec `npm install -g eas-cli` et connectez-vous avec `eas login`.

## Configuration Firebase (notifications push)

Firebase est **optionnel** mais nécessaire pour les notifications push.

1. Créez un projet sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activez **Cloud Messaging**
3. Téléchargez `google-services.json` et placez-le à la racine de `mobile/`
4. Téléchargez `GoogleService-Info.plist` et placez-le dans `mobile/ios/`
5. Mettez à jour la configuration dans `mobile/src/notifications/`
6. Mettez à jour le fichier `backend/.env` avec les clés du compte de service Firebase

## Variables d'environnement

Le fichier `backend/.env` contient les variables suivantes :

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port du serveur backend | `3000` |
| `NODE_ENV` | Environnement d'exécution | `development` |
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | *(vide avec WAMP)* |
| `DB_NAME` | Nom de la base de données | `educonnect` |
| `JWT_SECRET` | Clé secrète pour les tokens JWT | *(à générer)* |
| `JWT_EXPIRES_IN` | Durée de vie des tokens JWT | `24h` |
| `FIREBASE_PROJECT_ID` | Identifiant du projet Firebase | — |
| `FIREBASE_PRIVATE_KEY` | Clé privée Firebase | — |
| `FIREBASE_CLIENT_EMAIL` | Email du compte de service Firebase | — |
| `UPLOAD_DIR` | Répertoire des fichiers uploadés | `./uploads` |

## Dépannage

### L'icône WAMP reste orange ou rouge
- Vérifiez que le port **80** n'est pas utilisé par un autre service (Skype, IIS, etc.)
- Redémarrez WAMPServer
- Vérifiez les logs dans `WAMPServer/logs/`

### Erreur `ECONNREFUSED` lors de la connexion à MySQL
- Vérifiez que WAMPServer est bien lancé (icône verte)
- Vérifiez les paramètres de connexion dans `backend/.env` :
  - `DB_HOST=localhost`
  - `DB_PORT=3306`
  - `DB_USER=root`
  - `DB_PASSWORD=` *(vide)*

### Erreur `npm install` échoue
- Supprimez `node_modules` et `package-lock.json`, puis relancez `npm install`
- Vérifiez que vous utilisez **Node.js 18+** : `node -v`

### L'application mobile ne se connecte pas au backend
- Vérifiez que le backend tourne bien sur `http://localhost:3000`
- Sur un appareil physique, remplacez `localhost` par l'**adresse IP locale** de votre ordinateur dans la configuration API du mobile
- Vérifiez que votre pare-feu n' bloque pas le port 3000

### Le code OTP n'arrive pas (pas de SMS)
- En mode développement, l'OTP est **affiché dans la console du backend**, pas envoyé par SMS
- Vérifiez la configuration Twilio/Firebase dans le fichier `.env` pour l'envoi réel de SMS

### Notifications push ne fonctionnent pas
- Vérifiez que `google-services.json` est bien placé dans `mobile/`
- Vérifiez que les clés Firebase sont configurées dans `backend/.env`
- Vérifiez que les notifications sont autorisées sur l'appareil mobile

### Erreur de CORS dans le navigateur
- Le backend inclut déjà la gestion des CORS
- Vérifiez que l'URL de l'API dans `admin-web/src/services/api.ts` est correcte

## Licence

Ce projet est propriétaire. Tous droits réservés.
