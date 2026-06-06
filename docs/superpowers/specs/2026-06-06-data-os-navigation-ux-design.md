# Data OS — Navigation & UX Polish (sans refonte)

**Date :** 2026-06-06
**Statut :** Validé (scope révisé), prêt pour plan d'implémentation
**Déploiement cible :** vividflow-service-execution-os.vercel.app (projet `/root/QOS`)

## Problème

Cliquer sur un module du Data OS ne donne pas une sensation fluide : flash au
switch, sensation de rechargement complet entre deux modules.

### Cause racine

`AppShell` (Sidebar + Header + ThemeSync + ModuleGuard) est monté depuis un
`layout.tsx` **par route** (`src/app/dashboard/layout.tsx`,
`src/app/conversations/layout.tsx`, … ~21 routes, chacune `return
<AppShell>{children}</AppShell>`).

En Next.js App Router, des segments de routes **sœurs** ne partagent pas leur
layout. Conséquence : à chaque navigation entre deux modules, tout `AppShell`
se **démonte puis remonte** :

- re-fetch des données user (`useCurrentUser`) → flicker du `if (!isLoaded)`,
- reset du scroll de la sidebar (d'où le hack `useLayoutEffect` qui restaure
  `sessionStorage.sidebar_scroll`),
- framer-motion réinitialisé pour toute la coquille,
- flash visuel = sensation de « rechargement complet ».

## Contexte & décision de scope

Le projet est en **phase build, auth en pause, sans utilisateur réel**, et la
structure des routes est en **churn actif** (modules ajoutés/retirés/déplacés
chaque semaine). Deux conséquences sur le scope :

1. **On ne fait PAS de route group `(app)/`.** Déplacer ~21 dossiers en plein
   churn = gros diff fragile, pour une « propreté » de convention non
   nécessaire maintenant. On obtient le **même** résultat anti-remount via un
   *conditional shell* dans le root layout — diff ~10x plus petit, sans
   `git mv`.
2. **On ne touche pas aux skeletons.** Ils existent déjà et sont suffisants ;
   les recaler maintenant pourrirait au prochain changement de module.

## Objectifs

1. Supprimer le remount d'`AppShell` entre modules (fondation).
2. Rendre la navigation perçue instantanée (prefetch hover + feedback de clic).

## Contraintes

- **Pas de refonte**, **pas de déplacement de dossiers**, URLs inchangées.
- Ne pas casser l'existant ; auth en pause inchangée (middleware passthrough).
- Respecter `prefers-reduced-motion`.

## Design

### Couche 1 — Conditional shell dans le root layout (fondation)

- Déplacer le montage d'`AppShell` dans le **root layout**
  (`src/app/layout.tsx`), via un wrapper client unique (`AppShell` est déjà
  `'use client'`, ou un petit `ShellGate` client autour).
- Ce wrapper lit `usePathname()` : si le chemin appartient à l'ensemble
  **public/sans-shell**, il rend uniquement `{children}` ; sinon il rend
  `<AppShell>{children}</AppShell>`.
- Ensemble public/sans-shell (liste explicite, à confirmer route par route
  avant suppression) : `login`, `formulaire` (+ `/merci`), `signer/[token]`,
  `seed-demo`, `(public)/start`, et toute route qui **n'a pas** de `layout.tsx`
  important `AppShell` aujourd'hui. Règle de matching : préfixe de path
  (`pathname.startsWith(...)`), avec attention aux faux positifs.
- **Supprimer** les ~21 `layout.tsx` par route qui font
  `return <AppShell>{children}</AppShell>` (source :
  `grep -rl AppShell src/app --include=layout.tsx`) :
  `dashboard, prospection, workflows, logs, transcripts, conversations,
  onboarding, integrations, equipe, budget, parametres, contacts, knowledge,
  pipeline, calendrier, taches, paiement, performance, bibliotheque, devis,
  chatbot, communication`. Conserver le `(public)/layout.tsx` existant.
- **Supprimer** dans `Sidebar.tsx` le hack de scroll devenu inutile : les
  `useLayoutEffect`/`useEffect` qui lisent/écrivent
  `sessionStorage.sidebar_scroll` (la sidebar ne remonte plus). `grep` sur
  `sidebar_scroll` avant suppression pour confirmer qu'aucun autre code ne
  l'utilise.

Comme `AppShell` vit désormais dans le root layout (parent commun de toutes les
routes), il **ne remonte jamais** lors d'une navigation entre modules. Seul le
contenu de page swap.

**Vérification :** naviguer entre 3+ modules — aucun flicker sidebar (avatar/nom
stables, pas de flash `!isLoaded`), scroll sidebar conservé, header stable. Les
routes publiques (`login`, `formulaire`, `signer`) ne montrent pas la coquille.

### Couche 2 — Navigation perçue instantanée

- **Prefetch hover généralisé.** `PREFETCH_MAP` ne couvre aujourd'hui que 4
  endpoints (`/dashboard`, `/conversations`, `/calendrier`, `/devis`).
  L'étendre aux modules disposant d'une API de liste équivalente, en gardant le
  prefetch SWR au `onMouseEnter` du `NavLink`. Laisser `<Link>` faire son
  prefetch de route Next par défaut.
- **Feedback de clic immédiat.** Barre de progression fine en haut (couleur
  `#FF4D00`, ~2px) affichée tant que la navigation est *pending*, masquée dès
  que la nouvelle page est rendue. Implémentation via l'état de navigation
  (`useLinkStatus` de `next/link`, ou composant global écoutant `usePathname` +
  état pending). Respecte `prefers-reduced-motion`.

## Hors scope

- Route group `(app)/` et tout déplacement de dossiers.
- Audit / recalage des skeletons (existants, conservés tels quels).
- Cross-fade skeleton→contenu, animations shared-layout / `layoutId`.
- Refonte visuelle des modules, changement de design system, réactivation auth.

## Plan de vérification

1. **Build** : `next build` passe (aucune erreur de route, aucun import cassé
   après suppression des layouts).
2. **URLs** : chaque module reste accessible à la même URL (`/dashboard`,
   `/conversations/feed`, `/pipeline/clients`, `/contacts/[id]`…).
3. **Smoothness** : navigation entre 4 modules — pas de flash sidebar, pas de
   reset scroll, header stable.
4. **Routes publiques** : `login`, `formulaire`, `signer/[token]` ne montrent
   pas `AppShell`.
5. **Prefetch** : au hover d'un lien mappé, l'endpoint est préchargé (réseau) ;
   au clic, la barre de progression apparaît puis disparaît.
6. **Reduced motion** : `prefers-reduced-motion: reduce` → aucune animation
   superflue.

## Risques & mitigations

- **Liste public/sans-shell incomplète** → une page publique afficherait la
  coquille (ou l'inverse). Mitigation : dériver la liste exactement des routes
  qui aujourd'hui n'ont pas de layout `AppShell`, vérifier route par route, et
  tester chaque route publique (point 4).
- **Faux positif de préfixe** (`startsWith`) → une route applicative matchée
  comme publique. Mitigation : préférer des préfixes non ambigus, tester.
- **Dépendance cachée à `sidebar_scroll`** → `grep` avant suppression.
