# NextJS

On ne parlera ici que des fonctionnalités de NextJS qui nous intéressent pour le moment. Pour avoir des informations plus complètes, vous pouvez vous référer à la [documentation officielle](https://nextjs.org/docs).

## Pages

Les routes de l'application sont définies par l'achitecture des fichiers dans le dossier `src/app/`. Par exemple, le fichier `src/app/page.tsx` correspond à la route `/` de l'application et le fichier `src/app/dashboard/page.tsx` correspond à la route `/dashboard`.

## Layout

Le layout de l'application est défini dans le fichier `src/app/layout.tsx`. Il est utilisé pour toutes les pages de l'application. Il permet de définir des éléments qui seront présents sur toutes les pages de l'application, comme le header ou le footer (via le composant `Wrapper.tsx`).

Des sous-layouts peuvent être définis dans des sous-dossiers du dossier `src/app/`. Par exemple, le layout `src/app/dashboard/layout.tsx` est utilisé pour toutes les pages du dashboard.

## Groups

Les dossiers ayant des parenthèses dans leur nom sont des groupes de pages. Par exemple, le dossier `src/app/(dashboard)` est un groupe de pages. Il n'impact pas les routes de l'application, mais permet de regrouper des pages qui ont un lien entre elles et de facilement configurer un layout commun à toutes ces pages.

## SSR (Server Side Rendering)

Par défault, NextJS utilise le rendu côté serveur. Cela signifie que le code de la page est exécuté côté serveur et que le résultat est envoyé au client. Cela signifie que les composants doivent avoir la mention `'use client';` pour être exécutés côté client et ainsi pouvoir utiliser useEffect, useState, etc.