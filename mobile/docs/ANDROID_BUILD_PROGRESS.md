# EduConnect Mobile — Avancement du build Android natif

## 1. Objectif

Valider que la migration du dossier `mobile/` vers **React Native CLI bare** produit correctement une application Android native compilable, sans dépendance à Expo/Expo Router.

Cette documentation permet à un autre développeur de reprendre immédiatement l'étape Android.

---

## 2. État au 7 septembre 2026

**Statut : BUILD ANDROID DEBUG VALIDÉ**

Le build Gradle Android a été exécuté avec succès :

```text
BUILD SUCCESSFUL in 1h 16m 43s
272 actionable tasks: 272 executed
```

Commande utilisée :

```powershell
cd D:\EduConnect\mobile\android
.\gradlew.bat assembleDebug --stacktrace
```

---

## 3. Environnement validé

### Gradle

```text
Gradle 9.3.1
```

### Java

```text
OpenJDK 17.0.20.1 (Eclipse Adoptium)
```

### Système détecté par Gradle

```text
Windows 11 10.0 amd64
```

### Android SDK

```text
D:\Android
```

### SDK / NDK utilisés

Le build a automatiquement installé et validé :

- Android SDK Platform 36
- Android Build-Tools 35.0.0
- NDK 27.1.12297006
- CMake 3.22.1

Les licences Android nécessaires ont été acceptées automatiquement pendant le build.

---

## 4. Résultat technique

Les composants Android principaux ont été compilés avec succès, notamment :

- `react-native-keychain`
- `@react-native-async-storage/async-storage`
- `@react-native-community/netinfo`
- `react-native-safe-area-context`
- `react-native-gesture-handler`
- `react-native-screens`
- application Android `:app`
- composants CMake/NDK pour les architectures configurées

Le build a notamment exécuté avec succès les tâches CMake pour :

```text
arm64-v8a
armeabi-v7a
x86
x86_64
```

---

## 5. Avertissements observés

### SDK XML

Gradle a signalé :

```text
This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered.
```

Cela indique un décalage de version entre certains outils Android Studio / command-line tools. **Ce n'est pas bloquant actuellement**, puisque le build est réussi.

À surveiller lors d'une future mise à jour de l'environnement Android, mais ne pas modifier la configuration du projet uniquement pour cet avertissement.

### Manifest des dépendances

Plusieurs bibliothèques utilisent encore l'attribut `package` dans leur `AndroidManifest.xml`. Gradle indique que cet attribut est désormais ignoré au profit du namespace.

Concernés notamment :

- AsyncStorage
- NetInfo
- Keychain
- Safe Area Context

Ces avertissements proviennent de `node_modules` et n'empêchent pas le build. **Ne pas modifier directement les fichiers de `node_modules`.**

### APIs dépréciées

Des avertissements Kotlin/Java concernent principalement des API React Native ou Android dépréciées dans les dépendances natives. Ils ne bloquent pas le build.

### Hard links Windows

CMake a indiqué plusieurs fois qu'un hard link ne pouvait pas être créé et qu'une copie classique était utilisée à la place :

```text
Hard link ... failed. Doing a slower copy instead.
```

Cela ralentit le build mais ne constitue pas une erreur fonctionnelle.

### Gradle 10

Gradle signale que certaines fonctionnalités dépréciées seront incompatibles avec Gradle 10. Le projet utilise actuellement Gradle 9.3.1 et le build est validé.

---

## 6. Conclusion

La couche Android native de la migration React Native CLI est désormais **compilable**.

Le problème précédent du wrapper Windows Gradle est donc résolu et confirmé par un build complet réussi.

Le wrapper corrigé utilise Gradle 9.3.1 et fonctionne correctement dans l'environnement actuel.

---

## 7. Étape suivante

La prochaine validation est l'installation et le lancement de l'APK Debug sur le téléphone physique déjà détecté par ADB.

Appareil connu :

```text
07459371AL100210    device
TECNO_PR651E
```

Vérifier d'abord que l'APK existe :

```powershell
cd D:\EduConnect\mobile
Test-Path .\android\app\build\outputs\apk\debug\app-debug.apk
```

Puis installer :

```powershell
adb install -r .\android\app\build\outputs\apk\debug\app-debug.apk
```

Ensuite lancer Metro dans un premier terminal :

```powershell
cd D:\EduConnect\mobile
npm start -- --reset-cache
```

Puis lancer l'application installée depuis le téléphone. Si nécessaire, lancer :

```powershell
adb shell monkey -p com.educonnect.mobile 1
```

La prochaine grande étape sera de valider le démarrage React Native, la navigation native et l'écran de connexion sur appareil réel.

---

## 8. Git / documentation

Cette documentation est créée après validation du build Android, conformément à la règle du projet : chaque grande étape validée doit laisser une trace `.md` dans le dossier concerné.

Commit documentaire :

`docs: document successful Android debug build`

Le SHA de ce commit est fourni par GitHub après création du fichier.

---

## 9. Règle pour la suite

Ne pas considérer les avertissements actuels comme des erreurs tant qu'ils ne provoquent pas d'échec fonctionnel.

Pour toute prochaine erreur Android :

1. conserver le premier bloc `FAILURE` ;
2. identifier la tâche Gradle exacte qui échoue ;
3. corriger uniquement la cause identifiée ;
4. relancer le build ;
5. documenter la grande correction dans ce dossier avant de passer à l'étape suivante.
