# EduConnect Mobile — Avancement de la migration vers React Native CLI

## 1. Objectif

Le dossier `mobile/` est en cours de migration d'une application Expo/Expo Router vers une application **React Native CLI bare**, afin de supprimer la dépendance à Expo et de reprendre le contrôle de la couche Android native.

Cette documentation est destinée à permettre à une autre personne de reprendre le projet sans devoir reconstituer les décisions prises précédemment.

---

## 2. État actuel

**Date : 7 septembre 2026**

### Migration effectuée

- Expo et Expo Router retirés des dépendances du mobile.
- Scripts npm convertis vers React Native CLI.
- Navigation migrée vers React Navigation natif.
- Configuration Babel, Metro et TypeScript adaptée à React Native CLI.
- Détection appareil réel / émulateur adaptée pour ne plus dépendre de `expo-device`.
- Squelette Android natif ajouté.
- `npm install` exécuté avec succès après la migration.
- Metro démarre correctement sur `http://localhost:8081`.
- Aucune référence `expo-router` restante détectée dans le dépôt.
- Aucune importation `from 'expo...'` restante détectée dans le dépôt.

### Commit de migration principal

`a4ca1b23c1b65f55366eedd0fdc133e1f469643a`

Message : `refactor mobile app to React Native CLI without Expo`

### Correction actuelle

Le premier lancement Android a révélé un problème dans le script Windows `mobile/android/gradlew.bat` : le téléchargement de Gradle était lancé, mais le déplacement manuel du dossier extrait pouvait échouer avec :

`Le chemin d'accès spécifié est introuvable.`

Le script a été corrigé pour :

1. télécharger Gradle 9.3.1 ;
2. extraire directement dans `%USERPROFILE%\\.gradle\\educonnect-gradle` ;
3. utiliser directement `gradle-9.3.1\\bin\\gradle.bat` ;
4. vérifier que `gradle.bat` existe avant de lancer le build.

Commit de correction :

`ad60748751114b92a9505e278d7325508293a83d`

---

## 3. Résultat des tests déjà réalisés

### Installation npm

Commande :

```powershell
cd D:\EduConnect\mobile
npm install
```

Résultat :

```text
added 198 packages, removed 230 packages, and changed 1 package
```

**Statut : OK**

### Metro

Commande :

```powershell
npm start
```

Résultat :

```text
Welcome to React Native v0.86
Welcome to Metro v0.84.5
Dev server ready on http://localhost:8081
```

**Statut : OK**

### Android

Commande :

```powershell
npm run android
```

Le CLI a détecté un processus utilisant déjà le port 8081 et a proposé le port 8082. Le build a ensuite échoué pendant l'initialisation de Gradle avec :

```text
Downloading Gradle 9.3.1...
Le chemin d'accès spécifié est introuvable.
error Failed to install the app.
```

**Statut : NON VALIDÉ**

La correction du wrapper Gradle a été appliquée. Le prochain test doit être effectué après récupération du dernier `main`.

---

## 4. Environnement Android connu comme fonctionnel

### Java

Java 17 Temurin est installé et doit rester utilisé pour ce projet.

### Android SDK

```text
ANDROID_HOME=D:\Android
ANDROID_SDK_ROOT=D:\Android
```

Le PATH contient notamment :

```text
D:\Android\platform-tools
D:\Android\emulator
D:\Android\cmdline-tools\latest\bin
```

### Appareil physique

ADB détecte le téléphone :

```text
07459371AL100210    device
```

Modèle : `TECNO_PR651E`

### Réseau local

PC : `192.168.1.68`

Backend : `http://192.168.1.68:3000`

Le port 3000 est accessible depuis le PC et écoute sur toutes les interfaces.

---

## 5. Prochaine procédure obligatoire

Après avoir récupéré le dernier commit :

```powershell
cd D:\EduConnect

git pull --ff-only origin main
```

Puis vérifier le wrapper :

```powershell
cd D:\EduConnect\mobile\android
.\gradlew.bat --version
```

Le premier lancement doit télécharger Gradle 9.3.1. Une fois terminé, la commande doit afficher la version de Gradle sans erreur.

Ensuite revenir dans le mobile :

```powershell
cd D:\EduConnect\mobile
```

Vérifier d'abord les processus utilisant le port 8081 :

```powershell
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
```

Si un ancien processus Metro est encore actif, l'arrêter avant de relancer Metro.

Puis lancer :

```powershell
npm start -- --reset-cache
```

Dans un **deuxième terminal** :

```powershell
cd D:\EduConnect\mobile
npm run android
```

Ne pas accepter automatiquement le port 8082 si Metro est censé rester sur 8081. Le port Metro et le port passé au build Android doivent rester cohérents.

---

## 6. Si Gradle fonctionne mais que le build échoue ensuite

Ne pas modifier plusieurs fichiers au hasard.

Exécuter :

```powershell
cd D:\EduConnect\mobile\android
.\gradlew.bat app:assembleDebug --stacktrace
```

Puis conserver le **premier bloc `FAILURE` / `What went wrong`**. C'est ce bloc qui doit guider la correction suivante.

Après chaque grande correction Android, mettre à jour cette documentation avec :

- la date ;
- le problème rencontré ;
- la cause ;
- les fichiers modifiés ;
- la commande de validation ;
- le résultat ;
- le SHA du commit.

---

## 7. Architecture cible du mobile

```text
mobile/
├── android/                 # Projet Android natif React Native
├── docs/                    # Documentation de reprise et avancement
├── src/
│   ├── config/
│   ├── hooks/
│   ├── navigation/         # React Navigation
│   ├── notifications/
│   ├── screens/
│   └── services/
├── App.tsx                 # Point d'entrée React Native
├── index.js                # Entrée native
├── babel.config.js
├── metro.config.js
├── package.json
└── tsconfig.json
```

Expo Router ne doit plus être réintroduit dans cette architecture.

---

## 8. Règle de documentation pour la suite

À partir de cette étape, **chaque grande étape validée doit laisser une trace `.md` dans le dossier concerné**.

Exemples :

- migration React Native CLI → `mobile/docs/MIGRATION_REACT_NATIVE_CLI_PROGRESS.md` ;
- Android build stabilisé → `mobile/docs/ANDROID_BUILD_PROGRESS.md` ;
- authentification mobile stabilisée → `mobile/docs/AUTH_PROGRESS.md` ;
- API mobile stabilisée → `mobile/docs/API_INTEGRATION_PROGRESS.md` ;
- notifications natives → `mobile/docs/NOTIFICATIONS_PROGRESS.md`.

Le fichier doit toujours permettre à un nouveau développeur de comprendre **où le projet en est, ce qui fonctionne, ce qui reste à faire et comment reprendre immédiatement**.

---

## 9. Prochaine grande étape

### Étape suivante : stabiliser le build Android

Objectif : obtenir avec succès :

```text
BUILD SUCCESSFUL
```

puis installer l'application sur le téléphone physique via :

```powershell
npm run android
```

Une fois cette étape validée, créer/mettre à jour la documentation Android correspondante avant de passer à la fonctionnalité suivante.
