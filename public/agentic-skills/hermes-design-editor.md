---
name: hermes-design-editor
description: Use when Thomas/Jonathan wants a Canva/Claude Design-like editor mode inside a real Vercel/web project to visually move UI elements, edit text/captions, leave anchored comments, or export precise design feedback for an agent/dev.
version: 1.0.0
author: VividFlow / Hermes
license: proprietary
metadata:
  hermes:
    tags: [hermes, design-editor, canva, claude-design, vercel, visual-feedback, drag-drop]
    related_skills: [vividflow-interactive-editor, frontend-ui-workflow, webapp-testing, deploy-to-vercel]
---

# Hermes Design Editor

## Principe

Hermes Design Editor = une couche d’édition visuelle type **Canva / Claude Design**, injectée directement dans le vrai projet web/Vercel.

Ce n’est pas un outil séparé, pas un canvas vide, pas Figma.

Le but : permettre à Thomas/Jonathan d’ouvrir une page réelle, cliquer sur `Editor mode`, déplacer les éléments, changer les textes/captions, ajouter des commentaires ancrés, puis exporter un JSON que l’agent/dev peut transformer en modifications précises.

## Quand l’utiliser

Utiliser ce skill quand l’utilisateur dit ou implique :

- “principe de Canva” ;
- “Claude Design” ;
- “editor mode” ;
- “je veux déplacer les éléments directement sur Vercel” ;
- “drag and drop les éléments” ;
- “changer les écritures” ;
- “caption commentaire” ;
- “je veux commenter exactement à l’endroit où je parle” ;
- “pas un outil séparé” ;
- “bouton en haut à droite”.

## Règle anti-dénaturation

Hermes Design Editor ne doit jamais transformer le projet en cours en “outil d’édition”. Le produit reste le produit.

Règles :

- ne pas remplacer le layout, la DA, le routing ou les composants existants ;
- ne pas ajouter de sidebar/toolbox visible permanente ;
- ne pas casser les interactions normales quand `Editor mode` est OFF ;
- ne pas commiter les déplacements `localStorage` comme vérité produit sans validation ;
- l’overlay doit être une couche temporaire, discrète, désactivable ;
- privilégier staging/preview ou feature flag ;
- retirer/désactiver l’overlay avant livraison client finale si le mode n’est pas censé être public.

Le test principal : si quelqu’un ouvre le projet sans activer le bouton, il ne doit voir aucune différence.

## UX cible

Sur le vrai projet :

- petit bouton top-right : `Editor mode` ;
- OFF = app normale ;
- ON = mode édition visuelle ;
- clic sur élément = sélection ;
- drag/drop = déplacement visuel ;
- double-clic texte/caption = édition inline ;
- bulle commentaire à côté de l’élément ;
- pin/commentaire visible sur l’élément commenté ;
- sauvegarde locale `localStorage` ;
- bouton `Envoyer` qui transmet directement le feedback à Hermes/Telegram via endpoint serveur ;
- fallback clipboard seulement si l’envoi direct échoue.

## Implémentation recommandée

### 1. Injecter une micro-layer JS

Créer `public/editor-mode-overlay.js` puis l’injecter dans le layout global.

Next.js :

```tsx
import Script from "next/script";

export function EditorModeScript() {
  if (process.env.NEXT_PUBLIC_EDITOR_MODE !== "true") return null;
  return <Script src="/editor-mode-overlay.js" strategy="afterInteractive" />;
}
```

Ajouter `<EditorModeScript />` dans le layout/app shell.

### 2. Protéger l’activation

Par défaut :

```bash
NEXT_PUBLIC_EDITOR_MODE=true
```

Uniquement sur preview/staging ou route protégée. Éviter d’activer publiquement en prod client sans contrôle.

### 3. Ajouter des IDs stables

Sur les éléments importants, ajouter :

```html
<h1 data-editor-id="hero-title">...</h1>
<p data-editor-id="hero-caption">...</p>
<section data-editor-id="pricing-card-pro">...</section>
```

Sans `data-editor-id`, l’overlay génère un selector DOM, mais c’est moins propre.

## Fichiers de référence

- `references/fake-vercel-smoke-test.md` : recette de test sur faux Vercel, avec checks HTTP, QA navigateur, et pièges découverts.
- `references/vividflow-dataos-editor-mode.md` : recette spécifique VividFlow Data OS, endpoint `/api/editor-feedback`, vérifs prod et pièges de port/env Telegram.
- Snippet prototype validé localement : `/home/hermes/outputs/vividflow-editor-mode-overlay/editor-mode-overlay.js`.

Le snippet supporte déjà :

- bouton `Editor mode` ;
- sélection d’élément ;
- drag/drop ;
- édition texte/panel ;
- bulle commentaire ;
- pins de commentaires ;
- sauvegarde `localStorage` ;
- export JSON.

## Workflow agent

1. Identifier le repo/projet Vercel cible.
2. Copier/injecter `editor-mode-overlay.js`.
3. Ajouter l’import `Script` / composant d’injection.
4. Ajouter `data-editor-id` sur les composants principaux.
5. Lancer localement.
6. Tester en navigateur : toggle, sélection, drag, édition texte, commentaire, envoi direct.
7. Déployer sur Vercel preview/prod selon demande.
8. Vérifier live : HTTP 200, bouton visible, interactions OK, endpoint de feedback OK (`/api/send-feedback` ou route projet comme `/api/editor-feedback`), console clean.

### Note VividFlow Data OS

Pour le Data OS VividFlow, suivre `references/vividflow-dataos-editor-mode.md` : overlay injecté dans `src/app/layout.tsx`, endpoint `/api/editor-feedback`, stockage `/tmp/vividflow-editor-feedback`, prod alias `https://vividflow-service-execution-os.vercel.app`.

## Envoi direct à Hermes

Ne pas afficher “Export JSON” comme action principale. L’utilisateur ne doit pas manipuler un fichier.

Action principale : `Envoyer`.

Implémentation :

- le bouton construit le payload feedback en interne ;
- `POST /api/send-feedback` ou endpoint projet équivalent, ex. `/api/editor-feedback` quand le projet stocke d’abord les retours ;
- l’API serveur relaie vers Telegram/Hermes, webhook, Linear, ou stockage projet selon le contexte ;
- afficher `Envoyé ✓` si le serveur confirme ;
- si les env de relais Telegram ne sont pas configurées, ne pas bloquer l’éditeur : accepter le feedback, le stocker côté serveur, et marquer seulement `telegramSent: false` ;
- fallback discret : copier/télécharger le JSON seulement si l’endpoint échoue.

Variables serveur typiques pour Telegram :

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_THREAD_ID=...
```

Le JSON reste le format interne, pas l’UX utilisateur.

## Format interne du feedback

Le payload interne doit être interprété comme feedback design/actionnable :

```json
{
  "url": "https://project.vercel.app/page",
  "edits": [
    {
      "selector": "[data-editor-id=\"hero-caption\"]",
      "text": "Nouvelle caption",
      "x": 100,
      "y": 50,
      "comment": "Descendre cette caption sous le titre et réduire la largeur."
    }
  ]
}
```

L’agent doit traduire ça en patch réel du code, pas laisser la correction seulement dans localStorage.

## Accusé de réception et exécution sans conflit

Quand Hermes reçoit un feedback envoyé depuis l’éditeur, il doit répondre rapidement à l’utilisateur avant d’exécuter :

- si libre : `Bien reçu, j’exécute.` puis passer le feedback en tâche active ;
- si déjà occupé sur ce même projet : `Bien reçu, je l’ai ajouté à la file après l’action en cours.` ;
- si déjà occupé sur un autre projet/agent : ne pas interrompre l’agent au hasard, router vers l’inbox/queue du bon projet.

Le bouton `Envoyer` ne doit pas dépendre de l’état conversationnel live. Chaque envoi doit contenir :

```json
{
  "feedbackId": "uuid",
  "projectId": "brvndlab-or-vercel-project",
  "agentTarget": "cockpit|coo|dev|project-agent",
  "pageUrl": "https://...",
  "editorSessionId": "uuid-stable-localStorage",
  "clientRevision": 3,
  "createdAt": "ISO-8601",
  "edits": []
}
```

Règles anti-bug :

- `feedbackId` rend l’envoi idempotent : si l’utilisateur reclique, Hermes ignore le doublon ;
- `clientRevision` permet de savoir si un nouveau feedback arrive pendant une exécution ;
- l’agent traite un feedback comme un snapshot, jamais comme un DOM live ;
- si un nouveau feedback arrive pendant l’exécution, il est mis en queue ou fusionné après l’action en cours, mais ne modifie pas la tâche active en plein patch ;
- après déploiement, Hermes répond avec l’URL/preview et demande à l’utilisateur de recharger avant de renvoyer un feedback ;
- l’UI peut afficher `Envoyé — en cours côté Hermes` puis `Appliqué, recharge la page` si un canal de status existe.

Architecture recommandée : endpoint `/api/send-feedback` → stockage/queue durable → accusé immédiat Telegram/Hermes → worker agent exécute → confirmation finale.

## Erreurs à éviter

- Créer un éditeur séparé au lieu d’injecter dans le vrai projet.
- Faire une usine à gaz avec sidebar, toolbar complète, layers, etc.
- Confondre feedback visuel temporaire et vraie modification code.
- Ne pas vérifier le drag/drop en navigateur.
- Sélectionner l’enfant interne (`h3`, `p`, `span`) au lieu du bloc porteur de `data-editor-id`; la sélection doit privilégier `closest('[data-editor-id]')`.
- Laisser `body`/`html` sélectionnables, ce qui produit des selectors inutiles comme `body >`.
- Placer la bulle/panel par-dessus l’élément sélectionné au point de bloquer le drag.
- Modifier les textes via `contenteditable` seulement : sur certains boutons/tests, les espaces peuvent être avalés. Préférer un input de panel pour l’édition texte fiable.
- Oublier les `data-editor-id`, ce qui rend l’export fragile.
- Activer publiquement sur une prod sensible sans garde-fou.

## Vérification obligatoire

Avant de dire que c’est prêt :

- [ ] bouton top-right visible ;
- [ ] OFF n’impacte pas l’app ;
- [ ] ON permet la sélection ;
- [ ] drag/drop testé ;
- [ ] texte/caption éditable ;
- [ ] commentaire ancré testé ;
- [ ] bouton `Envoyer` testé ;
- [ ] endpoint serveur reçoit et relaie le feedback ;
- [ ] reload restaure les edits locaux ;
- [ ] console sans erreur bloquante ;
- [ ] live Vercel vérifié si déployé.
