# Permissions

Il existe 4 permissions : stream, entry, anim, admin. Chaque utilisateur peut avoir plusieurs permissions, comme il peut n'en avoir aucune. Les autorisation données à chaque permission sont décrites dans les parties ci-dessous.

### Stream

Pour le réseau, pour l'instant inutile.

### Entry

- Permet d'obtenir la liste des utilisateurs (route `GET /admin/users`)
- Autorise l'utilisateur à scanner les QR codes à l'entrée de l'événement (route `POST /admin/scan`)

### Anim

- Permet d'obtenir la liste des utilisateurs (route `GET /admin/users`)

### Admin

Peut tout faire, son pouvoir est sans limite 😈
