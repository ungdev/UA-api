# Concepts de l'API

_Ce fichier a été réalisé pour indiquer au front comment fonctionnent les processus réalisés par l'API, pour effectuer différentes tâches._

# Comptes

## Création d'un compte

La première étape que tout participant à l'évènement devra effectuer est la création de son compte sur le site [https://arena.utt.fr](https://arena.utt.fr). \
Pour cela, l'utilisateur doit fournir: son nom, prénom, username (nom d'invocateur sur _League of Legends_), son adresse email (valide!), un mot de passe et préciser s'il **SERA** majeur ou non lors de l'évènement. \
Ces informations sont envoyées à l'API sur `POST /auth/register` et l'utilisateur recevra un mail l'invitant à confirmer son inscription sur le site.

### Validation du compte

L'utilisateur est redirigé du mail d'inscription vers `GET https://arena.utt.fr/?action=validate&state={token}`. L'interface va alors envoyer une requête sur l'API `POST /auth/validate/{token}` et recevra, en cas de succès, une réponse `HTTP 200`, contenant les données de l'utilisateur, ainsi qu'un token d'authentification sur l'API. \
Le compte est désormais validé et l'utilisateur pourra se reconnecter !

### Tableau récapitulatif

| Etape | Route (ou adresse)                                    | Données                                                                                       | Etat du compte                       |
| :---: | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ |
|   1   | `https://arena.utt.fr`                                | L'utilisateur rentre: `username`, `firstname`, `lastname`, `age`, `email`.                    | Pas de compte                        |
|   2   | `POST /auth/register`                                 | L'interface envoie les données rentrées par l'utilisateur à l'API.                            | Création d'un compte **non vérifié** |
|   3   | Envoi d'un email pour confirmation de l'adresse email | Le mail contient le lien de confirmation de compte qui permet d'accéder à la prochaine étape. | Compte non vérifié                   |
|   4   | `https://arena.utt.fr/?action=validate&state={token}` | `token` que l'interface va pouvoir renvoyer dans sa prochaine requête.                        | Compte non vérifié                   |
|   5   | `POST /auth/validate/{token}`                         | `token` renvoyé par le front vers l'API.                                                      | Vérification du compte en cours      |
|   6   | Le serveur a répondu `HTTP 200`                       | Un token d'authentification de l'API est renvoyé en plus des informations de l'utilisateur.   | Compte **vérifié**                   |

## Réinitialisation de mot de passe

Le processus de réinitialisation du mot de passe d'un compte UA ressemble beaucoup à celui de la création et validation d'un compte. Pour les détails du processus, se référer au paragraphe ci-dessus. Les valeurs à utiliser sont celles du tableau ci-après.

### Tableau récapitulatif

| Etape | Route (ou adresse)                                                           | Données                                                                                      | Etat du mot de passe          |
| :---: | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
|   1   | `https://arena.utt.fr`                                                       | L'utilisateur rentre l'`email` de son compte UA                                              | Oublié                        |
|   2   | `POST /auth/reset-password/ask`                                              | `email` rentré par l'utilisateur                                                             | Génération du `resetToken`    |
|   3   | Envoi d'un email de réinitialisation de mot de passe _(si le compte existe)_ | Lien de réinitialisation du mot de passe, ce qui permet d'accéder à l'étape suivante.        | `resetToken` créé             |
|   4   | `https://arena.utt.fr/?action=pwd-reset&state={resetToken}`                  | `resetToken` que l'interface va pouvoir échanger pendant la prochaine requête.               | `resetToken` créé             |
|   5   | `POST /auth/reset-password/{resetToken}`                                     | `resetToken` du compte, avec le nouveau `password` dans le corps de la requête.              | Modification du mot de passe. |
|   6   | Le serveur a répondu `HTTP 200`                                              | Un token d'authentification sur l'API est renvoyé en plus des informations de l'utilisateur. | **Mot de passe modifié !**    |

## Connexion

La procédure de connexion d'un utilisateur est relativement simple. Il s'agit _juste_ d'envoyer une requête `POST` sur `/auth/login`. Le compte doit cependant être validé (voir procédure ci-dessus).

### Tableau récapitulatif

| Etape | Route (ou adresse)              | Données                                                                                                            | Etat de la connexion     |
| :---: | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------ |
|   1   | `https://arena.utt.fr/*`        | L'utilisateur rentre son identifiant (username ou email) et son mot de passe                                       | Déconnecté               |
|   2   | `POST /auth/login`              | Le front envoie `login` et `password` à l'API, qui vérifie que le compte existe et que le mot de passe est le bon. | Connexion                |
|   3   | Le serveur a répondu `HTTP 200` | Un token d'authentification sur l'API est renvoyé en plus des informations de l'utilisateur.                       | **Utilisateur connecté** |

## Lier son compte _Discord_ à son compte UTT Arena

Contrairement aux autres propriétés de l'utilisateur, le lien avec le compte discord ne s'effectue pas sur la route `PATCH /users/current`. Ce pour la simple et bonne raison qu'on ne va pas demander l'id discord des gens (puisque pour l'obtenir il faut aller dans les `Paramètres` sur _Discord_ > `Avancés` > `Mode développeur` > Clic droit sur son compte > `Copier l'identifiant`). On va à la place utiliser l'`oauth2` de _Discord_, c'est bien plus UX, bien plus raffiné, bien plus élégant.

Pour faire ça bien, le front envoie une requête à l'API sur `POST /discord/connect` et récupère un lien vers Discord (et l'appliquer sur un bouton par exemple). Quand l'utilisateur accède au lien, _Discord_ lui affiche une fenêtre de demande de permission pour que l'UA _(nous)_ puisse accéder à ses données publiques _Discord_ (pseudo, discriminant, avatar, bannière, flags, id, etc - on s'en fout c'est pas précisé sur la fenêtre en vrai). L'utilisateur peut accepter ou refuser mais dans tous les cas il est redirigé sur `/discord/oauth?code=...` ou `/discord/oauth?error=...&error_description=...`. L'API s'occupe ensuite de tout et redirige l'utilisateur sur `https://arena.utt.fr/?action=oauth&state={status}`, où status prend valeurs suivantes:

| Valeur | Signification                                                                               |
| :----: | ------------------------------------------------------------------------------------------- |
|   0    | Le compte discord a été appairé                                                             |
|   1    | Compte discord appairé mis à jour                                                           |
|   2    | Le compte discord était déjà appairé                                                        |
|   3    | Le compte discord est déjà lié à un autre compte UA !                                       |
|   4    | Les permissions n'ont pas été accordées lors de l'oauth                                     |
|   5    | Une erreur `400` est survenue quelque part ! (`HTTP 400 Bad request`)                       |
|   6    | Une erreur inconnue a tapé l'incruste... Pas de chance ! (`HTTP 500 Internal server error`) |

### Tableau récapitulatif

| Etape | Route (ou adresse)                                  | Données                                                                                                                                            | Etat de la connexion            |
| :---: | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
|   1   | `https://arena.utt.fr/dashboard/*`                  | L'utilisateur est connecté à son compte                                                                                                            | Compte _Discord_ non relié      |
|   2   | `GET /discord/connect`                              | Le front récupère le lien _discord_ et redirige l'utilisateur dessus.                                                                              | Compte _Discord_ non relié      |
|   3   | `GET /discord/oauth`                                | Hit direct de l'utilisateur sur l'API. L'API a accès à l'`authorization_grant` code de l'API _Discord_.                                            | Connexion en cours              |
|   4   | `https://arena.utt.fr/?action=oauth&state={status}` | L'utilisateur est redirigé sur le front, avec un code status de l'opération. Les valeurs du `status` sont listées dans le tableau juste au dessus. | Compte appairé ssi `status < 3` |

## Informations de l'utilisateur

Il est possible de récupérer les informations de l'utilisateur connecté en utilisant la route `GET /users/current`. Certaines de ces informations, le `username` et le mot de passe sont modifiables avec `PATCH /users/current` (mais il faut aussi fournir le mot de passe actuel puisque cela peut être des informations de connexion).

# Teams & UserType

Un utilisateur peut participer à l'évènement sous plusieurs formes: il peut être coach/manager, joueur, spectateur ou accompagnateur.

- Les joueurs participent concrètement à l'évènement: ils forment une équipe et joueront pendant l'UA.
- Les coachs/managers font également partie d'une équipe mais ils ne joueront pas pendant l'UA. Il pourront (notamment) encourager leur équipe et rester avec eux durant toute l'UA.
- Les spectateurs ne sont pas rattachés à une équipe en particulier. Ils pourront (ou plutôt devraient pouvoir) assister à l'évènement de façon _"électron libre"_.
- Les accompagnateurs peuvent accompagner **UN MINEUR**. Concrètement, lorsqu'un mineur va acheter sa place à l'UTT Arena, il va pouvoir acheter également un ticket "accompagnateur". Il ne peut ainsi n'y avoir qu'un accompagnateur pas mineur.

De par ces différences, le type d'un utilisateur (aka. `UserType`) doit être défini à différents moments.

## `UserType.player` ou `UserType.coach`

Un utilisateur peut rejoindre une équipe _(ou créer un équipe)_ en tant que joueur. C'est à ce moment qu'il devient `player`. Tant que son équipe n'est pas "verrouillée", il peut la quitter et changer de `UserType`.

|                    Action                     | Route (ou adresse)                             | Détails                                                                                                                                                                           | `UserType` final |
| :-------------------------------------------: | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
|               Créer une équipe                | `POST /teams`                                  | L'utilisateur a rentré le nom de l'équipe (`name`), le tournoi dans lequel l'équipe va s'illustrer (`tournamentId`) et le type d'utilisateur qu'il souhaite devenir (`userType`). | `userType`       |
|              Dissoudre l'équipe               | `DELETE /teams/current`                        | Seul le capitaine de l'équipe peut effectuer cette action.                                                                                                                        | `null`           |
| Envoyer une requête pour rejoindre une équipe | `POST /teams/{teamId}/join-requests`           | L'utilisateur doit choisir son `userType` à ce moment là.                                                                                                                         | `userType`       |
|         Refuser une demande d'équipe          | `DELETE /teams/current/join-requests/{userId}` | Supprime la demande d'équipe de l'utilisateur `userId`. L'utilisateur refusé perd alors son `userType`.                                                                           | `null`           |
|          Annuler sa demande d'équipe          | `DELETE /teams/current/join-requests/current`  | Supprime la demande d'équipe (de l'utilisateur actuel). L'utilisateur perd son `userType` à ce moment là.                                                                         | `null`           |
|       Retire l'utilisateur de l'équipe        | `DELETE /teams/current/users/{userId}`         | L'utilisateur `userId` n'est plus dans l'équipe et perd son `userType`.                                                                                                           | `null`           |
|  Permet à l'utilisateur de quitter l'équipe   | `DELETE /teams/current/users/current`          | L'utilisateur perd son `userType`                                                                                                                                                 | `null`           |

Note: la requête `POST /teams/current/join-requests/{userId}` ne modifie **PAS** le `userType`.

## `UserType.spectator`

Un spectateur n'a pas besoin de rejoindre une team _(et ne doit pas le faire !)_. Ce cas spécial est donc géré par une autre route de l'API: `/users/current/spectate`.

Pour devenir spectateur, il faut ne pas être dans un équipe et d'avoir un `userType` qui vaut `null`.

Devenir spectateur: `POST /users/current/spectate` \
Ne plus être spectateur: `DELETE /users/current/spectate`

## `UserType.attendant`

Les accompagnateurs sont des utilisateurs un peu spéciaux puisqu'ils ne possèdent pas de compte UA à proprement parler. Ils sont créés par des mineurs (un accompagnateur max par mineur) et n'ont d'enregistré que peu d'informations: le nom et le prénom (`firstname` et `lastname`).

Ils sont créés _à la volée_ lors de l'achat des tickets dans la billetterie. (cf section suivante)

# Carts

C'est le moment où l'utilisateur va acheter ses billets !
Pour cela, le front peut récupérer les objets encore en vente sur `GET /items` (et les afficher dans la boutique) pour renvoyer la sélection de l'utilisateur sur `POST /users/current/carts`.

La réponse du serveur renvoie alors au front l'url de paiement sur etupay (`url`) ainsi que le prix total des articles sélectionnés (`price`). L'utilisateur est alors redirigé sur etupay qui gère le paiement auprès de la banque.

L'utilisateur peut également payer pour les personnes présentes dans son équipe, ou pour un accompagnateur _(si l'utilisateur est mineur)_. C'est à ce moment que l'accompagnateur (unique) d'un participant peut être créé. Il suffit de fournir le nom et le prénom de l'accompagnateur (qui doit être majeur) dans le champ `tickets.attendant`.

Quand le paiement sera validé, un mail de confirmation sera envoyé à l'utilisateur avec la liste de ses achats et ses tickets en pièces jointes.

Les tickets sont aussi disponibles sur `GET /tickets/{cartItemId}`. Et accessibles à la fois pour celui qui a acheté le ticket et le bénéficiaire du dit ticket.

## Fonctionnement du paiement

`POST /users/current/carts` renvoie le prix total du panier et l'url pour procéder au paiement. L'utilisateur doit être rédirigé sur cette url afin de procéder au paiement.

### Workflow

| Etape | Exécutée sur | Description                                                                                                                                                                                                                                                |
| :---: | :----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1   |    Front     | L'utilisateur choisit ses articles et le front envoie le contenu du panier sur `POST /users/current/cart`                                                                                                                                                  |
|   2   |     API      | Enregistre le panier et renvoie le prix total (avec réductions) du panier ainsi que l'url pour le paiement                                                                                                                                                 |
|   3   |    Front     | (Affiche le prix total qui contient toutes les réductions applicables ?) et redirige l'utilisateur sur l'url etupay                                                                                                                                        |
|   4   |    Etupay    | L'utilisateur procède au paiement sur etupay                                                                                                                                                                                                               |
|   5   |     API      | Etupay redirige l'utilisateur sur `GET /etupay/callback`. L'API vérifie (et enregistre) le paiement puis redirige l'utilisateur sur `ETUPAY_SUCCESS_URL` ou `ETUPAY_ERROR_URL`. (ie. `/dashboard/payment?type=success` ou `/dashboard/payment?type=error`) |
|   6   |    Front     | Le front affiche la réussite ou l'échec du paiement                                                                                                                                                                                                        |

> Les paniers réservent les articles du shop le temps de la transaction. Pour cette raison, **ils (les paniers) ont une durée de validité limitée à 60 minutes** (`API_CART_LIFESPAN` dans le `.env`, exprimée en millisecondes). \
> Passé ce délai, toute création de panier _(par quelqu'un d'autre ou par l'utilisateur lui même)_ supprimera le panier obsolète.

# Monitoring

## Etat du serveur

Il peut être intéressant de connaître l'état du serveur. La route `GET /` renvoie le fonctionnement du serveur http _(qui va étrangement toujours valoir `true` si on arrive à le joindre!)_. Envoie également le lien vers la documentation des routes de l'API.

## Paramètres

Toutes les fonctionnalités de l'UA ne sont toujours actives. La route `GET /settings` permet de savoir si la billetterie ou la connexion sont activés/autorisés.

## Réponse au ping

L'API répond sur la route `HEAD /lucien` avec une réponse `HTTP 418`, comme spécifié dans le [rfc2324](https://datatracker.ietf.org/doc/html/rfc2324). Cela permet d'évaluer la latence de l'API avec une opération d'une complexité constante (et réduite). _Si cette section ne fonctionne pas, demandez à votre respo dev._

## Formulaire de contact

Il est possible d'envoyer un message aux organisateurs de l'UA en utilisant la route `POST /contact`. Cette route nécessite la présence des champs `firstname`, `lastname`, `email`, `subject` et `message`.
