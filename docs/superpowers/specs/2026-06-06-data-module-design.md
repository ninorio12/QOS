# Data Module — Design Spec

## Goal

Rendre le module `/bibliotheque/data` réellement fonctionnel pour un humain et prêt pour Hermès (agent IA). La priorité est l'UX humaine (tags, preview, recherche, drag & drop) avec un modèle de données qui anticipe le MCP à venir.

---

## Contexte

Le module actuel est un file store basique : upload → catégories → download. Aucune recherche, aucun tag, aucun preview. Hermès — l'agent principal du SaaS — utilisera ce module comme mémoire et base de ressources via un MCP (à construire dans une prochaine itération). Ce spec couvre exclusivement l'amélioration UI et la préparation du modèle de données.

---

## Design visuel

Respecte strictement le design system du SaaS :
- Palette : `soren-card`, `soren-elevated`, `soren-border`, `soren-text`, `soren-muted`, `soren-subtle`, `soren-app`
- Accent : `#FF4D00` (orange)
- Border radius : `rounded-2xl` sur les cards, `rounded-3xl` sur les modaux, `rounded-full` sur les pills/badges
- Typographie : `text-[10px]` à `text-[13px]`, `font-semibold` ou `font-bold` sur les labels, `font-black` sur les titres
- Ombres légères (`shadow-sm`) sur hover, transitions `duration-150`
- Pas de couleurs de fond agressives — gris sombres, blanc/8 pour les hovers

---

## Layout

### Vue principale (aucune catégorie sélectionnée)

```
Header :
  [🔍 Rechercher par nom ou tag…]     [+ Lien]  [Importer ↑]

Sous le header :
  [Category tabs : Tout | PDF | Images | Markdown | Notion | GitHub | Vercel | Liens | …]
  [Tag chips filtres : #brief  #client  #template  …  (+ Clear si actifs)]

Corps :
  Grille 2-4 col de cards (responsive) — chaque card = 1 item
```

### Card d'un item

```
┌───────────────────────────────────────┐
│  [icône type]  Nom du fichier         │
│                .pdf · 2,4 Mo          │
│  [#tag1] [#tag2]                      │
│                         [⬇] [🔗] [🗑] │
└───────────────────────────────────────┘
```

Hover : border plus visible, shadow-sm. Clic sur la card → preview panel.

### Preview panel (slide depuis la droite)

Split-view : liste à gauche (réduite) + panneau preview à droite. Le panneau peut être fermé (×).

Rendu par type :
- **Image / SVG** : `<img src={url}>` centré, avec zoom au clic
- **PDF** : `<iframe src={signedUrl} class="w-full h-full">` — Convex signe l'URL à la demande
- **Markdown** : fetch du fichier → parse → rendu HTML via `marked` (à installer, ~10 KB gzipped, zero dep)
- **Lien (Notion, GitHub, Vercel, autre)** : affiche l'URL, le nom, les tags, description — bouton "Ouvrir →" en `target="_blank"`. Pas d'iframe (X-Frame-Options bloquants).

Le panneau affiche aussi :
- Nom éditable inline (blur → sauvegarde via mutation Convex)
- Description optionnelle (textarea, blur → sauvegarde)
- Tags (ajout / suppression inline)
- Métadonnées : taille, date d'ajout, catégorie

---

## Tags

### UX

- Sur chaque card : chips `#tag` en `text-[10px] font-bold px-2 py-0.5 rounded-full`
- Couleur : fond `#FF4D00/15`, texte `#FF4D00` — cohérent avec le SaaS
- Dans le panneau preview : ajout via un input `+ tag` (Enter ou virgule pour confirmer)
- Suppression : clic sur `×` à côté du tag
- Header : tag filter chips — clic pour activer/désactiver (multi-select), s'accumulent avec le filtre catégorie

### Autocomplete tags

Les tags existants dans tous les items sont proposés en autocomplete lors de la saisie d'un nouveau tag (dérivé client-side depuis la liste Convex).

---

## Recherche et filtres

- Barre de recherche : filtre client-side sur `name` + `tags` (les items sont déjà tous chargés via `useQuery(api.library.list)`)
- Filtre catégorie : onglets horizontaux scrollables — `Tout` + une tab par catégorie présente
- Filtre tags : chips cliquables dans le header
- Combinaison : filtre catégorie ET (recherche OU tags) — logique AND entre catégorie et texte/tags, OR entre tags actifs
- État vide cohérent : illustration + message contextuel selon le filtre actif

---

## Modèle Convex (delta)

### `convex/schema.ts` — `library_items`

Ajouter deux champs optionnels :

```ts
tags:        v.optional(v.array(v.string())),
description: v.optional(v.string()),
```

### `convex/library.ts` — nouvelles mutations

```ts
// Mise à jour partielle d'un item (nom, tags, description)
export const updateItem = mutation({
  args: {
    id:          v.id("library_items"),
    name:        v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch)
  },
})
```

La mutation `list` existante doit retourner `tags` et `description` dans chaque item.

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `convex/schema.ts` | Ajouter `tags`, `description` à `library_items` |
| `convex/library.ts` | Ajouter `updateItem`, mettre à jour `list` pour retourner les nouveaux champs |
| `src/components/bibliotheque/DataView.tsx` | Refonte complète (search, tabs catégorie, tag filters, cards, preview panel) |

Nouvelle dépendance npm : `marked` (parser markdown léger, ~10 KB gzipped, zéro dépendance transitive).

---

## Ce qui n'est PAS dans ce spec

- MCP server — itération suivante
- Extraction automatique du texte (PDF → texte, utile pour le MCP)
- Semantic search / embeddings
- Partage de fichiers
- Permissions par item

---

## Critères de succès

1. Un humain peut uploader un PDF, lui mettre le tag `#brief`, et le retrouver en tapant "brief" dans la barre de recherche
2. Un PDF s'ouvre directement dans le SaaS sans téléchargement
3. Un lien Notion s'ouvre dans un nouvel onglet depuis la card
4. Hermès (futur MCP) disposera de `tags` et `description` sur chaque item pour comprendre à quoi sert chaque ressource
