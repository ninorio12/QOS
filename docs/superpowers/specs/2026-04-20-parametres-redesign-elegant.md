# Paramètres — Redesign Élégant & Minimaliste

## Goal

Affiner visuellement la page `/parametres` (CompanySettingsView.tsx) sans toucher à la logique métier. Objectif : un rendu plus propre, léger, premium — cohérent avec le reste de l'app.

## Choix retenus (brainstorming)

- **Layout** : C — Cards affinées. On garde la grille 2×2 actuelle.
- **Inputs** : B — Pill bg doux. Fond `#F5F6F3`, border invisible, `rounded-lg`.

---

## Fichier

- Modify: `src/components/settings/CompanySettingsView.tsx`

---

## Tokens de design

### Cards
| Propriété | Avant | Après |
|---|---|---|
| Shadow | `shadow-sm` | Supprimé |
| Border | Aucune | `border border-[#EAECE7]` (1px) |
| Padding | `p-3` | `p-4` |
| Gap interne | `gap-2` | `gap-3` |
| Border-radius | `rounded-2xl` | `rounded-2xl` (inchangé) |

### Inputs
| Propriété | Valeur |
|---|---|
| Background | `#F5F6F3` |
| Border | `border border-transparent` (focus: `border-[#111]/10`) |
| Border-radius | `rounded-lg` |
| Padding | `px-2.5 py-1.5` |
| Font size | `text-xs` |
| Couleur texte | `#111111` |
| Placeholder | `#C4C4C4` |

### Labels de champ
| Propriété | Valeur |
|---|---|
| Font size | `text-[8px]` |
| Casse | `uppercase` |
| Couleur | `#9CA3AF` |
| Letter-spacing | `tracking-widest` |
| Margin bottom | `mb-1` |

### Titres de section (ex: "Identité & Logo")
| Propriété | Valeur |
|---|---|
| Font size | `text-[8px]` |
| Casse | `uppercase` |
| Couleur | `#9CA3AF` |
| Font weight | `font-semibold` |
| Letter-spacing | `tracking-widest` |

### Header de page
| Propriété | Valeur |
|---|---|
| Titre | `text-lg font-black text-[#111111]` |
| Sous-titre | `text-[10px] text-[#9CA3AF]` |
| Bouton save (dirty) | `bg-[#E2FF8D] text-[#111111]`, `text-xs px-4 py-1.5 rounded-xl font-semibold` |
| Bouton save (clean) | `bg-transparent text-[#C8CCC6] cursor-default` |

---

## Layout (inchangé)

```
┌──────────────────────────────────────────┐
│  Titre + bouton Sauvegarder               │  flex-shrink-0
├──────────────────────────────────────────┤
│  Identité & Logo  │  Profil utilisateur   │  flex-1 min-h-0
├──────────────────────────────────────────┤
│  Coordonnées      │  Informations légales │  flex-1 min-h-0
└──────────────────────────────────────────┘
```

Conteneur : `flex flex-col h-full overflow-hidden p-3 gap-2.5`

---

## Comportement inchangé

- Sauvegarde PATCH `/api/settings/company` + localStorage `soren_compte`
- `dirty` flag active le bouton Sauvegarder
- `beforeunload` si modifications non sauvegardées
- Color picker flottant (`fixed z-[9999]`)
- SvgDropZone drag & drop
- Photo de profil via `soren_profile_photo` localStorage
