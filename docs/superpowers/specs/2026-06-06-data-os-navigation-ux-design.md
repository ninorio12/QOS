# Data OS — Navigation & UX Polish (sans refonte)

**Date :** 2026-06-06
**Statut :** Validé, prêt pour plan d'implémentation
**Déploiement cible :** vividflow-service-execution-os.vercel.app (projet `/root/QOS`)

## Problème

Cliquer sur un module du Data OS ne donne pas une sensation fluide. Les
symptômes rapportés couvrent les quatre dimensions : lag/flash au switch,
manque de polish, loading perçu lent, transitions plates.

### Cause racine (n°1)

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

Le reste du code est déjà soigné (durées de transition cohérentes, un
`PageTransition` sans `mode="wait"`, `prefers-reduced-motion` géré, un début de
prefetch au hover). Le levier propre est donc d'éliminer le remount, puis
d'affiner la navigation perçue et le polish.

## Objectifs

1. Supprimer le remount d'`AppShell` entre modules (fondation).
2. Rendre la navigation perçue instantanée (prefetch + feedback de clic).
3. Polir les transitions de façon sûre, sans toucher au contenu des modules.

## Contraintes

- **Pas de refonte** : aucune modification du contenu/logique des modules.
- **Ne pas casser l'existant** : URLs inchangées, auth en pause inchangée.
- Respecter `prefers-reduced-motion`.
- Le middleware est un passthrough (aucune route protégée par chemin) → la
  migration en route group est sûre côté auth.

## Design

### Couche 1 — Route group `(app)/` (fondation)

Un route group `(public)/` existe déjà : on suit la même convention.

- Créer `src/app/(app)/layout.tsx` contenant l'unique
  `return <AppShell>{children}</AppShell>`.
- Déplacer dans `src/app/(app)/` toutes les routes qui wrappent aujourd'hui
  `AppShell` via leur `layout.tsx`. Liste des segments concernés (source :
  `grep -rl AppShell src/app --include=layout.tsx`) :
  `dashboard, prospection, workflows, logs, transcripts, conversations,
  onboarding, integrations, equipe, budget, parametres, contacts, knowledge,
  pipeline, calendrier, taches, paiement, performance, bibliotheque, devis,
  chatbot, communication`.
- **Supprimer** le `layout.tsx` individuel de chacune de ces routes (le shell
  vient désormais du layout du groupe). Conserver les autres fichiers de
  chaque route tels quels (`page.tsx`, `loading.tsx`, `actions.ts`,
  sous-routes `[id]`, `feed`, `clients`…).
- **Ne pas déplacer** les routes publiques / sans shell :
  `login, formulaire (+ /merci), signer/[token], seed-demo, (public)/start`,
  ni les routes qui n'utilisent pas `AppShell` aujourd'hui — vérifier chacune
  avant déplacement (déplacer une route SSI elle a un `layout.tsx` important
  `AppShell`).
- Les URLs ne changent pas (un route group `(app)` n'apparaît pas dans le
  chemin).
- **Supprimer** dans `Sidebar.tsx` le hack de scroll devenu inutile : les deux
  `useLayoutEffect`/`useEffect` qui lisent/écrivent
  `sessionStorage.sidebar_scroll` (la sidebar ne remonte plus, le scroll
  persiste naturellement). Vérifier qu'aucune autre logique ne dépend de cette
  clé.

**Vérification :** après migration, naviguer entre 3+ modules ne doit
provoquer aucun flicker de la sidebar (l'avatar/nom restent stables, pas de
flash de l'état `!isLoaded`), et le scroll de la sidebar reste à sa position.

### Couche 2 — Navigation perçue instantanée

- **Prefetch hover généralisé.** Aujourd'hui `PREFETCH_MAP` ne couvre que 4
  endpoints (`/dashboard`, `/conversations`, `/calendrier`, `/devis`).
  L'étendre aux modules qui ont une API de liste équivalente. Pour chaque
  entrée du `NavLink`, conserver le prefetch SWR au `onMouseEnter`. Laisser
  `<Link>` faire son prefetch de route Next par défaut (ne pas le désactiver).
- **Feedback de clic immédiat.** Ajouter un indicateur de navigation en cours :
  fine barre de progression en haut (couleur `#FF4D00`, ~2px), affichée tant
  que la navigation est *pending*. Implémentation via l'état de navigation
  (`useLinkStatus` de `next/link` sur chaque lien, ou un composant global qui
  écoute `usePathname` + un état pending). Doit se masquer dès que la nouvelle
  page est rendue. Respecte `prefers-reduced-motion` (la barre reste, mais sans
  animation superflue).
- **Skeletons cohérents.** Auditer les `loading.tsx` existants
  (`conversations, dashboard, contacts, logs, calendrier, equipe, devis`) et
  ajouter un `loading.tsx` aux modules qui n'en ont pas mais chargent de la
  data. Chaque skeleton doit reproduire la grille/les blocs réels du module
  pour qu'il n'y ait **aucun saut de layout** quand la data arrive (mêmes
  hauteurs, mêmes colonnes).

### Couche 3 — Polish solide (sans shared-layout)

- **Transition d'entrée conservée.** Garder `PageTransition` tel quel
  (fade + translateY 6px, 220ms, `cubic-bezier(0.22,1,0.36,1)`,
  `prefers-reduced-motion` géré). Ne pas introduire de `mode="wait"`.
- **Fondu enchaîné skeleton → contenu.** Quand la data remplace le skeleton,
  faire un cross-fade court (≈150ms) plutôt qu'un swap brut. Mécanisme léger
  (classe CSS d'apparition sur le conteneur de contenu), réutilisant les
  keyframes existants de `globals.css` (`page-fade-in`, `vf-page-enter`).
- **États sidebar affinés.** Hover/active déjà à `transition-all 150ms` : garder
  l'esthétique, vérifier la cohérence des durées et que l'état actif
  (`bg-[#FF4D00]`) ne « pop » pas. Pas de nouvelle animation structurelle.
- **Pas de** `layoutId`/shared-layout framer-motion (hors scope, jugé risqué).

## Hors scope (YAGNI)

- Animations shared-layout / `layoutId`.
- Refonte visuelle ou fonctionnelle des modules.
- Changement de design system / tokens.
- Réactivation de l'auth (middleware reste passthrough).

## Plan de vérification

1. **Build** : `next build` passe sans erreur de route (aucun conflit de
   segment dupliqué entre `(app)` et racine).
2. **URLs** : chaque module reste accessible à la même URL (`/dashboard`,
   `/conversations/feed`, `/pipeline/clients`, `/contacts/[id]`…).
3. **Smoothness** : navigation entre 4 modules — pas de flash sidebar, pas de
   reset scroll sidebar, header stable.
4. **Prefetch** : au hover d'un lien, l'endpoint correspondant est préchargé
   (vérif réseau) ; au clic, la barre de progression apparaît puis disparaît.
5. **Reduced motion** : avec `prefers-reduced-motion: reduce`, aucune
   translation/animation superflue.
6. **Routes publiques** : `login`, `formulaire`, `signer/[token]` ne montrent
   pas `AppShell` et fonctionnent toujours.

## Risques & mitigations

- **Déplacement de ~21 dossiers** : mécanique mais large. Mitigation : déplacer
  en bloc avec `git mv` (préserve l'historique), un module à la fois si besoin,
  `next build` après chaque vague.
- **Conflit de segments** : si une route existe à la fois sous `(app)` et hors
  groupe, Next lève une erreur de route ambiguë. Mitigation : la vérif build
  (point 1) le détecte immédiatement.
- **Dépendance cachée au scroll sessionStorage** : avant suppression, `grep`
  sur `sidebar_scroll` pour confirmer qu'aucun autre code ne l'utilise.
