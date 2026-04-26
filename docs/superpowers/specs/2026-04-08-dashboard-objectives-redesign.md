# Dashboard Objectives Card Redesign — Design Spec

## Goal

Remplacer la carte "Objectifs de vente" actuelle (3 sous-cartes avec progress bars) par une liste épurée fond blanc, style minimaliste.

## Composant ciblé

`src/components/dashboard/DashboardClient.tsx` — section `col-span-3` en bas du grid.

## Design

### Conteneur

- `<div>` simple (pas de `<Link>`) — affichage uniquement
- `bg-white rounded-3xl shadow-sm`
- `col-span-3` dans le grid existant
- Animation : `fadeSlideUp 400ms ease-out 300ms both`

### Header

```
padding: 16px 24px 12px
border-bottom: 1px solid #F0F0EB
```

- Gauche : `"Objectifs"` — `text-[10px] font-bold uppercase tracking-[.7px] text-[#bbb]`
- Droite : `MONTH_LABEL` — `text-[10px] text-[#ccc]`

### Lignes (3)

Chaque ligne : `flex items-center gap-5 px-6 py-[18px] border-b border-[#F5F5F2] last:border-0`

| Colonne | Style | Valeur |
|---------|-------|--------|
| Nom | `w-40 text-[12px] font-medium text-[#888] flex-shrink-0` | label KPI |
| Barre | `flex-1 h-[3px] bg-[#F0F0EB] rounded-full overflow-hidden` + fill | progression |
| Valeur | `w-24 text-right text-[22px] font-black tracking-tight flex-shrink-0` | current |
| Cible | `w-14 text-right text-[10px] text-[#ccc] flex-shrink-0` | `/ target` |

### Couleurs par KPI

| KPI | Fill barre | Couleur valeur |
|-----|-----------|----------------|
| Chiffre d'affaires | `#9ab800` (lime foncé) | `#9ab800` |
| Leads qualifiés | `#111111` | `#111111` |
| Taux de conversion | `#111111` | `#111111` |

### Données

Identiques à l'implémentation actuelle — `objectives` useMemo inchangé :
- CA : `pipelineValue` vs `100 000€`
- Leads qualifiés : stage contenant "qualif" vs `30`
- Taux conversion : `wonLeads / totalLeads * 100` vs `25%`

## Ce qui ne change pas

- Le `useMemo` objectives dans DashboardClient
- Les props `wonLeads`, `totalLeads`, `pipelineValue`
- Le reste du dashboard grid

## Ce qui est supprimé

- Le `<Link href="/analyse">` wrapper
- Les 3 sous-cartes colorées (lime/dark/white)
- Les progress bars avec fond coloré
