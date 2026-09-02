# Audit complet EduConnect

## 1. Résumé exécutif

L’audit montre un projet globalement bien structuré, mais avec plusieurs écarts importants entre le schéma MySQL, le backend, le front admin et le mobile. Le problème principal ne vient pas d’une seule page ou d’un seul composant : il résulte d’une incohérence globale sur les identifiants d’authentification, les rôles, les URLs et les formats d’API.

Les points les plus graves sont :

- le backend admin se connecte uniquement avec `email + password`, alors que le mobile utilise `matricule + phone` et OTP ;
- les rôles de la base et les rôles attendus par les frontends ne sont pas totalement alignés avec les types et les validations ;
- le frontend admin App s’appuie sur un hook d’authentification qui ne correspond pas à la vraie signature du backend ;
- le mobile utilise des URLs `http://localhost` et `http://10.0.2.2` sans distinction claire entre simulateurs, téléphone réel et machine de développement ;
- le schéma SQL et les types TypeScript ne sont pas totalement cohérents sur l’usage de `email`, `phone`, `matricule`, `role_id` et `password_hash` ;
- les builds réels du backend et du front admin échouent avec des erreurs de typage, ce qui confirme que le projet n’est pas en état de production stable.

L’audit confirme que les comptes de démonstration actuels peuvent être utilisés dans certains cas seulement, mais pas de manière fiable pour tester toute l’authentification de l’application.

---

## 2. État général du projet

Le projet est organisé en quatre modules principaux :

- backend/ : API Node.js + Express + TypeScript + MySQL
- admin-web/ : front React + Vite + Tailwind
- mobile/ : application Expo/React Native
- database/ : schéma MySQL et scripts de données

Le projet a bien une architecture cohérente, mais plusieurs modules ont suivi des conventions différentes. Les fichiers de base sont globalement présents et structurés selon des responsabilités logiques : routes, controllers, services, repositories, middleware, validators, config.

Cependant, il existe des divergences fortes entre ce qui est attendu par le code UI et ce que le backend implémente réellement.

### État de vérification

- Backend : compilation TypeScript bloquée par des erreurs de typage liées à `RequestWithUser` et à la signature Express ;
- Admin Web : build bloqué par des erreurs de typage sur le composant `Table` et sur la signature de la méthode `login` ;
- Mobile : configuration Expo présente, mais l’URL backend est sensible aux environnements ;
- Base MySQL : schema globalement solide, mais les données de seed ne sont pas adaptées à la réalité d’authentification des fronts.

---

## 3. Problèmes critiques

### 1. Backend admin login : mismatch entre le vrai contrat et le front

- Fichier : [backend/src/services/auth.service.ts](backend/src/services/auth.service.ts)
- Code concerné : `login(email: string, password: string)` + `WHERE u.email = ?`
- Cause : le backend admin ne permet que l’authentification par email, tandis que le projet enfant mobile est fondé sur OTP + matricule + téléphone.
- Conséquence : le front admin peut se connecter uniquement avec un compte admin email, mais pas avec des identifiants de type mobile / parent / élève / personnel.
- Solution recommandée : standardiser un single login contract, ou bien distinguer explicitement admin login et mobile login.

### 2. Les types d’authentification ne sont pas alignés entre front admin et backend

- Fichier : [admin-web/src/services/auth.service.ts](admin-web/src/services/auth.service.ts)
- Fichier : [admin-web/src/store/authStore.tsx](admin-web/src/store/authStore.tsx)
- Fichier : [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts)
- Cause : le front admin appelle `login(email, password)` mais le hook `AuthProvider` a une signature `login(matricule: string)` qui ne correspond pas au service réel.
- Conséquence : TypeScript et runtime ne sont pas cohérents.
- Solution : harmoniser la signature et les appels.

### 3. Le backend ne valide pas le login admin au niveau de la structure attendue par le front

- Fichier : [backend/src/validators/auth.validator.ts](backend/src/validators/auth.validator.ts)
- Cause : `validateLogin()` vérifie seulement `matricule`, mais le controller attend `email`.
- Conséquence : validation incohérente ; les erreurs/backend et front ne se parlent pas le même langage.
- Solution : adopter un schéma unique : `email` pour admin, `matricule + phone` pour mobile OTP.

### 4. Le build TypeScript global du backend tombe en erreur

- Fichier : [backend/src/types/index.ts](backend/src/types/index.ts)
- Résultat de vérification : `npm run build` du backend échoue sur des erreurs TS2769 dans les routes Express, liées à `RequestWithUser` / `authenticate`.
- Cause : type Express personnalisé incompatible avec les signatures des handlers.
- Conséquence : le backend ne compile correctement et l’application ne peut pas être validée avant exécution.

### 5. Le build du front admin tombe en erreur

- Fichier : [admin-web/src/components/ui/Table.tsx](admin-web/src/components/ui/Table.tsx)
- Résultat de vérification : `npm run build` échoue sur de nombreux `TS2322`, notamment sur la signature `Table` et la méthode `login`. 
- Cause : composants génériques mal typés et `AuthProvider.login` incohérent.
- Conséquence : front admin non buildable.

---

## 4. Problèmes majeurs

### 1. URL backend mobile : `localhost` est incorrect sur téléphone réel

- Fichier : [mobile/src/services/api.ts](mobile/src/services/api.ts)
- Fichier : [mobile/app.config.js](mobile/app.config.js)
- Cause : le backend mobile utilise `http://localhost:3000/api` ou `http://10.0.2.2:3000/api` selon l’environnement ; cette dernière est uniquement adaptée à l’émulateur Android.
- Conséquence : sur Expo Go sur un vrai téléphone, `localhost` pointe vers le téléphone lui-même. La requête ne trouve pas le backend local.
- Solution : exposer l’IP locale du PC et la configurer via `EXPO_PUBLIC_API_URL`.

### 2. Le mobile est conçu pour le OTP, mais le backend `login` admin n’est pas adapté à la logique mobile

- Fichier : [mobile/src/services/auth.service.ts](mobile/src/services/auth.service.ts)
- Fichier : [backend/src/services/otp.service.ts](backend/src/services/otp.service.ts)
- Cause : le mobile n’utilise pas `email + password` ; il utilise `matricule + phone`, puis OTP. Le admin web utilise le login email/password. Le backend a deux chemins distincts, mais aucun contrat unifié.
- Conséquence : les comptes admin et mobile peuvent être différents selon le canal, ce qui complique l’audit et la maintenance.

### 3. Les seed données contiennent des hashes bcrypt qui ne sont pas explicitement liés aux mots de passe demandés

- Fichier : [database/seed.sql](database/seed.sql)
- Cause : le SQL utilise un hash global `@bcrypt_hash` avec la note “bcrypt hash for Admin@2026”, mais le mot de passe réel n’est pas explicitement reconstruit et validé pour tous les comptes de test.
- Conséquence : les comptes de test ne peuvent pas être validés sans vérifier le hash en contexte réel.
- Solution : générer un hash dédié pour chaque mot de passe de test et l’inscrire dans un script de test séparé.

### 4. Le schéma SQL contient un `users.email` unique mais le login admin n’est pas le seul mécanisme d’authentification

- Fichier : [database/educonnect.sql](database/educonnect.sql)
- Cause : `users.email` est unique, mais l’auth mobile dépend de `matricule` + `phone` ; la logique de validation et de login est donc scindée.
- Conséquence : les règles métier varient selon la partie du système.

### 5. Le code de sécurité OTP stocke le code en clair

- Fichier : [backend/src/services/otp.service.ts](backend/src/services/otp.service.ts)
- Cause : `UPDATE users SET otp_code = ?` et comparaison directe `if (code !== user.otp_code)`.
- Conséquence : vulnérabilité et incohérence de sécurité ; OTP non hashé, plus facile à exposer ou à récupérer via logs/debug.

---

## 5. Problèmes moyens

### 1. `validateLogin` exige `matricule` alors que le controller attend `email`

- Fichier : [backend/src/validators/auth.validator.ts](backend/src/validators/auth.validator.ts)
- Fichier : [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts)
- Cause : l’un attend `matricule`, l’autre `email`.
- Conséquence : validation contradictoire et erreurs incohérentes.

### 2. `authStore` et `AuthProvider` ne correspondent pas à la signature réelle du service

- Fichier : [admin-web/src/store/authStore.tsx](admin-web/src/store/authStore.tsx)
- Fichier : [admin-web/src/services/auth.service.ts](admin-web/src/services/auth.service.ts)
- Cause : `login: (matricule: string) => Promise<void>` est déclaré alors que le service est `login(email: string, password: string)`.
- Conséquence : l’état global est invalide et le front ne peut pas gérer correctement les identifiants réels.

### 3. La partie mobile a des identifiants différents selon les écrans

- Fichier : [mobile/app/auth/login.tsx](mobile/app/auth/login.tsx)
- Fichier : [mobile/src/hooks/useAuth.ts](mobile/src/hooks/useAuth.ts)
- Cause : `login` dans le hook attend `matricule + phone`, alors que `AuthService.requestOtp` ne fait pas de login classique mais demande un OTP.
- Conséquence : confusion des concepts et risque d’erreurs de navigation ou d’état.

### 4. `UserRole` côté admin est incohérent avec le backend SQL

- Fichier : [admin-web/src/types/index.ts](admin-web/src/types/index.ts)
- Cause : `UserRole = 'ADMIN' | 'STAFF' | 'TEACHER' | 'PARENT' | 'STUDENT'` ne correspond pas à `SUPER_ADMIN`, `ADMIN`, `STAFF`, `PARENT`, `STUDENT` du backend.
- Conséquence : l’application admin risque de traiter des rôles non valides ou de ne pas autoriser les accès corrects.

### 5. Les variables d’environnement sont redundantes et non uniformisées

- Fichier : [.env.example](.env.example)
- Fichier : [backend/.env.example](backend/.env.example)
- Cause : mélange de `DB_*`, `MYSQL_*`, `JWT_*`, `VITE_API_URL`, `EXPO_PUBLIC_API_URL`.
- Conséquence : confusion de naming et risques de variables non lues ou mal définies.

---

## 6. Problèmes mineurs

### 1. Le projet ne distingue pas clairement test / prod

- Fichiers : [database/seed.sql](database/seed.sql), [database/educonnect.sql](database/educonnect.sql)
- Cause : pas de séparation de base ni de script dédié sécurisant le test.
- Conséquence : risque d’écrasement ou de pollution de données en prod.

### 2. Les messages de logs exposent des OTP en clair

- Fichier : [backend/src/services/otp.service.ts](backend/src/services/otp.service.ts)
- Cause : `console.log('[OTP] Code for matricule ...')` affiche le code OTP.
- Conséquence : fuite de sécurité dans les logs.

### 3. `app.config.js` fixe `apiUrl` à `10.0.2.2` sans support multi-environnement

- Fichier : [mobile/app.config.js](mobile/app.config.js)
- Cause : configuration figée pour Android emulator uniquement.
- Conséquence : non compatible avec le téléphone réel ou avec un backend exposé via IP locale.

---

## 7. Audit Backend

### À retenir

Le backend suit une architecture Express classique et est globalement lisible. Le `server.ts` initialise la base et le scheduler. Les routes sont ajoutées dans [backend/src/routes/index.ts](backend/src/routes/index.ts).

Les points forts :

- séparation claire entre routes/controllers/services/repositories ;
- middleware d’authentification présent ;
- rôle admin défini dans `requireAdmin()` ;
- `firebase` est bien encapsulé dans sa config.

Les points faibles :

- type `RequestWithUser` incompatible en TypeScript ;
- authentification admin / mobile divergente ;
- validations incohérentes ;
- OTP non hashé ;
- `login` backend admin ne correspond pas au front admin.

### Fichiers clés examinés

- [backend/src/app.ts](backend/src/app.ts)
- [backend/src/server.ts](backend/src/server.ts)
- [backend/src/routes/index.ts](backend/src/routes/index.ts)
- [backend/src/routes/auth.routes.ts](backend/src/routes/auth.routes.ts)
- [backend/src/services/auth.service.ts](backend/src/services/auth.service.ts)
- [backend/src/services/otp.service.ts](backend/src/services/otp.service.ts)
- [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)
- [backend/src/middleware/rbac.ts](backend/src/middleware/rbac.ts)
- [backend/src/config/database.ts](backend/src/config/database.ts)
- [backend/src/config/env.ts](backend/src/config/env.ts)
- [backend/src/config/firebase.ts](backend/src/config/firebase.ts)

---

## 8. Audit Admin Web

### Points clés

- [admin-web/src/pages/Login/index.tsx](admin-web/src/pages/Login/index.tsx) demande un email et un mot de passe.
- [admin-web/src/services/auth.service.ts](admin-web/src/services/auth.service.ts) appelle `/auth/login` avec `{ email, password }`.
- [admin-web/src/store/authStore.tsx](admin-web/src/store/authStore.tsx) est incohérent avec la signature réelle.
- [admin-web/src/services/api.ts](admin-web/src/services/api.ts) injecte le token JWT dans le header `Authorization: Bearer ...`.

### Problèmes constatés

- le front admin est compatible avec `email`, mais le schéma de validating backend espère `matricule` dans `validateLogin` ;
- le type `UserRole` est discordant avec le backend role names ;
- les erreurs build TypeScript démontrent que le front est instable.

---

## 9. Audit Mobile / Expo

### Points clés

- [mobile/package.json](mobile/package.json) : Expo SDK 57, Expo Router, notifications.
- [mobile/app.config.js](mobile/app.config.js) : `extra.apiUrl` fixe l’URL backend.
- [mobile/src/services/api.ts](mobile/src/services/api.ts) : `http://localhost:3000/api` par défaut, inadapté sur téléphone réel.
- [mobile/app/auth/login.tsx](mobile/app/auth/login.tsx) : formulaire `matricule + téléphone`.
- [mobile/app/auth/otp.tsx](mobile/app/auth/otp.tsx) : flux OTP.

### Problèmes constatés

- `localhost` mauvais sur Expo Go réel ;
- `10.0.2.2` uniquement pour émulateur Android ;
- `apiUrl` codé en dur ;
- pas de distinction expresse entre environnement dev local / réseau Wi-Fi / OTA.

---

## 10. Audit MySQL

Le schéma dans [database/educonnect.sql](database/educonnect.sql) est globalement structuré avec les tables `roles`, `establishments`, `users`, `students`, `parents`, `staff`, `groups`, `messages`, `notifications` etc.

### Points positifs

- colonnes principales existantes ;
- clés étrangères et indexes solides ;
- `users.email` et `users.matricule` sont uniques ;
- `role_id` est bien référencé vers `roles`.

### Points problématiques

- l’authentification est divisée entre email/admin et matricule+phone/mobile ;
- `phone_hash` est présent mais pas exploité dans les services d’authentification ;
- `otp_code` est stocké en clair ;
- les seed données ne sont pas sécurisées et ne sont pas adaptées à l’auth mobile réaliste.

---

## 11. Audit Authentification

### Flux Admin

Login Admin
→ API
→ Route `/api/auth/login`
→ Controller `login`
→ Service `authService.login`
→ MySQL `WHERE u.email = ?`
→ JWT sign
→ Response `token + user`
→ `authStore` / `localStorage`
→ Dashboard

### Flux Mobile

Login
→ API `/api/auth/otp/request`
→ Route `/api/auth/otp/request`
→ Service `otpService.requestOtp`
→ MySQL `WHERE u.matricule = ? AND u.phone = ?`
→ OTP généré
→ OTP verify
→ `otpService.verifyOtp`
→ JWT sign
→ Storage SecureStore
→ Profil
→ Application

### Problème actuel

Les deux flux ne sont pas cohérents, et le backend a des éléments de validation laissés en contradiction. Le plus gros point de friction est le mauvais couplage : `email` pour admin, `matricule+phone` pour mobile, sans schéma de login unique.

---

## 12. Audit API

### API admin-web

- `POST /auth/login` – body `{ email, password }`
- `GET /auth/profile` – header `Authorization: Bearer ...`
- `POST /auth/logout` – header `Authorization: Bearer ...`

### API mobile

- `POST /api/auth/otp/request` – body `{ matricule, phone }`
- `POST /api/auth/otp/verify` – body `{ matricule, code }`
- `GET /api/auth/profile` – header `Authorization: Bearer ...`
- `POST /api/auth/logout` – header `Authorization: Bearer ...`

### Incohérence

- le front admin et le mobile ne partagent pas le même login contract ;
- le backend a `POST /auth/login` mais le mobile n’utilise pas cette route ;
- le backend `validateLogin` cesse de correspondre à la route réelle ;
- le type `LoginRequest` côté frontend admin ne couvre pas le cas mobile.

---

## 13. Audit Firebase

Le backend initialise Firebase uniquement si les variables d’environnement `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` et `FIREBASE_CLIENT_EMAIL` sont présentes ; cf. [backend/src/config/firebase.ts](backend/src/config/firebase.ts).

- si non configuré, le système affiche : `push notifications disabled` ;
- l’enregistrement du token FCM se fait via [backend/src/services/notification.service.ts](backend/src/services/notification.service.ts) ;
- le mobile doit enregistrer son token via `Notifications.getExpoPushTokenAsync()` ; voir [mobile/src/notifications/index.ts](mobile/src/notifications/index.ts) ;
- Expo Go a des limitations réelles pour les notifications push native ; ce n’est pas un environnement de production fiable pour les tests FCM complets.

---

## 14. Audit variables d’environnement

Les variables sont partiellement présentes dans [.env.example](.env.example) et [backend/.env.example](backend/.env.example), mais l’usage est hétérogène :

- `DB_HOST` vs `MYSQL_HOST`
- `VITE_API_URL` vs `API_URL`
- `EXPO_PUBLIC_API_URL` vs `extra.apiUrl`
- `JWT_REFRESH_SECRET` déclaré dans l’origine mais non utilisé dans le backend actuel.

Cela crée une confusion de configuration entre les modules.

---

## 15. Problèmes de communication Mobile ↔ Backend

- `mobile/src/services/api.ts` utilise un `baseURL` calculé via `Constants.expoConfig.extra.apiUrl` ;
- ce `extra.apiUrl` est configuré comme `http://10.0.2.2:3000/api` dans [mobile/app.config.js](mobile/app.config.js) ;
- sur téléphone réel, ce n’est plus valide ;
- backend CORS autorise `origin: true` ; c’est permissif, mais ne corrige pas le mauvais endpoint.

---

## 16. Problèmes Admin Web ↔ Backend

- admin front envoie `{ email, password }` ;
- backend lit `{ email, password }` ;
- mais la validation `validateLogin()` vérifie `matricule` ;
- le front et le form ne sont pas strictement alignés avec les types et le service réel ;
- le build TypeScript confirme l’écart technique.

---

## 17. Problèmes Backend ↔ MySQL

- `users` contient `password_hash`, `otp_code`, `phone_hash`, `matricule`, `email` ;
- service d’admin attend `email` ;
- service OTP attend `matricule` + `phone` ;
- les données de seed utilisent des `@bcrypt_hash` globaux sans validation d’usage réel ;
- le schéma est correct sur le plan structurel, mais pas sur le plan d’utilisation métier.

---

## 18. Comptes de test

Les comptes présents dans [database/seed.sql](database/seed.sql) ne sont pas suffisamment fiables pour tester le flux d’authentification de manière généralisée, car :

- ils sont spécifiques à un établissement fictif ;
- ils ne couvrent pas explicitement les comptes demandés par le test d’authentification ;
- ils utilisent un hash global et ils n’ont pas été validés par le système réel pour le mot de passe demandé ;
- le backend admin est basé sur email, mais les comptes de seed n’ont pas été conçus pour les cas admin web + mobile dans un schéma unique.

---

## 19. Nouveau seeder proposé

Le fichier [database/seed_test.sql](database/seed_test.sql) a été créé pour fournir des comptes de test clairement identifiables et compatibles avec le schéma actuel.

Comptes inclus :

- `superadmin@educonnect.test`
- `secretariat@educonnect.test`
- `parent.test@educonnect.test`
- `eleve.test@educonnect.test`
- `personnel.test@educonnect.test`

Tous utilisent le mot de passe : `EduConnect@2026!`.

---

## 20. Plan de correction recommandé

1. Standardiser le modèle d’authentification sur des contrats explicites : admin login (= email/password), mobile login (= matricule + phone + OTP).
2. Corriger les types et les validations Express.
3. Corriger les fichiers de types du front admin et du mobile.
4. Harmoniser les variables d’environnement et les URLs API.
5. Sécuriser le OTP (hash plutôt qu’en clair).
6. Vérifier les rôles et les droits RBAC.
7. Recréer la base de test propre via script dédié.
8. Tester la connexion admin et mobile séparément dans des environnements distincts.

---

## 21. Ordre exact des corrections

1. MySQL / schéma et comptes de test
2. Backend auth + validations
3. API routes et contracts
4. Admin Web auth + types
5. Mobile auth + config réseau
6. Expo / API_URL / environnement
7. Firebase / notifications
8. QA / smoke tests

---

## 22. Résultat des tests exécutés

### Commandes exécutées

- `Set-Location -LiteralPath 'D:\EduConnect\backend'; npm install; npm run build` → échec de compilation TypeScript confirmé.
- `Set-Location -LiteralPath 'D:\EduConnect\admin-web'; npm install; npm run build` → échec de compilation TypeScript confirmé.

### Évidences finales

- Le build backend échoue sur des erreurs TS2769 liées à la signature Express `RequestWithUser` dans les routes.
- Le build admin web échoue sur des erreurs TS2322 dans le composant `Table` et sur la signature `login(email, password)` dans le front.
- Ces erreurs confirment l’absence d’un état stable de code avant correction.

---

## 23. Conclusion

L’audit confirme un projet aux bases sérieuses mais inachevé sur le fond de l’authentification et de la cohérence intermodules. L’architecture est globalement correcte, mais les contrats d’API et d’authentification ne sont pas alignés entre admin, mobile et backend.

Le problème principal des comptes utilisateurs n’est pas un seul bug isolé : c’est un manque de cohérence globale entre :

- le financement des identifiants (`email` vs `matricule + phone`),
- les types TypeScript,
- le schéma SQL,
- les routes et middlewares,
- les variables d’environnement,
- et la configuration réseau mobile / Expo.

Cela explique pourquoi les comptes fonctionnent mal ou ne permettent pas de se connecter correctement selon les écrans et les environnements.

---

## Tableau des erreurs

| Priorité | Module | Fichier | Problème | Cause probable | Impact | Correction recommandée |
|----------|--------|---------|----------|---------------|--------|-------------------------|
| 🔴 Critique | Backend | [backend/src/services/auth.service.ts](backend/src/services/auth.service.ts) | `login(email, password)` ne correspond pas aux identifiants du mobile | Contrat d’auth différent selon le canal | Blocage du flux d’authentification | Séparer les flux admin et mobile avec validation explicite |
| 🔴 Critique | Backend | [backend/src/validators/auth.validator.ts](backend/src/validators/auth.validator.ts) | Validation `matricule` alors que controller attend `email` | Contradiction entre validation et controller | Erreurs de validation incohérentes | Harmoniser les champs par route |
| 🔴 Critique | Backend | [backend/src/types/index.ts](backend/src/types/index.ts) | `RequestWithUser` incompatibilité Express | Type personnalisé incorrect | Build TypeScript échoue | Corriger les types Express et les signatures middleware |
| 🔴 Critique | Admin Web | [admin-web/src/store/authStore.tsx](admin-web/src/store/authStore.tsx) | `login` reçu en paramètre `matricule` mais service attend `email,password` | Signature incohérente | Front non fiable | Aligner AuthProvider et authService |
| 🔴 Critique | Admin Web | [admin-web/src/components/ui/Table.tsx](admin-web/src/components/ui/Table.tsx) | Généricité `Table` incompatible avec données réelles | Typage générique incomplet | Build non fonctionnel | Corriger les types `Column<T>` et `TableProps` |
| 🟠 Majeur | Mobile | [mobile/src/services/api.ts](mobile/src/services/api.ts) | URL backend `localhost` / `10.0.2.2` non fiable | Conception pour simulateur et non pour réel téléphone | Échec réseau depuis Expo Go | Utiliser `EXPO_PUBLIC_API_URL` et IP locale |
| 🟠 Majeur | Mobile | [mobile/app.config.js](mobile/app.config.js) | `apiUrl` codé en dur | Déploiement non multi-environnement | Impossible d’exécuter sur plusieurs environnements | Mettre la config dans variables d’environnement |
| 🟠 Majeur | Backend | [backend/src/services/otp.service.ts](backend/src/services/otp.service.ts) | OTP stocké en clair | Sécurité insuffisante | Vulnérabilité et logs exposant le code | Hachage sécurisé du code OTP |
| 🟡 Moyen | SQL | [database/seed.sql](database/seed.sql) | Seed non validé pour les nouveaux mots de passe | Hash global non vérifié | Comptes de test non fiables | Créer script de seed de test dédié |
| 🟡 Moyen | Config | [.env.example](.env.example) | Variables au nom contradictoire | Mélange `DB_` / `MYSQL_` / `VITE_` / `EXPO_PUBLIC_` | Erreurs de configuration | Standardiser les variables |
| 🔵 Mineur | Backend | [backend/src/services/otp.service.ts](backend/src/services/otp.service.ts) | Log OTP en clair | Log sensible | Fuite de sécurité | Supprimer les logs ou masquer les codes |

---

## Fichiers créés pour l’audit

- [database/seed_test.sql](database/seed_test.sql)
- [database/reset_test_database.sql](database/reset_test_database.sql)
