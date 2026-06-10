# Auth Clerk — Pause pendant la phase build (puis Clerk Production au lancement)

Date : 2026-06-04
Décision validée par : Jonathan / Thomas

## Contexte / pourquoi
Le SaaS tournait sur une **instance Clerk de _développement_** (`pk_test_`, issuer `central-amoeba-18.clerk.accounts.dev`) sur un **domaine de production** `*.vercel.app`. Une instance dev route l'auth via `accounts.dev` (autre domaine) → le navigateur bloque ces opérations cross-domaine (CORS, « domains must match ») → bugs intermittents sur tout flux d'auth (navigation protégée, `/parametres`, logout, session qui flappe).

Le SaaS n'étant **pas terminé**, sécuriser l'auth maintenant est prématuré. Décision : **mettre l'auth en pause** pendant le build, la **rallumer proprement au lancement** (Clerk Production + domaine custom).

Accès pendant le build : **ouvert** (données démo, pas de mot de passe).

## Ce qui change (Option A — pause légère, réversible)
1. `src/middleware.ts` → **passe-partout** : plus aucune route protégée, plus de `auth.protect()`, plus de redirection `accounts.dev`.
2. `src/hooks/useCurrentUser.ts` → renvoie un **admin fixe** (`role: 'admin'`, tous les modules) → l'app se comporte comme un admin connecté, sans dépendre de Clerk.

3. `src/components/Providers.tsx` → Convex via **`ConvexProvider` simple** (plus `ConvexProviderWithClerk`) : sinon les queries Convex **attendent que Clerk soit prêt** → restent en skeleton. Original sauvegardé : `docs/superpowers/specs/Providers.clerk.bak`.

`ClerkProvider` reste en place (les hooks `useClerk` ne cassent pas). Convex tourne en non-authentifié (les fonctions n'imposent pas d'auth) → les données se chargent immédiatement.

Caveat : le bouton **logout n'a pas de sens en démo** (pas de session) — à ignorer pendant le build.

## Checklist de réactivation (au lancement)
1. **Domaine** : choisir `app.<domaine-de-jonathan>` et l'assigner au projet Vercel.
2. **Clerk Production** : créer une instance Production dans le dashboard Clerk.
3. **DNS** : ajouter les enregistrements CNAME Clerk (clerk, accounts, clkmail…) sur le domaine.
4. **Clés** : mettre `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…` et `CLERK_SECRET_KEY=sk_live_…` dans Vercel (Production).
5. **Modèle JWT `convex`** : le recréer dans l'instance **Production** (le dev ne se transfère pas).
6. **`convex/auth.config.ts`** : remplacer le `domain` par l'issuer Production (`https://clerk.<domaine>` ou l'issuer prod fourni par Clerk).
7. **Révert** : restaurer `middleware.ts` et `useCurrentUser.ts` depuis git (versions Clerk).
8. **Users** : les comptes se re-lient par **email** à la 1ʳᵉ connexion prod (`users.syncFromClerk` matche par email) → Thomas/Jonathan retrouvent leur rôle admin.
9. Redéployer + tester login / navigation / logout (tout same-origin, plus de CORS).

## Réversibilité
Aucune suppression. Les versions Clerk de `middleware.ts` et `useCurrentUser.ts` restent dans l'historique git → `git checkout <commit> -- src/middleware.ts src/hooks/useCurrentUser.ts` pour revenir.
