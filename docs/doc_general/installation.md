# Installation de WSL

**Cette installation concerne Windows 10, si ce n'est pas votre cas, contactez le respo dev.**

##### _Pour aller plus vite, ayez un bonne connexion lors de l'installation._

On va commencer par installer WSL (Windows Sub-system for Linux). Il y a 2 méthodes, l'une d'elle est plus simple mais elle ne fonctionne pas sur tous les ordinateurs.

### Méthode rapide

Dans le menu démarrer de Windows, cherchez `Invite de commandes`, et exécutez le en tant qu'administrateur.

> Si le nom de WSL vous dit déjà quelque chose et que vous l'avez déjà utilisé sur votre machine, exécutez `wsl -l -v`. La commande vous donnera le nom de la version utilisée (eg. _Ubuntu_ ou _Ubuntu-20.04_). Utilisez le maintenant dans la commande `wsl --set-version <version> 1`. [Passez ensuite à la section suivante](#setup-de-visual-studio-code) s'il n'y a pas d'erreur.

Pour installer WSL 1, exécutez `wsl --set-default-version 1` **puis** `wsl --install`. Il est également possible d'utiliser WSL 2 mais ce sera plus compliqué pour installer la base de données _(et ce n'est pas détaillé dans cette doc)_

> Si la méthode rapide a fonctionné, vous pouvez [passer à la section suivante](#setup-de-visual-studio-code).

### Méthode lente

Dans le menu démarrer, cherchez et démarrez l'application `Activer ou désactiver les fonctionnalités Windows`. Cochez la case `Sous-système Windows pour Linux`, puis appuyez sur `ok`.

Allez sur https://docs.microsoft.com/en-us/windows/wsl/install-manual. Téléchargez la dernière version de Ubuntu. Lancez le fichier d'installation.

### Préparer Ubuntu

Quelque soit la méthode utilisée, Ubuntu devrait être installé. Lancez l'application Ubuntu dans le menu démarrer. Si elle n'est pas présente, l'installation a échoué. Si tout s'est bien passé, vous devriez voir un invite de commande s'ouvrir. Ubuntu va alors commencer à s'installer. Au bout d'un moment, il vous demande un nom d'utilisateur, un mot de passe, et une confirmation de mot de passe, pour vous créer votre environnement Ubuntu. Les mots de passe ne s'afficheront pas quand vous les taperez.

# Setup de Visual Studio Code

### VS Code

Installez Visual Studio Code depuis https://code.visualstudio.com.

Ouvrez Visual Studio Code. Ouvrez l'onglet `Extensions` (à gauche de la fenêtre).
Depuis cet onglet, installez l'extension `Remote - WSL`. Vous devriez voir un bouton bleu (ou d'une autre couleur si vous avez un thème) apparaître en bas à gauche.
Cliquez dessus, et choisissez `New WSL Window` dans la fenêtre qui s'ouvre en haut. Une nouvelle fenêtre Visual Studio Code s'ouvre. Sur le bouton en bas à gauche, il y a écrit `WSL: Ubuntu`. Vous pouvez fermer l'ancienne fenêtre, c'est-à-dire celui sans le texte sur le bouton bleu. Vous pouvez retourner dans l'onglet `Extensions` et installer les extensions suivantes :

- EditorConfig VS Code
- ESLint
- Git Graph
- Prettier - Code formatter

Il faut maintenant indiquer le formateur par défaut. Appuyez simultanément sur les touches `CTRL` et `,`. Une fois dans les paramètres, chercher `format`, puis trouver le paramètre appelé `Default formatter`. Mettre sa valeur à `Prettier - Code formatteur`. Deux lignes plus bas, cochez la case correspondant à `Editor: Format on save`. Enfin, redémarrez Visual Studio Code pour que les changements soient pris en compte.

### Ubuntu

Retournez dans l'invite de commande Ubuntu, et tapez les commandes suivantes. Pour certaines commandes, l'invite de commande demandera le mot de passe administrateur : c'est celui que vous avez entré lors de la création du système. Comme la première fois, le mot de passe ne s'affichera pas quand vous le rentrerez.

1.  `curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -`
2.  `sudo apt-get install -y nodejs`
3.  `sudo npm install -g yarn`

Si en tapant `yarn --version`, vous n'obtenez pas d'erreur, vous avez réussi à installer yarn !

​Ensuite, il va falloir récupérer votre clé SSH afin de la lier à votre compte GitHub (créez-en un si vous n'en avez pas) :

- Exécutez `cat ~/.ssh/id_rsa.pub`

Si cela vous affiche un résultat, c'est que vous avez déjà une clé SSH.
Sinon, il faudra en générer une :

`ssh-keygen` et garder les options par défaut _(appuyer sur entrée à chaque fois que la commande demande d'entrer une valeur)_
et refaire `cat ~/.ssh/id_rsa.pub`

Si tout ce passe bien, cela devrait vous afficher une longue clé. Il s'agit de votre clé SSH publique, que vous devrez copier. Pour copier dans l'invite de commande Ubuntu, sélectionnez la clé et cliquez sur l’icône Ubuntu en haut à gauche de la fenêtre, puis sur Modifier, et sur Copier.

Allez ensuite sur https://github.com/settings/ssh/new, mettez le nom que vous voulez ('SSH Laptop', 'SSH Ubuntu' ou 'SSH UA' par exemple), et copiez l'entièreté de la clé dans le champ prévu à cet effet. Cliquez sur le bouton `Add SSH Key`.

On va maintenant se connecter à notre compte GitHub depuis Ubuntu.Pour cela, toujours dans la console Ubuntu, entrez la commande `ssh git@github.com`. S'il y a un avertissement, tapez `yes`. La console devrait vous dire bonjour.

# Récupérer le code

Pour récupérer le code, il faut "cloner" le dépôt Github. Commencez par créer un dossier où vous enregistrerez vos modifications, toujours via l'invite de commande Ubuntu.

> Pour créer un dossier \
> `mkdir ua; cd ua`

> Pour cloner le git en ssh \
> `git clone git@github.com:ungdev/UA-api.git` \
> `git clone git@github.com:ungdev/UA-front.git`

### Préparer le [front](https://github.com/ungdev/UA-front)

Utilisez la commande `cd UA-front` pour vous déplacer dans le dossier du front. \
Désormais, exécutez `yarn` et laissez les dépendances s'installer ! \
Executez enfin `cp .env.example .env` pour génerer le fichier de configuration des variables d'environnement.

Le front est prêt ! Retrouvez sur le readme [la liste des scripts disponibles](https://github.com/ungdev/UA-front#scripts-disponibles).

### Préparer l'[api](https://github.com/ungdev/UA-api)

Utilisez la commande `cd ../UA-api` _(ou `cd UA-api` si vous ne venez pas de terminer l'étape précédente)_ pour vous déplacer dans le dossier de l'api. \
Désormais, exécutez `yarn` et laissez les dépendances s'installer !

#### Créer une base de donnée locale

Afin de tester le code dans de bonnes conditions, vous aurez besoin de créer une base de donnée locale, avec laquelle votre code va interagir.

# Utiliser Wamp

Télécharger Wampserver sur https://sourceforge.net/projects/wampserver et lancez le fichier d'installation (cliquer sur suivant suivant....).

Lancez Wampserver64 depuis le menu Démarrer.

À droite de votre barre des tâches (peut être dans les icônes cachées), une icône avec un W dedans devrait apparaître. Attendez que l'icône soit verte. Cliquez dessus (clique gauche simple) -> MySQL -> console MySQL -> OK -> enter password : 'ENTREE' (on ne met pas de mot de passe). Avec cette suite d'actions, votre invite de commande MySQL devrait être ouverte.

Exécutez `CREATE DATABASE arena CHARACTER SET utf8;` dedans. Cela va créer une base de données vide, nommée "arena" et encodée en UTF8.

Depuis le terminal Ubuntu, dans le dossier du projet "UA API" que vous avez obtenu en clonant depuis GitHub, effectuez :

- `cp .env.example .env`. Ensuite, modifiez la variable `DATABASE_URL` dans le `.env` avec la valeur `mysql://root:@localhost/arena`
- `yarn prisma db push`
- `yarn fake` Commande optionnelle pour générer des faux users et fausses équipes.

Si tout ce passe bien, vous devriez avoir un retour avec marqué, entre autres, `Your database is now in sync with your schema`.
_Si prisma n'arrive pas à se connecter à la base de données (ERR: P1001), [assurez vous d'utiliser WSL 1](#méthode-rapide)._

Ensuite, ouvrez PhpMyAdmin (une interface graphique pour interagir avec la base de données locale) en cliquant sur l'icône de Wampserver dans la barre des tâches (clic gauche), puis sur PhpMyAdmin.
Une page web locale va s'ouvrir. Si des codes sont demandés, entrez "root" en tant que Username, et laissez le champ du mot de passe vide. Le type de base de donnée doit être MySQL.
Une fois connecté, cliquez sur "arena" sur la liste des bases de données à gauche. Vous avez maintenant une vue globale sur le contenu de cette base de données. Vers le haut de la fenêtre, accédez à l'onglet SQL. Vous aurez la possibilité d'exécuter des requêtes SQL, et c'est d'ailleurs ce que vous devez faire :

- Dans Visual Studio Code, projet UA-api, copiez intégralement le contenu du fichier `seed.sql` (il est au premier niveau de l'arborescence des dossiers, il ne devrait pas être compliqué à trouver).
- Collez le tout sur phpMyAdmin, sur le champ de requête auquel vous venez d'accéder.
- Cliquez sur `Exécuter`

Félicitation, vous venez d'importer toutes les données dans la base de données locale. Faites attention à ne pas répéter cette dernière opération plusieurs fois, car cela affichera un message d'erreur. Vous pouvez maintenant fermer phpMyAdmin, ou vous amuser à explorer la base de données.

# Utiliser mysql

Ouvrez votre invite de commande Ubuntu et entrez la commande `sudo apt install mysql-server`.

Pour lancer votre base de données locale, exécutez la commande `sudo service mysql start` puis faites `sudo mysql` pour entrer dans la console de votre base de données.

Nous allons maintenant créer un compte avec toutes les permissions pour avoir accès à toutes les fonctionnalités. Pour cela, commencez tout d'abord par entrer `CREATE USER 'dev'@'%' IDENTIFIED BY 'dev';`. Cette ligne va permettre de créer un utilisateur nommé `dev` avec comme mot de passe `dev`. Pour lui attribuer tous les privilèges, tapez maintenant `GRANT ALL PRIVILEGES ON *.* TO 'dev'@'%' WITH GRANT OPTION;` pour ensuite faire `FLUSH PRIVILEGES;` pour appliquer toutes les modifications.
Créons maintenant le table `arena`. Pour cela, faites `CREATE DATABASE arena CHARACTER SET utf8;`.

Vous pouvez sortir de la console mysql en faisant `exit`.

Si ce n'est pas déjà fait, copiez le fichier `.env.example`. Pour ce faire, tapez simplement `cp .env.example .env`. Rendez-vous dans le fichier `.env` et au niveau de la variable `DATABASE_URL`, changez le `root@root` en `dev@dev` et le `localhost` en `127.0.0.1`. La ligne doit ressembler à `DATABASE_URL=mysql://dev:dev@127.0.0.1/arena`.

On va maintenant installer les dépendances manquantes. Pour cela, entrez juste `yarn`.
Il faut ensuite configurer les fichiers pour la base de données. Il faut entrer la commande suivante : \
`yarn prisma db push` - cela va créer les tables de la base de données ainsi que leur structure.

Maintenant la base de données configurée, nous allons la remplir grâce au fichier seed.sql qui se trouve dans le dossier. Entrez `mysql -u dev -p arena < seed.sql` pour, dans un premier temps se connecter à la base de données puis dans un second temps remplir cette base de données avec les informations du fichier seed.sql. Le mot de passe à utiliser quand il est demandé est `dev`.

Pour voir si tout s'est correctement passé, faites la commande `yarn dev`.

Félicitation, vous venez d'importer toutes les données dans la base de données locale.

# Pour aller plus loin

Dans VS Code, vous pouvez :

- utiliser la police [Fira Code](https://github.com/tonsky/FiraCode).
- installer l'extension Git Lens.
- installer un thème (ex: One Dark Pro)
- installer un thème d'icones (ex: Material Icon Theme)
