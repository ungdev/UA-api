# Bot discord

## Fonctionnalités

Synchronisation unidirectionnelle du site vers discord.

A la création d'une équipe, on crée un rôle et un channel textuel, et un channel vocal du nom `tournoi-equipe`. Exemple `lol-les-best`. A determiner ce que l'on stocke dans la DB dans la table `teams`. (ID du rôle et du channel ?)

Pour chaque tournoi, on a un channel textuel et un rôle. Les ID du rôle et du channel sont stockés en DB dans la table `tournaments`.

Quand une équipe est supprimée, les channels discord et le rôle doivent l'être aussi.

On aura une synchro toutes les 5 minutes qui ajoute les rôles aux joueurs qui viennent de rejoindre le serveur discord.

## Catégories et salons

### Catégorie d'accueil

- Message pin - pas de droits d'écriture
- Aide

### Catégorie

### Salon

- Un salon textuel de tournoi écrit en DB
- Une catégorie par tournoi
  - Les staff du tournois dans tous les salons de la catégorie
- Un salon textuel et vocal par équipe
  - Les joueurs de l'équipe

## Rôle

- Un rôle par tournoi écrit en DB
- Un rôle par équipe
- Un rôle Staff par tournoi

## Ecoulement d'exécution

Quand une personne s'enregistre, elle indique sont tag discord. L'API call discord pour récupérer son userId et le stocke dans la DB.

Lors du lock d'une équipe, on crée un rôle et un channel textuel, et un channel vocal du nom `tournoi-equipe`. Exemple `lol-les-best`. A determiner ce que l'on stocke dans la DB dans la table `teams`. (ID du rôle et du channel ?)

On aura un script qui sera executé toutes les 5 minutes qui ajoute les rôles aux joueurs qui viennent de rejoindre le serveur discord.
