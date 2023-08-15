# Redirections

Les différentes redirections sont gérés par le composant `RedirectHandler` du composant `Wrapper` et le module `redirect` de Redux.

Pour faire une redirection, il suffit de dispatch l'action `redirect` avec l'url de destination en paramètre.

```tsx
import { setRedirect } from 'src/modules/redirect';

dispatch(setRedirect('/'));
```

## Redirections dans le Wrapper

Le composant `Wrapper` contient le code permettant de rediriger les utilisateurs de /dashboard vers la homepage si ils ne sont pas connectés ou alors de les envoyer vers la page dont ils ont accès et le plus souvent besoin. 
Ainsi que toutes les autres redirections en lien avec le panel admin et le dashboard.
