# La documentation et les tests

## Introduction

Tous les composants sont documentés avec Storybook. Pour lancer Storybook, il suffit de lancer la commande `pnpm storybook` dans le terminal. 

Les fichiers de documentation sont situés au niveau de chaque composant. Ils sont nommés `[Nom du composant].stories.tsx`.

Afin de s'assurer que le code est fonctionnel, de nombreux tests ont étés en place à l'aide de Storybook à l'intérieur des fichiers de documentation.

Pour lancer les tests, il suffit de lancer la commande `pnpm test` dans le terminal.

Afin de vérifier que le code est bien testé, on utilisera l'outil de coverage de Storybook.

Toute la documentation de Storybook est disponible [ici](https://storybook.js.org/docs/react/get-started/introduction).

## Ecrire de la documentation

Pour écrire de la documentation, il suffit de créer un fichier `[Nom du composant].stories.tsx` dans le dossier du composant.

Il faut ensuite importer le composant et définir les métadonnées globales du composant. Pour cela, on utilise le type `Meta` de Storybook.

Enfin, il faut définir le type `Story` qui est un objet contenant les différentes métadonnées du composant et les différents scénarios de tests.

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import [Composant] from './[Composant]';

const meta = {
  title: '[Nom de la catégorie (eg. UI)]/[Composant]',
  component: [Composant],
  tags: ['autodocs'],
} satisfies Meta<typeof [Composant]>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

Pour ajouter des arguments au composant, il faut ajouter un objet `args` dans le type `Story` et définir les arguments dans le scénario de test.

```tsx
export const Default: Story = {
    args: {
        "[Nom de l'argument]": "[Valeur]",
    },
};
```
Il est également possible de définir des arguments par défaut dans les métadonnées globales du composant.

```tsx
const meta = {
  title: '[Nom de la catégorie (eg. UI)]/[Composant]',
  component: [Composant],
  tags: ['autodocs'],
  args: {
    [Nom du paramètre]: [Valeur],
    [Nom du paramètre]: [Valeur],
    [Nom du paramètre]: [Valeur],
  },
} satisfies Meta<typeof [Composant]>;
```

On peut définir différents scénarios en ajoutant des objets avec le type `Story`.

```tsx
export const Default: Story = {};

export const [Nom du scénario]: Story = {
    args: {
        [Nom du paramètre]: [Valeur],
        [Nom du paramètre]: [Valeur],
        [Nom du paramètre]: [Valeur],
    },
};
```

## Ecrire des tests

Pour écrire des tests, il suffit de rajouter un attribut `play` dans un objet de `Story` et de définir les tests dans le scénario de test.

```tsx

export const Default: Story = {
    play: async ({ canvas }) => {
        // Définir les tests ici
    },
};
```

Pour définir un test, on utilise la fonction `expect` de Jest. Toutes les fonctions de Jest sont disponibles [ici](https://jestjs.io/docs/expect).

```tsx
export const Default: Story = {
    play: async ({ canvas }) => {
        expect(canvas).toBeTruthy();
    },
};
```

## Coverage

Afin de vérifier que le code est bien testé, on utilisera l'outil de coverage de Storybook. Pour lancer l'outil de coverage, il suffit de lancer la commande `pnpm test:coverage` dans le terminal.