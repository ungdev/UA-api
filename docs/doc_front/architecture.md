# Architecture du projet

## Dossiers et fichiers

La racine du projet contient différents fichiers et dossiers de configuration. Les plus importants sont :

- `package.json` : contient la liste des dépendances du projet, ainsi que les scripts de lancement de l'application.
- `tsconfig.json` : contient la configuration du compilateur TypeScript.
- `eslintrc.json` : contient la configuration du linter ESLint.
- `prettierrc.json` : contient la configuration de Prettier.
- `next.config.js` : contient la configuration de Next.js.
- `/.github` : contient les fichiers de configuration de GitHub Actions permettant de déployer automatiquement l'application sur le SIA.
- `/storybook` : contient la configuration de Storybook.

Le code source du site se trouve dans le dossier `src`. Il contient les dossiers suivants :
- `components` : contient les composants React de l'application.
- `app` : contient les pages du site.
- `lib` : contient des fichiers pour Redux et pour la gestion des données.
- `utils` : contient les fonctions utilitaires de l'application. 
- `modules` : contient les modules Redux de l'application.

Le dossier `public` contient les fichiers statiques de l'application (images, icônes, polices, etc.).

## Composants

Les composants React sont organisés en fonction de leur utilisation. 

- Les composants de base sont dans le dossier `components/ui`. Ils sont utilisés pour construire les composants plus complexes.

- Les composants principaux sont dans le dossier `components`.

- Les composants des pages vitrines sont dans le dossier `components/landing`.

- Les composants du dashboard sont dans le dossier `components/dashboard`.