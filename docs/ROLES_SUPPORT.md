# Rôles métier supportés — EduConnect

## Décision

Le module de gestion du personnel utilise **`STAFF` comme seul rôle métier supporté pour le personnel**.

Cette décision est volontaire : l'audit du dépôt et du schéma existant ne justifie pas la création d'un rôle `TEACHER`, d'une table `teachers` ou d'une nouvelle fonctionnalité dédiée aux enseignants.

## Conséquences

- Le frontend Admin ne propose que `STAFF` dans la gestion du personnel.
- Le backend accepte explicitement les rôles métier existants `STUDENT`, `PARENT` et `STAFF` dans la création utilisateur concernée.
- `role_title` et `department` restent les attributs de la table `staff` pour décrire la fonction du personnel.
- Aucun changement de schéma n'est requis pour cette décision.
- Une future fonctionnalité `TEACHER` ne devra être ajoutée qu'après constat d'un support réel dans le schéma et les contrats métier.
