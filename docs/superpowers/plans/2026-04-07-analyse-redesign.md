# Analyse Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réécrire `AnalyseView.tsx` pour passer d'un style white/border au style dark-card `#2E2E2E`, en ajoutant les sections Objectifs de vente, Leads par heure, Source bars horizontales, et Donuts SVG natifs — cohérence avec le Dashboard.

**Architecture:** Réécriture complète du seul fichier `src/components/analyse/AnalyseView.tsx` (441 lignes → ~550 lignes). Le fichier `src/app/analyse/page.tsx` n'est pas touché. Toutes les données sont dérivées via `useMemo` depuis les props `opportunities` + `pipelines`. Pas de nouveaux fichiers.

**Tech Stack:** Next.js 14, React 18, TypeScript, Recharts (BarChart uniquement — PieChart supprimé), Tailwind CSS, SVG natif pour les donuts.

---

## File Map

| Fichier | Action |
|---------|--------|
| `src/components/analyse/AnalyseView.tsx` | Réécriture complète |
| `src/app/analyse/page.tsx` | Pas touché |

---

### Task 1: Data layer — hourlyData, sourceData, objectives

**Files:**
- Modify: `src/components/analyse/AnalyseView.tsx`

Ajouter 3 nouveaux `useMemo` dans le composant principal, après les useMemo existants. Aucun changement visuel — uniquement les données.

- [ ] **Step 1: Ajouter les 3 useMemo dans le composant principal**

Dans `AnalyseView.tsx`, après le bloc `// ── Pie: répartition par source` (ligne ~285), ajouter :

```tsx
  // ── Leads par heure ──────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
    periodOpps.forEach(o => {
      const h = new Date(o.createdAt).getHours()
      counts[h].count++
    })
    return counts
  }, [periodOpps])

  // ── Source bars ───────────────────────────────────────────────
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {}
    pipelineOpps.forEach(o => {
      const src = (o as unknown as { source?: string }).source || 'Non défini'
      counts[src] = (counts[src] || 0) + 1
    })
    const max = Math.max(...Object.values(counts), 1)
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [pipelineOpps])

  // ── Objectifs de vente ────────────────────────────────────────
  const objectives = useMemo(() => {
    const total        = pipelineOpps.length || 1
    const wonCount     = pipelineOpps.filter(o => o.status === 'won').length
    const qualifCount  = pipelineOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return n.includes('qualif') || n.includes('rdv') || n.includes('book')
    }).length
    const pipelineValue = pipelineOpps.filter(o => o.status === 'open').reduce((s, o) => s + (o.monetaryValue ?? 0), 0)
    const convRate     = Math.round((wonCount / total) * 100)
    const CA_TARGET    = 100_000
    const QUALIF_TARGET = 30
    const CONV_TARGET  = 25
    return [
      {
        label: "Chiffre d'affaires", current: fmt(pipelineValue), target: fmt(CA_TARGET),
        pct: Math.min(Math.round((pipelineValue / CA_TARGET) * 100), 100), color: '#E2FF8D',
      },
      {
        label: 'Leads qualifiés', current: String(qualifCount), target: String(QUALIF_TARGET),
        pct: Math.min(Math.round((qualifCount / QUALIF_TARGET) * 100), 100), color: '#A78BFA',
      },
      {
        label: 'Taux de conversion', current: `${convRate}%`, target: `${CONV_TARGET}%`,
        pct: Math.min(Math.round((convRate / CONV_TARGET) * 100), 100), color: '#FB923C',
      },
    ]
  }, [pipelineOpps, stageNames])
```

- [ ] **Step 2: Vérifier que TypeScript compile**

```bash
rtk tsc --noEmit
```

Expected: `TypeScript compilation completed` (0 errors).

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/analyse/AnalyseView.tsx
rtk git commit -m "feat(analyse): add hourlyData, sourceData, objectives derived data"
```

---

### Task 2: Nouveaux sous-composants dark + supprimer les anciens

**Files:**
- Modify: `src/components/analyse/AnalyseView.tsx`

Remplacer `KpiCard`, `BarTooltip`, `CustomPieTooltip`, `PieLegend`, `PieCard` par les nouveaux composants dark. Supprimer les imports Recharts `PieChart`, `Pie`, `PieTooltip`, `Cell`. Ajouter les nouveaux composants.

- [ ] **Step 1: Remplacer les imports Recharts**

Ligne 1–9 actuelle :
```tsx
'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Tooltip as PieTooltip,
} from 'recharts'
import { ArrowUpRight, TrendingUp, Users, Target, CalendarCheck, Clock, Award } from 'lucide-react'
import { type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'
```

Remplacer par :
```tsx
'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { type GHLOpportunity, type GHLPipeline } from '@/lib/ghl'
```

- [ ] **Step 2: Supprimer les anciens sous-composants**

Supprimer intégralement les fonctions : `KpiCard`, `BarTooltip`, `CustomPieTooltip`, `PieLegend`, `PieCard` (lignes ~37–148 de l'original).

- [ ] **Step 3: Ajouter le tooltip dark BarChart**

À la place, ajouter juste avant le composant principal :

```tsx
// ─── Dark tooltip ─────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] text-[#777] mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white">{payload[0].value} lead{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ─── SVG Donut ────────────────────────────────────────────────
const DONUT_PALETTE = ['#4A91A8', '#A78BFA', '#FB923C', '#EFE347', '#E2FF8D', '#EF4444']
const STATUS_COLORS: Record<string, string> = {
  open: '#3462EE', won: '#E2FF8D', lost: '#EF4444', abandoned: '#6B7280',
}

function SvgDonut({ data }: { data: { name: string; value: number; color: string; pct: number }[] }) {
  const filtered = data.filter(d => d.value > 0)
  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: 80, height: 80 }}>
        <span className="text-[10px] text-[#555]">—</span>
      </div>
    )
  }
  const R = 36; const SW = 10; const CX = 44; const CY = 44
  const circumference = 2 * Math.PI * R
  const total = filtered.reduce((s, d) => s + d.value, 0) || 1
  let offset = 0
  const slices = filtered.map(d => {
    const dash = (d.value / total) * circumference
    const gap  = circumference - dash
    const slice = { ...d, dash, gap, offset }
    offset += dash
    return slice
  })
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#3A3A3A" strokeWidth={SW} />
      {slices.map((s, i) => (
        <circle key={i} cx={CX} cy={CY} r={R} fill="none"
          stroke={s.color} strokeWidth={SW}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={circumference / 4 - s.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px` }}
        />
      ))}
      <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#fff">
        {total}
      </text>
    </svg>
  )
}
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Expected: `TypeScript compilation completed`.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/analyse/AnalyseView.tsx
rtk git commit -m "feat(analyse): replace white sub-components with dark versions, add SvgDonut"
```

---

### Task 3: Section 1 (Objectifs) + Section 2 (KPI cards) + Header

**Files:**
- Modify: `src/components/analyse/AnalyseView.tsx`

Réécrire le `return` du composant principal : wrapper, header, filtres, Section 1, Section 2.

- [ ] **Step 1: Remplacer le return JSX — début jusqu'aux KPI cards**

Remplacer depuis `return (` jusqu'à la fin du bloc `{/* ── KPIs ── */}` par :

```tsx
  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-[#EEF0EB]">
      <div className="p-5 flex flex-col gap-3 max-w-[1600px]">

        {/* ── Header + Filtres ── */}
        <div className="flex items-center justify-between gap-4 mb-1">
          <div>
            <h1 className="text-2xl font-black text-[#111111]">Analyse</h1>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Performance pipeline · données CRM</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
              {pipelineTabs.map(tab => (
                <button key={tab.id} onClick={() => setSelectedPipeline(tab.id)}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    selectedPipeline === tab.id ? 'bg-[#111] text-white font-bold' : 'text-[#6B7280] hover:text-[#111]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => setPeriodDays(p.days)}
                  className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    periodDays === p.days ? 'bg-[#111] text-white font-bold' : 'text-[#6B7280] hover:text-[#111]'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 1 : Objectifs de vente ── */}
        <div className="grid grid-cols-3 gap-3">
          {objectives.map(obj => (
            <div key={obj.label} className="bg-[#2E2E2E] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#777] uppercase tracking-wider">{obj.label}</span>
                <span className="text-[10px] font-bold" style={{ color: obj.color }}>{obj.pct}%</span>
              </div>
              <div className="h-1.5 bg-[#3A3A3A] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${obj.pct}%`, background: obj.color }} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{obj.current}</span>
                <span className="text-[11px] text-[#555]">/ {obj.target}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 2 : KPI cards ── */}
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: 'Leads entrants',    value: String(kpis.total),           sub: `sur ${periodDays}j`,          accent: '#E2FF8D' },
            { label: 'Valeur pipeline',   value: fmt(kpis.pipelineValue),       sub: 'deals ouverts',               accent: '#A78BFA' },
            { label: 'Taux conversion',   value: `${kpis.conversionRate}%`,     sub: `${kpis.wonCount} won`,        accent: '#FB923C' },
            { label: 'Durée moy.',        value: `${kpis.avgDays}j`,            sub: 'leads gagnés',                accent: '#4A91A8' },
            { label: 'Leads actifs',      value: String(kpis.activeCount),      sub: 'status open',                 accent: '#E2FF8D' },
            { label: 'Valeur moy.',       value: fmt(kpis.avgValue),            sub: 'par lead',                    accent: '#EFE347' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#2E2E2E] rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-[9px] text-[#777] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-black text-white leading-none">{kpi.value}</p>
              <p className="text-[9px] text-[#555]">{kpi.sub}</p>
            </div>
          ))}
        </div>
```

> **Note:** `kpis.avgDays`, `kpis.activeCount`, `kpis.avgValue` doivent être ajoutés au `useMemo` kpis existant. Voici le nouveau bloc `kpis` complet — remplacer le bloc actuel `// ── KPIs` (lignes ~178–198) par :

```tsx
  // ── KPIs ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total       = periodOpps.length
    const wonOpps     = pipelineOpps.filter(o => o.status === 'won')
    const wonCount    = wonOpps.length
    const activeCount = pipelineOpps.filter(o => o.status === 'open').length
    const pipelineValue = pipelineOpps.filter(o => o.status === 'open').reduce((s, o) => s + (o.monetaryValue ?? 0), 0)
    const qualifCount = periodOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return n.includes('qualif') || n.includes('rdv') || n.includes('book')
    }).length
    const rdvCount = periodOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return n.includes('rdv') || n.includes('book')
    }).length
    const h24ago = Date.now() - 24 * 3600_000
    const noResponseCount = pipelineOpps.filter(o => {
      const n = (stageNames[o.pipelineStageId] ?? '').toLowerCase()
      return o.status === 'open' && (n.includes('sans') || n.includes('réponse')) && new Date(o.updatedAt).getTime() < h24ago
    }).length
    const conversionRate = pipelineOpps.length > 0 ? Math.round((wonCount / pipelineOpps.length) * 100) : 0
    const qualifRate = total > 0 ? Math.round((qualifCount / total) * 100) : 0
    const avgDays = wonOpps.length > 0
      ? Math.round(wonOpps.reduce((s, o) => {
          const diff = new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()
          return s + diff / 86400000
        }, 0) / wonOpps.length)
      : 0
    const avgValue = pipelineOpps.length > 0
      ? Math.round(pipelineOpps.reduce((s, o) => s + (o.monetaryValue ?? 0), 0) / pipelineOpps.length)
      : 0
    return { total, pipelineValue, qualifCount, qualifRate, rdvCount, noResponseCount, wonCount, conversionRate, avgDays, activeCount, avgValue }
  }, [periodOpps, pipelineOpps, stageNames])
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Expected: `TypeScript compilation completed`.

- [ ] **Step 3: Vérifier visuellement**

Ouvrir `http://localhost:3000/analyse` — la page doit afficher le header, les 3 progress bars sombres, les 6 KPI cards sombres. Le reste de la page peut être absent ou cassé — sera corrigé dans les tâches suivantes.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/analyse/AnalyseView.tsx
rtk git commit -m "feat(analyse): section 1 objectifs + section 2 KPI dark cards"
```

---

### Task 4: Section 3 — Leads par jour + Leads par heure

**Files:**
- Modify: `src/components/analyse/AnalyseView.tsx`

Ajouter la Section 3 dans le JSX, après les KPI cards. Les deux charts sont des `BarChart` Recharts.

- [ ] **Step 1: Ajouter la Section 3 dans le return JSX**

Après la fermeture du bloc Section 2 (après `</div>` des KPI cards), ajouter :

```tsx
        {/* ── Section 3 : Leads par jour + Leads par heure ── */}
        <div className="flex gap-3">

          {/* Leads par jour */}
          <div className="flex-1 bg-[#2E2E2E] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-white">Leads par jour</span>
              <span className="text-[9px] text-[#555]">{periodDays} derniers jours</span>
            </div>
            {chartData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-28">
                <p className="text-[11px] text-[#555]">Aucun lead sur la période</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" fill="#E2FF8D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Leads par heure */}
          <div className="bg-[#2E2E2E] rounded-2xl p-4" style={{ width: 280 }}>
            <span className="text-[11px] font-bold text-white block mb-4">Leads par heure</span>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={hourlyData} barCategoryGap="20%">
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#555', fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(h: number) => [0, 6, 12, 18].includes(h) ? `${h}h` : ''}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
                        <p className="text-[10px] text-[#777] mb-0.5">{label}h</p>
                        <p className="text-sm font-bold text-white">{payload[0].value} lead{Number(payload[0].value) !== 1 ? 's' : ''}</p>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" fill="#E2FF8D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Expected: `TypeScript compilation completed`.

- [ ] **Step 3: Vérifier visuellement**

`http://localhost:3000/analyse` — Section 3 visible : deux charts barres lime sur fond sombre.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/analyse/AnalyseView.tsx
rtk git commit -m "feat(analyse): section 3 leads par jour + leads par heure charts"
```

---

### Task 5: Section 4 — Entonnoir + Source bars

**Files:**
- Modify: `src/components/analyse/AnalyseView.tsx`

Ajouter Section 4 dans le JSX. Entonnoir = barres div custom. Source = barres horizontales div.

- [ ] **Step 1: Ajouter la Section 4 dans le return JSX**

Après la fermeture du bloc Section 3, ajouter :

```tsx
        {/* ── Section 4 : Entonnoir + Source ── */}
        <div className="flex gap-3">

          {/* Entonnoir */}
          <div className="flex-1 bg-[#2E2E2E] rounded-2xl p-4">
            <span className="text-[11px] font-bold text-white block mb-4">Funnel par étape</span>
            {funnelData.length === 0 ? (
              <p className="text-[11px] text-[#555] text-center py-6">Aucun stage</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {funnelData.map(stage => (
                  <div key={stage.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                        <span className="text-[10px] text-[#999] truncate max-w-[160px]">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">{stage.count}</span>
                        {stage.value > 0 && <span className="text-[9px] text-[#555]">{fmt(stage.value)}</span>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#3A3A3A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${stage.pct}%`, background: stage.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads par source */}
          <div className="bg-[#2E2E2E] rounded-2xl p-4" style={{ width: 280 }}>
            <span className="text-[11px] font-bold text-white block mb-4">Leads par source</span>
            {sourceData.length === 0 ? (
              <p className="text-[11px] text-[#555] text-center py-6">Aucune donnée</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sourceData.map(src => (
                  <div key={src.name} className="flex items-center gap-2">
                    <span className="text-[9px] text-[#888] flex-shrink-0" style={{ width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {src.name}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#3A3A3A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#E2FF8D]" style={{ width: `${src.pct}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-white flex-shrink-0 w-5 text-right">{src.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Expected: `TypeScript compilation completed`.

- [ ] **Step 3: Vérifier visuellement**

`http://localhost:3000/analyse` — Section 4 visible : entonnoir custom + source bars horizontales.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/analyse/AnalyseView.tsx
rtk git commit -m "feat(analyse): section 4 entonnoir + source bars horizontales"
```

---

### Task 6: Section 5 (Donuts SVG) + Section 6 (Table) + nettoyage

**Files:**
- Modify: `src/components/analyse/AnalyseView.tsx`

Ajouter Sections 5 et 6, fermer le JSX, supprimer tout ancien JSX qui reste (l'ancien bloc `{/* ── Camemberts ── */}` et `{/* ── Tableau détail ── */}`), supprimer les imports lucide devenus inutilisés.

- [ ] **Step 1: Ajouter les sections 5 et 6, fermer le JSX**

Après la fermeture du bloc Section 4, ajouter :

```tsx
        {/* ── Section 5 : Donuts ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { title: 'Par statut',   data: statusPieData },
            { title: 'Par pipeline', data: pipelinePieData.map((d, i) => ({ ...d, color: DONUT_PALETTE[i % DONUT_PALETTE.length] })) },
            { title: 'Par source',   data: sourcePieData.map((d, i) => ({ ...d, pct: d.pct, value: d.count, color: DONUT_PALETTE[i % DONUT_PALETTE.length] })) },
          ].map(card => (
            <div key={card.title} className="bg-[#2E2E2E] rounded-2xl p-4">
              <span className="text-[11px] font-bold text-white block mb-4">{card.title}</span>
              <div className="flex items-center gap-3">
                <SvgDonut data={card.data} />
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {card.data.filter(d => d.value > 0).map(d => (
                    <div key={d.name} className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-[9px] text-[#888] truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[9px] font-bold text-white">{d.value}</span>
                        <span className="text-[9px] text-[#555]">{d.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 6 : Table ── */}
        <div className="bg-[#2E2E2E] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center px-4 py-2.5 border-b border-[#323232]">
            <span className="text-[8px] font-bold text-[#555] uppercase tracking-wider flex-1">Étape</span>
            <span className="text-[8px] font-bold text-[#555] uppercase tracking-wider w-32">Volume</span>
            <span className="text-[8px] font-bold text-[#555] uppercase tracking-wider w-14 text-right">Leads</span>
            <span className="text-[8px] font-bold text-[#555] uppercase tracking-wider w-20 text-right">Valeur</span>
            <span className="text-[8px] font-bold text-[#555] uppercase tracking-wider w-10 text-right">%</span>
          </div>
          {funnelData.length === 0 ? (
            <p className="text-[11px] text-[#555] text-center py-6">Aucune donnée</p>
          ) : (
            funnelData.map((stage, i) => (
              <div key={stage.id}
                className="flex items-center px-4 py-2.5 border-b border-[#323232] last:border-0"
                style={{ background: i % 2 === 1 ? '#282828' : undefined }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                  <span className="text-[10px] text-[#999] truncate">{stage.name}</span>
                </div>
                <div className="w-32 pr-3">
                  <div className="h-1 bg-[#3A3A3A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, background: stage.color }} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-white w-14 text-right">{stage.count}</span>
                <span className="text-[10px] text-[#555] w-20 text-right">{stage.value > 0 ? fmt(stage.value) : '—'}</span>
                <span className="text-[10px] font-bold w-10 text-right" style={{ color: stage.pctTotal > 30 ? '#E2FF8D' : '#fff' }}>
                  {stage.pctTotal}%
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Supprimer tout ancien JSX restant**

Vérifier que le fichier ne contient plus :
- `{/* ── Bar chart + Funnel ── */}` (ancien)
- `{/* ── Camemberts ── */}` (ancien)
- `{/* ── Tableau détail ── */}` (ancien)
- `bg-white border border-[#E5E7EB]`

Si des blocs anciens subsistent, les supprimer.

- [ ] **Step 3: Corriger les données donut**

`sourcePieData` retourne `{ name, value, color, pct }` mais on le remplace inline dans Section 5 par `sourceData` (qui a `name, count, pct`). Adapter le mapping Section 5 pour la carte "Par source" :

```tsx
{ title: 'Par source', data: sourceData.map((d, i) => ({ name: d.name, value: d.count, pct: d.pct, color: DONUT_PALETTE[i % DONUT_PALETTE.length] })) },
```

(cette ligne est déjà écrite dans l'étape 1 — vérifier qu'elle est correcte)

- [ ] **Step 4: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```

Expected: `TypeScript compilation completed` — 0 erreurs.

- [ ] **Step 5: Vérifier visuellement**

`http://localhost:3000/analyse` — page complète : 6 sections, aucun bloc blanc visible, aucune erreur console.

- [ ] **Step 6: Commit final**

```bash
rtk git add src/components/analyse/AnalyseView.tsx
rtk git commit -m "feat(analyse): section 5 donuts SVG + section 6 table dark — redesign complet"
```

---

## Self-Review

**Spec coverage :**
- ✅ Design system (dark cards #2E2E2E, lime, fond #EEF0EB) — appliqué dans toutes les sections
- ✅ Section 1 Objectifs — Task 3
- ✅ Section 2 KPI cards — Task 3
- ✅ Section 3 Leads par jour + par heure — Task 4
- ✅ Section 4 Entonnoir + Source bars horizontales — Task 5
- ✅ Section 5 Donuts SVG natifs — Task 6
- ✅ Section 6 Table alternée avec mini barre volume — Task 6
- ✅ Scroll layout `calc(100vh - 56px)` — conservé Task 3 (return)
- ✅ Guard empty `opportunities` — barres à 0%, count à 0, pas de crash (useMemo retourne valeurs par défaut)
- ✅ PieChart Recharts supprimé — Task 2
- ✅ Filtres pipeline + période conservés — Task 3 (header)
- ✅ `page.tsx` non touché — aucune modification prévue

**Placeholder scan :** Aucun TBD/TODO. Tout le code est complet.

**Type consistency :** `kpis.avgDays`, `kpis.activeCount`, `kpis.avgValue` définis dans Task 3 Step 1 (nouveau bloc kpis) et utilisés dans Task 3 Step 1 (KPI cards). Cohérent. `sourceData` défini Task 1 Step 1, utilisé Task 5 Step 1 et Task 6 Step 1. Cohérent.
