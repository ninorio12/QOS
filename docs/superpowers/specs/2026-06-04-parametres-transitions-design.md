# Module Paramètres premium + transitions fluides

Date : 2026-06-04 · Validé par : Jonathan/Thomas · Phase build (auth en pause)

## Problème
- `/parametres` (CompanySettingsView, 836 l.) = Frankenstein : réglages entreprise via route **Supabase** (objet partiel), profil en **localStorage**, users en **Convex**. Objet partiel → `form.brand_color` undefined → `hexToRgb(undefined).replace` → **crash** (`Cannot read properties of undefined (reading 'replace')`) + skeleton bloqué.
- Transitions inter-modules : `key={pathname}` re-monte la page → fade 220ms qui « pop », flash, skeletons incohérents.

## Livrable 1 — Paramètres premium à onglets
**Données → Convex (cohérent, fiable)**
- Table singleton `company_settings` + `companySettings.get` (renvoie TOUJOURS un objet complet avec défauts) + `companySettings.update`. Supprime la dépendance Supabase de la page.
- Apparence : thème via next-themes. Équipe : Convex users existant. Intégrations : `integrations.list/connect/disconnect`.
- Profil perso : local en mode démo (pas de vrai user courant pendant la pause) ; câblé au lancement.

**UI (style Linear/Vercel)**
- `SettingsShell` : rail d'onglets gauche (Entreprise · Apparence · Équipe · Intégrations) + panneau droit aéré.
- Composants : `CompanyTab`, `AppearanceTab`, `TeamTab` (réutilise gestion users), `IntegrationsTab`.
- Tokens soren, accent #FF4D00, inputs cohérents, Save collant + état « modifié » + feedback succès.
- Robustesse : tous les champs ont un défaut, aucun accès non gardé.

## Livrable 2 — Transitions crossfade
- Dépendance `framer-motion`.
- `PageTransition` (client) dans AppShell autour du contenu : crossfade + lift 8px, ~200ms, easing cubic-bezier. Sidebar/header fixes.
- `<Skeleton>` réutilisable appliqué aux états de chargement Convex des modules → plus de flash blanc ni de skeleton infini.

## Périmètre
Uniquement ces 2 livrables. Pas de refonte des autres modules.

## Vérif
Headless local : Paramètres s'affiche (pas de crash/skeleton), transitions fluides. Puis `vercel --prod` + `vercel promote` (alias principal).
