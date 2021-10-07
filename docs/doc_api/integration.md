# Intégration

Le service est disponible sur https://arena.utt.fr/api pour l'environnement de production et https://arena.dev.uttnetgroup.fr pour l'environnement de préproduction.

L'environnement de production et de dev sont déployés automatiquement après un push respectivement sur la branche master et sur la branche dev.

L'outil utilisé était auparavant TravisCI. Cependant, ayant changé sa politique de prix recemment, le projet utilise désormais GitHub actions pour effectuer l'intégration continue, ainsi que le déploiement automatique.

L'intégration continue se consitue en une phase de lint, de tests et de build pour vérifier que le projet est valide. Cette intégration est effectuée sur les branches staging, master et les pull-requests visant ces 2 branches.

Afin de minimiser le risque d'erreur, le codecoverage est enforcé au niveau de la pull request.
