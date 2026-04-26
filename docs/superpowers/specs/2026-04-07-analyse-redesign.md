# Analyse Module Redesign — Design Spec

## Goal

Remplacer l'interface Analyse actuelle (cartes blanches, charts Recharts génériques) par un dashboard analytique dark-card cohérent avec le style GHL, tout en conservant le fond `#EEF0EB` et les données GHL existantes.

## Design System

| Token | Valeur |
|-------|--------|
| Page background | `#EEF0EB` |
| Card background | `#2E2E2E` |
| Card alt row | `#282828` |
| Separator | `#323232` |
| Bar bg (charts) | `#3A3A3A` |
| Accent lime | `#E2FF8D` |
| Accent purple | `#A78BFA` |
| Accent orange | `#FB923C` |
| Alert red | `#EF4444` |
| Text primary (dark card) | `#ffffff` |
| Text muted (dark card) | `#777` / `#666` / `#555` |
| Font weight titles | 700–900 |

Toutes les cartes : `bg-[#2E2E2E] rounded-2xl` (pas rounded-3xl — légèrement moins arrondi que le Dashboard).

## Architecture

Un seul composant `AnalyseView.tsx` (réécriture complète). Pas de sous-fichiers nouveaux. Les props restent identiques :

```tsx
type Props = {
  opportunities: GHLOpportunity[]
  pipelines:     GHLPipeline[]
  initialPipeline: string
  initialPeriod:   number
}
```

Toutes les données sont dérivées via `useMemo` depuis `opportunities` filtrées par pipeline + période.

## Filtres (header)

- Sélecteur pipeline : pills `bg-white border border-[#E5E7EB] rounded-xl` — une pill par pipeline + "Tous"
- Sélecteur période : `7j / 30j / 90j` — même style pill
- Positionnement : flex row, space-between avec le titre

## Sections (ordre d'affichage)

### Section 1 — Objectifs de vente

3 cartes `#2E2E2E` en grid-3, chacune avec :
- Label texte muted (`#777`)
- Progress bar bg `#3A3A3A`, fill coloré (lime / purple / orange)
- Valeur courante en `text-2xl font-black text-white`
- Cible en `text-xs text-[#555]`
- Pourcentage en couleur accent

Objectifs hardcodés (à paramétrer plus tard) :
- CA : `pipelineValue` vs `100 000 €` → lime `#E2FF8D`
- Leads qualifiés : count stage "Qualifié" vs `30` → purple `#A78BFA`
- Taux de conversion : `(won / total) * 100` vs `25%` → orange `#FB923C`

### Section 2 — KPI Cards

6 cartes `#2E2E2E` en grid-6 :

| KPI | Calcul |
|-----|--------|
| Total leads | `filtered.length` |
| Valeur pipeline | `sum(monetaryValue)` |
| Taux conversion | `(won / total) * 100` |
| Durée moy. | `avg((updatedAt - createdAt) en jours)` pour leads won |
| Leads actifs | `filtered.filter(s => s.status === 'open').length` |
| Valeur moy. | `pipelineValue / total` |

Chaque carte : label muted, valeur `text-2xl font-black`, trend optionnel en `#E2FF8D` ou `#EF4444`.

### Section 3 — Charts côte à côte

**Leads par jour** (gauche, flex-1) :
- `BarChart` Recharts — barres `#E2FF8D`, radius top `[4,4,0,0]`
- X axis : jours (`Lun`, `Mar`…), Y axis masqué
- Tooltip custom dark : bg `#1a1a1a`, border `#333`, texte blanc
- Données : group `filtered` by `createdAt.toLocaleDateString()` → count par jour sur la période

**Leads par heure** (droite, `w-[280px]`) :
- `BarChart` Recharts — barres `#E2FF8D` plus fines, 24 colonnes (0h–23h)
- Labels X : `0h`, `6h`, `12h`, `18h` uniquement (les autres masqués)
- Données : group `filtered` by `new Date(createdAt).getHours()` → count par heure

### Section 4 — Entonnoir + Source

**Entonnoir** (gauche, flex-1) :
- Pas de lib externe — barres SVG/div custom
- Chaque étape : label muted + count blanc + barre `#3A3A3A` fill coloré (couleur du stage)
- Largeur de barre proportionnelle à `count / maxCount * 100%`
- Hauteur barre : `6px`, radius `3px`
- Données : group `filtered` by `stageId` → count + value par stage, ordre décroissant count
- Couleur du stage : `pipeline.stages.find(s => s.id === stageId)?.color ?? '#6B7280'`

**Leads par source** (droite, `w-[260px]`) :
- Barres horizontales custom (div, pas recharts)
- Chaque ligne : label (`#888`, `w-[100px]`) + barre bg `#3A3A3A` fill `#E2FF8D` + valeur (`#fff`)
- Top 6 sources extraites depuis `opportunity.source` (ou `'Inconnu'` si null)
- Données triées par count décroissant

### Section 5 — Répartition (3 pie charts)

3 cartes en grid-3, chacune avec un donut SVG + légende :

| Chart | Groupement |
|-------|-----------|
| Par statut | `open / won / lost / abandoned` |
| Par pipeline | `pipeline.name` |
| Par source | `opportunity.source` |

Donut : SVG natif (`<circle>` avec `stroke-dasharray`), pas PieChart Recharts (plus léger).
- Rayon : 36px, stroke-width : 10px
- Couleurs fixes pour statuts : open `#E2FF8D`, won `#22c55e`, lost `#EF4444`, abandoned `#6B7280`
- Couleurs pipelines/sources : palette fixe `['#4A91A8','#A78BFA','#FB923C','#EFE347','#E2FF8D','#EF4444']`
- Légende à droite : dot + label muted + valeur blanc, gap-1.5

### Section 6 — Détail par étape (table)

Card `#2E2E2E` pleine largeur :

En-têtes (uppercase, `#555`, `text-[8px]`) :
```
ÉTAPE  |  VOLUME (mini-barre)  |  LEADS  |  VALEUR  |  %
```

Lignes alternées (`#2E2E2E` / `#282828`), séparateur `#333` :
- ÉTAPE : dot coloré (couleur stage) + nom stage
- VOLUME : barre `#3A3A3A` fill coloré, largeur = `count/maxCount * 100%`, hauteur `4px`
- LEADS : count en `font-bold text-white`
- VALEUR : `fmt(value)` muted
- % : pct en lime si > 30%, blanc sinon

Données : identiques à Section 4 (entonnoir) — mêmes stages triés.

## Scroll & Layout

- `height: calc(100vh - 56px)`, `overflow-y: auto`
- Padding : `p-5` ou `px-5 py-4`
- Gap entre sections : `mb-3` / `gap-3`
- Le composant n'a pas de header interne (le header vient du layout global)

## Données mock

Le `page.tsx` de l'Analyse est en `MOCK = true`. Le composant doit fonctionner avec des `opportunities` vides (afficher zéros et barres vides sans crash).

Guard systématique : `opportunities.length === 0` → valeurs par défaut à `0`, barres à 0%.

## Ce qui ne change pas

- Le fichier `src/app/analyse/page.tsx` : pas touché (il passe les données au composant)
- Les types `GHLOpportunity` et `GHLPipeline` de `@/lib/ghl` : pas touchés
- Le système de filtres pipeline + période : conservé, juste restyled

## Ce qui est supprimé

- `KpiCard` (ancien composant white/border)
- `PieChart` / `Pie` de Recharts (remplacé par SVG natif)
- Tous les `bg-white border border-[#E5E7EB]` dans le composant

## Imports requis

```tsx
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
// PieChart Recharts : supprimé
// SVG donut natif à la place
```
