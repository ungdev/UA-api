# Les tests

Afin de s'assurer que le code est fonctionnel, de nombreux tests ont étés en place.

Nous utilisons en majorité des tests d'intégration : c'est à dire des tests testant un controlleur entier et non une fonction.

Les tests sont placés dans le dossier `tests` et se terminent tous par `*.test.ts`.

Aucune requête ne doit sortir à l'extérieur des tests, afin d'assurer une indépendance du code, ainsi qu'une accéssibilité aux tests pour tout le monde.
De plus, tous les tests doivent pouvoir fonctionner avec les variables d'environnement par défaut : lors des tests, les variables d'environnement spécifiées par le shell ou par Dotenv ne sont pas injectées.

Dans le cas où le contrôleur possède une fonctionnalité difficile à tester, on stubera dans le test d'intégration la fonction responsable, et on testera individuellement cette fonction.

Par exemple, dans `tests/callbacks/etupay.test.ts`, on stub la fonction `sendEmail` car cette fonction est testé à un autre niveau et qu'elle est difficile à manupuler.

Afin de vérifier que le code est bien testé, on utilisera des outils de coverage avec `nyc` pour le dépôt local et `codecov` pour le dépôt distant.
