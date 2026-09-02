# Guide d'installation détaillé

Ce guide détaille chaque étape pour installer et configurer EduConnect sur votre machine de développement.

---

## Table des matières

1. [Installation de WAMPServer](#1-installation-de-wampserver)
2. [Installation du Backend](#2-installation-du-backend)
3. [Installation de l'Admin Web](#3-installation-de-ladmin-web)
4. [Installation de l'application mobile](#4-installation-de-lapplication-mobile)
5. [Configuration de Firebase](#5-configuration-de-firebase)

---

## 1. Installation de WAMPServer

WAMPServer fournit un environnement local avec Apache, PHP et MySQL, nécessaire pour faire tourner la base de données EduConnect.

### 1.1 Téléchargement

1. Rendez-vous sur [https://www.wampserver.com](https://www.wampserver.com)
2. Téléchargez la dernière version de WAMPServer (64 bits recommandé)
3. Assurez-vous que votre système est à jour (Visual C++ Redistributable requis)

### 1.2 Installation

1. Exécutez le programme d'installation
2. Suivez les étapes de l'assistant
3. Conservez le répertoire d'installation par défaut (`C:\wamp64`)
4. Terminez l'installation

### 1.3 Lancement

1. Lancez **WAMPServer** depuis le menu Démarrer ou le raccourci bureau
2. Une icône **W** apparaît dans la barre de tâches (zone de notification)
3. Attendez que l'icône passe du **rouge** → **orange** → **vert**

> **L'icône doit être VERTE** pour indiquer que tous les services (Apache + MySQL) fonctionnent correctement.

### 1.4 Accès à phpMyAdmin

1. Ouvrez votre navigateur
2. Allez à l'adresse : [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
3. Vous êtes connecté automatiquement en tant qu'utilisateur `root` (sans mot de passe)

### 1.5 Importation de la base de données

**Option A — Créer et importer manuellement :**

1. Dans phpMyAdmin, cliquez sur **Nouvelle base de données** (dans le menu de gauche)
2. Saisissez le nom : `educonnect`
3. Sélectionnez l'interclassement : `utf8mb4_unicode_ci`
4. Cliquez sur **Créer**
5. Sélectionnez la base `educonnect` dans le menu de gauche
6. Cliquez sur l'onglet **Importer**
7. Cliquez sur **Choisir un fichier** et sélectionnez `database/educonnect.sql`
8. Cliquez sur **Exécuter**
9. Répétez l'opération avec `database/seed.sql` pour les données de test

**Option B — Import direct (crée automatiquement la base) :**

1. Dans phpMyAdmin, cliquez sur l'onglet **Importer** (sans avoir sélectionné de base)
2. Sélectionnez `database/educonnect.sql`
3. Cliquez sur **Exécuter**
4. La base `educonnect` est créée automatiquement
5. Importez ensuite `database/seed.sql`

### 1.6 Vérification

Après l'importation, vous devriez voir la base `educonnect` dans le menu de gauche de phpMyAdmin avec toutes les tables (environ 20 tables).

---

## 2. Installation du Backend

Le backend est l'API REST qui sert de pont entre la base de données, l'interface d'administration et l'application mobile.

### 2.1 Préparation

Ouvrez un terminal et naviguez vers le dossier du backend :

```bash
cd backend
```

### 2.2 Installation des dépendances

```bash
npm install
```

> **Note** : Si vous préférez yarn : `yarn install`

### 2.3 Configuration de l'environnement

Copiez le fichier d'exemple d'environnement :

```bash
# Sous Windows
copy .env.example .env

# Sous Linux/Mac
cp .env.example .env
```

Ouvrez le fichier `.env` avec un éditeur de texte et vérifiez la configuration de la connexion MySQL :

```env
# Configuration de la base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=educonnect
```

> **Important** : Avec WAMPServer, le mot de passe de l'utilisateur `root` est **vide**. Laissez `DB_PASSWORD` sans valeur.

Vérifiez également les autres variables :

```env
# Serveur
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=votre-cle-secrete-ici-a-changer
JWT_EXPIRES_IN=24h
```

### 2.4 Démarrage du serveur

```bash
npm run dev
```

Le serveur démarre sur le port 3000. Vous devriez voir un message similaire à :

```
[EduConnect] Serveur démarré sur le port 3000
[EduConnect] Environnement : development
```

### 2.5 Vérification

Ouvrez votre navigateur et accédez à :

- **Health check** : [http://localhost:3000/api/health](http://localhost:3000/api/health)

Vous devriez recevoir une réponse JSON :

```json
{
  "success": true,
  "message": "EduConnect API opérationnelle",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

> **En cas d'erreur** : vérifiez que WAMPServer est vert et que les paramètres MySQL dans `.env` sont corrects.

---

## 3. Installation de l'Admin Web

L'interface d'administration est une application React qui permet de gérer l'ensemble de la plateforme.

### 3.1 Préparation

Ouvrez un **nouveau terminal** et naviguez vers le dossier de l'admin web :

```bash
cd admin-web
```

### 3.2 Installation des dépendances

```bash
npm install
```

### 3.3 Démarrage

```bash
npm run dev
```

L'application se compile et s'ouvre automatiquement dans votre navigateur par défaut à l'adresse :

**[http://localhost:5173](http://localhost:5173)**

### 3.4 Connexion

Utilisez l'un des comptes de test pour vous connecter :

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | `directeur@lareussite.ci` | `Admin@2026` |
| Admin | `secretariat@lareussite.ci` | `Admin@2026` |

### 3.5 Vérification

Après connexion, vous devriez voir le **tableau de bord** avec les statistiques de l'établissement. Si vous obtenez une erreur d'authentification, vérifiez que le backend est bien en cours d'exécution.

---

## 4. Installation de l'application mobile

L'application mobile permet aux parents de consulter les messages reçus de l'établissement.

### 4.1 Méthode A — Développement avec Expo Go (recommandé pour le développement)

#### Préparation

Ouvrez un **nouveau terminal** et naviguez vers le dossier mobile :

```bash
cd mobile
```

#### Installation des dépendances

```bash
npm install
```

#### Démarrage du serveur de développement

```bash
npx expo start
```

Un **code QR** s'affiche dans le terminal.

#### Installation d'Expo Go sur le smartphone

1. Ouvrez le **Google Play Store** sur votre smartphone Android
2. Recherchez **Expo Go**
3. Installez l'application

#### Connexion

1. Assurez-vous que votre smartphone et votre ordinateur sont sur le **même réseau Wi-Fi**
2. Ouvrez **Expo Go** sur votre smartphone
3. Scannez le **code QR** affiché dans le terminal
4. L'application EduConnect se charge sur votre téléphone

#### Authentification mobile

1. Sur l'écran de connexion, saisissez le **matricule** : `PAR-001`
2. Saisissez le **numéro de téléphone** : `+2250700000010`
3. Cliquez sur **Demander le code OTP**
4. Le code OTP s'affiche dans la **console du backend** (terminal où tourne `npm run dev`)
5. Saisissez le code OTP dans l'application mobile
6. Vous êtes connecté !

### 4.2 Méthode B — Compilation sur un appareil physique (USB)

Si vous ne pouvez pas utiliser le QR code (pare-feu, réseaux différents), vous pouvez exécuter l'application directement sur un appareil connecté par USB.

#### Prérequis

- **Android Studio** installé ([https://developer.android.com/studio](https://developer.android.com/studio))
- Un smartphone Android avec le **mode développeur** activé et le **débogage USB** activé

#### Étapes

1. Connectez votre smartphone à votre ordinateur via USB
2. Vérifiez que l'appareil est détecté :

```bash
adb devices
```

3. Lancez l'application :

```bash
cd mobile
npx expo run:android
```

4. L'application se compile et s'installe automatiquement sur votre smartphone

### 4.3 Méthode C — Compilation APK avec EAS Build

Pour générer un fichier APK distribuable :

```bash
cd mobile
eas build --platform android --profile preview
```

> **Prérequis** : `npm install -g eas-cli` puis `eas login`

Le fichier APK généré peut être téléchargé depuis le tableau de bord EAS ou partagé directement.

---

## 5. Configuration de Firebase

Firebase est **optionnel** mais nécessaire pour les **notifications push**.

### 5.1 Création du projet Firebase

1. Rendez-vous sur [console.firebase.google.com](https://console.firebase.google.com)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **Ajouter un projet**
4. Saisissez un nom de projet (ex. : `educonnect-app`)
5. Suivez les étapes de création
6. Activez **Google Analytics** si souhaité (optionnel)

### 5.2 Enregistrement de l'application Android

1. Dans le tableau de bord Firebase, cliquez sur l'icône **Android**
2. Saisissez le **nom du package** Android (ex. : `ci.lareussite.educonnect`)
3. Saisissez le **nom de l'application** (ex. : `EduConnect`)
4. Saisissez le **SHA-1** de signature de débogage (optionnel pour le développement)
5. Cliquez sur **Inscrire l'application**
6. Téléchargez le fichier **`google-services.json`**
7. Placez ce fichier à la **racine** du dossier `mobile/` :

```
mobile/
├── google-services.json    ← Placer ici
├── app/
├── src/
└── package.json
```

### 5.3 Enregistrement de l'application iOS (si applicable)

1. Cliquez sur l'icône **iOS** dans Firebase
2. Saisissez l'identifiant du bundle
3. Téléchargez le fichier **`GoogleService-Info.plist`**
4. Placez-le dans `mobile/ios/` :

```
mobile/
├── ios/
│   └── GoogleService-Info.plist    ← Placer ici
├── app/
└── package.json
```

### 5.4 Activation de Cloud Messaging

1. Dans Firebase Console, allez dans **Paramètres du projet** → **Cloud Messaging**
2. Vérifiez que Cloud Messaging est **activé**
3. Notez la **clé du serveur** (Server Key)

### 5.5 Configuration du compte de service (Backend)

1. Dans Firebase Console, allez dans **Paramètres du projet** → **Comptes de service**
2. Cliquez sur **Créer une clé privée** pour un nouveau compte de service
3. Téléchargez le fichier JSON contenant les clés
4. Ouvrez le fichier et extrayez les valeurs nécessaires
5. Mettez à jour le fichier `backend/.env` :

```env
# Configuration Firebase
FIREBASE_PROJECT_ID=votre-projet-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVotre clé privée ici\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=votre-service-account@votre-projet.iam.gserviceaccount.com
```

### 5.6 Mise à jour de la configuration mobile

Vérifiez que les fichiers de notification dans `mobile/src/notifications/` sont correctement configurés :

- `mobile/src/notifications/index.ts` — Initialisation des notifications
- `mobile/src/notifications/handlers.ts` — Gestionnaires de réception de notifications

### 5.7 Vérification

1. Redémarrez le backend : `npm run dev` (dans `backend/`)
2. Relancez l'application mobile
3. Envoyez un message depuis l'admin web à un parent
4. Le parent devrait recevoir une **notification push** sur son téléphone

---

## Résumé des ports

| Service | URL | Port |
|---|---|---|
| MySQL (WAMP) | `localhost` | `3306` |
| phpMyAdmin | [http://localhost/phpmyadmin](http://localhost/phpmyadmin) | `80` |
| Backend API | [http://localhost:3000](http://localhost:3000) | `3000` |
| Admin Web | [http://localhost:5173](http://localhost:5173) | `5173` |
| Expo Dev Server | [http://localhost:8081](http://localhost:8081) | `8081` |
