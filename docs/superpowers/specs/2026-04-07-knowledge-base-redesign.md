# Knowledge Base — Redesign Spec

## Objectif

Refondre le module "Base de connaissance" (`/knowledge`) pour le rendre intuitif, moderne et dans le thème de l'application. Remplacer le layout explorateur de fichiers (style VSCode) par une interface organisée par type de document avec éditeur intégré.

## Contexte

Le module actuel (`KnowledgeView.tsx`) présente :
- Un arbre de fichiers à gauche (200px), classé par chemins (`root`, `memory/`, `.agents/`)
- Un éditeur textarea brut au centre
- Un panneau d'informations à droite (220px)

Ce layout est trop développeur-centrique et ne correspond pas au thème visuel du reste de l'app.

---

## Design retenu — Option A

### Structure générale

Layout pleine hauteur `calc(100vh - 56px)`, fond `#EEF0EB`, pas de scroll de page.

```
┌─────────────────────────────────────────┐
│  Base de connaissance       [+ Nouveau] │  ← En-tête
│  Instructions et mémoire de vos agents  │
├─────────────────────────────────────────┤
│  [INSTRUCTIONS]  [MÉMOIRES]  [CONFIG]   │  ← Onglets type
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ SOUL.md  │  │HEARTBEAT │  │soren/  │ │  ← Grille cartes
│  │ Soren Kai│  │ Mia  Kai │  │SOUL.md │ │
│  └──────────┘  └──────────┘  └────────┘ │
├─────────────────────────────────────────┤
│  SOUL.md  [Soren][Kai][Mia]  [Aperçu] [Sauvegarder] │  ← Éditeur header
│                                         │
│  # SOUL — Personnalité des agents...    │  ← Textarea monospace
│  Tu es Soren, COO Digital...            │
└─────────────────────────────────────────┘
```

### En-tête de page

- Titre : **"Base de connaissance"** (`text-sm font-bold`)
- Sous-titre : "Instructions et mémoire de vos agents" (`text-[10px] text-[#9CA3AF]`)
- Bouton **"+ Nouveau"** à droite — non fonctionnel (désactivé visuellement) pour l'instant

### Onglets type

3 pills horizontaux :
- `INSTRUCTIONS` | `MÉMOIRES` | `CONFIG`
- Actif : `bg-[#111111] text-white rounded-full`
- Inactif : `bg-white border border-[#E5E7EB] text-[#9CA3AF] rounded-full`
- Taille : `text-[9px] font-bold uppercase tracking-wide px-4 py-1.5`

### Grille de cartes

- 3 colonnes, `gap-3`, `grid-cols-3`
- Chaque carte (`bg-white rounded-2xl p-4`) affiche :
  - Nom du fichier : `text-sm font-bold text-[#111111]`
  - Description courte : `text-[10px] text-[#9CA3AF]`
  - Chips agents : colorés par accent (`#4A91A8` Soren, `#1A5C38` Kai, `#E8836A` Mia)
  - Date + taille : `text-[9px] text-[#C8CBD0]`
- Carte sélectionnée : `border-[1.5px] border-[#111111]`
- Carte non sélectionnée : `border border-[#E5E7EB] hover:border-[#D0D5DD]`

### Contenu par onglet

**INSTRUCTIONS**
| Fichier | Description | Agents |
|---------|-------------|--------|
| SOUL.md | Personnalité des agents | Soren, Kai, Mia |
| HEARTBEAT.md | Cycles d'exécution | Soren, Kai, Mia |
| soren/SOUL.md | Instructions Soren détaillées | Soren |
| kai/SOUL.md | Instructions Kai détaillées | Kai |
| mia/SOUL.md | Instructions Mia détaillées | Mia |

**MÉMOIRES**
| Fichier | Description | Agents |
|---------|-------------|--------|
| MEMORY.md | Mémoire collective | Soren |
| soren.md | Mémoire Soren | Soren |
| kai.md | Mémoire Kai | Kai |
| mia.md | Mémoire Mia | Mia |

**CONFIG**
Vide pour l'instant — placeholder "Aucune configuration disponible".

### Zone éditeur

Apparaît sous la grille quand une carte est sélectionnée. Masquée par défaut (aucune carte sélectionnée).

**Header éditeur :**
- Nom du fichier (`text-[10px] font-bold text-[#111111]`)
- Chips agents (mêmes que sur la carte)
- Bouton **"Aperçu"** : `bg-[#F3F4F6] text-[#9CA3AF]` — toggle pour afficher le markdown rendu
- Bouton **"Sauvegarder"** : couleur accent du premier agent du fichier — `text-white font-bold`

**Corps éditeur :**
- Mode édition (défaut) : `<textarea>` monospace, fond `#FAFAF8`, `text-sm leading-7`, `resize-none`
- Mode aperçu (toggle) : rendu markdown simple — `#` → `font-bold text-[#111]`, `##` → bold + border-b, `-` → liste avec dots colorés accent
- Hauteur : `flex-1` pour prendre la place restante sous la grille

**Sauvegarde :**
- `localStorage` avec clé `kb_<id>` (identique à l'implémentation actuelle)
- Feedback visuel : bouton passe en `bg-[#22c55e]/20 text-[#22c55e]` pendant 2s après save

---

## Fichier modifié

- `src/components/knowledge/KnowledgeView.tsx` — réécriture complète

Le layout (`src/app/knowledge/layout.tsx`) reste inchangé — il suit déjà le pattern standard (`h-screen overflow-hidden`).

---

## Ce qui ne change pas

- Les données mock (`KB_FILES`) — même contenu, même structure
- La logique de sauvegarde localStorage
- Le routing `/knowledge`
