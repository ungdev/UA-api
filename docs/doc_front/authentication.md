# Authentification

Pour l'authentification, on utilise Redux via le module login.

A chaque fois qu'un utilisateur se connecte, on stocke son token dans le localStorage. A chaque fois qu'un utilisateur se déconnecte, on supprime son token du localStorage.

On définit également dans redux le `state.login.user` qui contient les informations de l'utilisateur connecté et le `state.login.token` qui contient le token de l'utilisateur connecté.

Au rechargement de la page ou lors d'une nouvelle session, on va chercher le token dans le localStorage et on le stocke dans le `state.login.token`. On va ensuite chercher les informations de l'utilisateur connecté grâce au token et on les stocke dans le `state.login.user`.
