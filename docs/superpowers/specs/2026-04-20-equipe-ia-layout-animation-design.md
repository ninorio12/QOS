# Équipe IA — Layout & Animation Design

## Problème

La page Équipe IA souffre de deux problèmes visuels :
1. **Cards coupées** : les hauteurs fixes sont trop petites, le contenu déborde et `overflow-hidden` le masque
2. **Animations lourdes** : box-shadow multicouche + translate créent des effets visuels bruyants

## Décisions

- **Layout** : Option A — tout à l'écran sans scroll, hauteurs compressées calculées
- **Animation** : Option B — scale doux 1.015 + ombre portée, 150ms ease-out

---

## Layout

### Objectif
Les 3 rangées (Soren, Kai+Mia, Alex+Leo) doivent toutes tenir dans le viewport sans scroll, sur un écran ~700px de hauteur utile (viewport - header 56px - page header ~55px = ~589px disponibles).

### Hauteurs cibles

| Rangée | Contrainte | Méthode |
|---|---|---|
| Soren | `minHeight: 128` sur inner div | auto-height |
| Row 2 (Kai + Mia) | `height: 168` sur wrapper | fixed, `h-full` sur cards |
| Row 3 (Alex + Leo) | `height: 155` sur wrapper | fixed, `h-full` sur cards |
| Gaps | `gap-2` (8px) × 4 = 32px | CSS gap |
| **Total estimé** | **~483px** | ✓ tient sur 589px dispo |

### Contenu allégé (toutes les cards)
- Description : `line-clamp-1` (1 ligne max)
- Skills : afficher 3 chips max + badge `+N` si plus de 3

### Soren card spécifique
- Avatar : `height: 120px`
- Left zone : `width: 165px`
- Padding right zone : `px-4 py-2.5`
- Titre : `text-[16px]`

---

## Animation

### Suppression
Retirer de `AgentCard` et `SorenHeroCard` :
- `shadow-[0_0_0_3px_white,0_0_0_5px_var(--accent),0_12px_32px_...]` (selected state)
- `-translate-y-0.5` (hover + selected)
- `hover:shadow-[...]` complex

### Remplacement

**Hover (toutes les cards)** :
```css
transition: transform 150ms ease-out, box-shadow 150ms ease-out, filter 150ms ease-out;
hover: brightness(1.03)
```
Aucun mouvement en hover — uniquement légère luminosité.

**Sélectionnée — AgentCard** :
```css
transform: scale(1.015);
box-shadow: 0 8px 24px rgba(0,0,0,0.18);
```

**Sélectionnée — SorenHeroCard** :
```css
transform: scale(1.01);
border: 2px solid #C8F135;
box-shadow: 0 6px 20px rgba(0,0,0,0.10);
```

---

## Fichiers à modifier

- `src/components/equipe/EquipeView.tsx` — seul fichier concerné
  - `SorenHeroCard` : hauteurs + animation
  - `AgentCard` : hauteurs + contenu + animation
  - `AgentCardInTraining` : hauteurs + contenu
  - Layout rows dans `EquipeView` : hauteurs fixes

---

## Non concerné
- `agents.ts` — aucune modification
- Logique métier (start/stop/heartbeat) — inchangée
