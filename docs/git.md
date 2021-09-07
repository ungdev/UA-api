# Versionnage Git

Afin de versionner le code, nous utilisons Git. Le code doit être maintenu de la façon suivante :

## Master

La branche master correspond à la branche de production

## Staging

La branche staging correspond à la branche de préproduction. Elle doit toujours être en avance par rapport à master. Dans le cas contraire, un rebase de la branche est nécéssaire.

Quand la branche staging est prête à passer en production, l'un des développeur effectue une pull request vers master afin de relire le code avant mise en production. Quand la pull request est approuvée, il faut effectuer un **merge simple** (sans squash) vers master.

## Autres branches

Les autres branches (feature, fix, etc...) qui doivent respecter la nomenclautre `$type`/`$but`. Avec `$type` étant `fix`, `feat`, `test`. Par exemple, `feat/logging` pour créer une fonctionnalité de logging, ou `fix/docker` pour corriger des problèmes sur l'image Docker.

Ces branches doivent être crées à partir de la branche `staging`. Ensuite, quand la branche est terminée, le développeur crée une pull request vers staging. Quand la pull request est approuvée, il faut effectuer un **merge avec squash** vers staging, puis supprimer la branche.

Dans le cas où staging est en avance, il est nécéssaire de rebase la branche de départ afin d'éviter des potentiels conflits. Il est important de gérer ces conflits lors d'un rebase et non lors d'un merge pour que du code de staging ne saute pas.
