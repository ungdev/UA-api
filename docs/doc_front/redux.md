# Redux

Redux permet de gérer l'état de l'application. Il contient les états de login, des partenaires, des tournois, ...

Les modules Redux sont dans le dossier `src/modules`. Chaque module permet de gérer un état de l'application à l'aide de variables et de fonctions.

## Le state global de l'application

Tout d'abord, il faut que nous définissions ce qu'est le state global de l'application. Le state global est un simple objet JavaScript qui contient des données générales sur l'application. Le state est géré par plusieurs modules, un par type de donné : un pour les données de connexion, un qui sert de cache pour les partenaires, ...

Le format du state global est assez simple, il contient un objet par module (les objets ont le nom de leur module : `login`, `partners`) :

```ts
{
  login: {
    token: string | null
    user: User | null;
    loading: boolean;
    status: {
      login: boolean;
      paid: boolean;
      team: boolean;
      admin: boolean;
      spectator: boolean;
    }
  };
  partners: {
    id: string;
    name: string;
    link: string;
  } | null;
  ...
}
```

Le state global est conservé d'une page à l'autre, mais est supprimé à la fermeture de la page ou au rafraichissement

## Créer un module

Pour créer un module, il faut créer un fichier dans `src/modules` avec le nom du module.

Ce fichier doit être configuré de la manière suivante (en prenant l'exemple d'un module nommé `reduxtest`)

```ts
import { createSlice, type Dispatch } from '@reduxjs/toolkit';

export interface ReduxtestAction {
  variable1: [type de la variable];
  variable2: [type de la variable];
}

const initialState: ReduxtestAction = {
  variable1: [état initial de la variable],
  variable2: [état initial de la variable],
};

// Définition du slice
export const reduxtestSlice = createSlice({
  name: 'reduxtest',
  initialState,
  reducers: {
    setVariable1: (state, action) => {
      state.variable1 = action.payload;
    },
    setVariable2: (state, action) => {
      state.variable2 = action.payload;
    },
    setBoth: (state, action) => {
      state = action.payload;
    },
  },
});

// Export des actions
export const { setVariable1, setVariable2, setBoth } = reduxtestSlice.actions;

// Définitions des fonctions
export const fonctionVariable1 = () => async (dispatch: Dispatch) => {
  // Code de la fonction
  dispatch(setVariable1(valeur));
};

// Export du reducer
export default reduxtestSlice.reducer;
```

## Utiliser un module

Pour utiliser le module dans le code du site avec les bons types, on utilise le type `useAppDispatch` et `useAppSelector` de `src/lib/hook.ts`.

```ts
import { useAppDispatch, useAppSelector } from 'src/lib/hooks';
import { fonctionVariable1 } from 'src/modules/reduxtest';

[...]

// Pour appeler une fonction du module
const dispatch = useAppDispatch();
// Pour récupérer une variable
const variable1 = useAppSelector((state) => state.reduxtest.variable1);

[...]

dispatch(fonctionVariable1());
```