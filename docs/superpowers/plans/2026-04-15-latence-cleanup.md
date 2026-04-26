# Latence Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer les 9 sources de latence inutiles dans le SaaS : force-dynamic overuse, setInterval polling, Recharts synchrone, dead code setTimeout, et recherches sans debounce.

**Architecture:** Changements indépendants regroupés en 3 groupes : (1) server — retrait de force-dynamic + déduplication Supabase, (2) bundle — lazy-load Recharts, (3) client — BudgetView SWR, dead code, debounce, dédup fetch.

**Tech Stack:** Next.js 14 App Router, SWR 2.x, Recharts, next/dynamic, TypeScript

---

## Fichiers

| Action | Chemin |
|---|---|
| Modifier | `src/app/analyse/page.tsx` |
| Modifier | `src/app/pipeline/page.tsx` |
| Modifier | `src/app/contacts/page.tsx` |
| Modifier | `src/app/contacts/[id]/page.tsx` |
| Modifier | `src/app/workflows/page.tsx` |
| Modifier | `src/app/chatbot/page.tsx` |
| Créer | `src/lib/kai-agent-settings.ts` |
| Créer | `src/components/dashboard/WeeklyBarChart.tsx` |
| Créer | `src/components/dashboard/MonthlyAreaChart.tsx` |
| Modifier | `src/components/dashboard/DashboardClient.tsx` |
| Créer | `src/components/analyse/AnalyseCharts.tsx` |
| Modifier | `src/components/analyse/AnalyseView.tsx` |
| Modifier | `src/components/budget/BudgetView.tsx` |
| Modifier | `src/components/contacts/ContactsView.tsx` |
| Modifier | `src/components/devis/DevisView.tsx` |
| Modifier | `src/components/conversations/ConversationsView.tsx` |

---

### Task 1: Retirer force-dynamic des pages serveur

**Files:**
- Modify: `src/app/analyse/page.tsx:4`
- Modify: `src/app/pipeline/page.tsx:7`
- Modify: `src/app/contacts/page.tsx:7`
- Modify: `src/app/contacts/[id]/page.tsx:7-8`
- Modify: `src/app/workflows/page.tsx:6`
- Modify: `src/app/chatbot/page.tsx:5`

`force-dynamic` désactive tout cache statique — chaque navigation re-fetch depuis GHL. `revalidate = 300` active l'ISR : les données sont servies depuis le cache pendant 5 min, puis régénérées en arrière-plan.

- [ ] **Step 1: Modifier analyse/page.tsx**

Remplacer ligne 4 :
```ts
export const revalidate = 300
```
(Supprimer `export const dynamic = 'force-dynamic'`)

- [ ] **Step 2: Modifier pipeline/page.tsx**

Remplacer ligne 7 :
```ts
export const revalidate = 300
```
(Supprimer `export const dynamic   = 'force-dynamic'   // désactive le cache statique`)

- [ ] **Step 3: Modifier contacts/page.tsx**

Remplacer ligne 7 :
```ts
export const revalidate = 300
```

- [ ] **Step 4: Modifier contacts/[id]/page.tsx**

Remplacer lignes 7-8 (les deux exports) par :
```ts
export const revalidate = 300
```

- [ ] **Step 5: Modifier workflows/page.tsx**

Remplacer ligne 6 :
```ts
export const revalidate = 300
```

- [ ] **Step 6: Modifier chatbot/page.tsx**

Remplacer ligne 5 :
```ts
export const revalidate = 300
```

- [ ] **Step 7: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 8: Commit**

```bash
rtk git add src/app/analyse/page.tsx src/app/pipeline/page.tsx src/app/contacts/page.tsx "src/app/contacts/[id]/page.tsx" src/app/workflows/page.tsx src/app/chatbot/page.tsx
rtk git commit -m "perf: replace force-dynamic with revalidate=300 on server pages"
```

---

### Task 2: Déduplication des requêtes Supabase soul/memory (workflows + chatbot)

**Files:**
- Create: `src/lib/kai-agent-settings.ts`
- Modify: `src/app/workflows/page.tsx`
- Modify: `src/app/chatbot/page.tsx`

Les deux pages exécutent les mêmes deux requêtes Supabase (`soul_versions` + `agent_memory`). On extrait dans une fonction partagée côté serveur.

- [ ] **Step 1: Créer src/lib/kai-agent-settings.ts**

```ts
// src/lib/kai-agent-settings.ts
// Server-only — uses supabase/server
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'

export type KaiAgentSettings = {
  systemPrompt:  string
  autoResponse:  boolean
  budgetMin:     number
  activeHours:   { start: string; end: string }
}

export async function getKaiAgentSettings(): Promise<KaiAgentSettings> {
  const supabase = await createClient()

  const [{ data: soul }, { data: memories }] = await Promise.all([
    supabase
      .from('soul_versions')
      .select('content')
      .eq('agent', 'kai')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_memory')
      .select('key, value')
      .eq('agent', 'kai')
      .in('key', ['auto_response', 'budget_min', 'active_hours']),
  ])

  const settings: Record<string, unknown> = {}
  for (const m of memories ?? []) settings[m.key] = m.value

  return {
    systemPrompt: soul?.content ?? SYSTEM_PROMPT_DEFAULT,
    autoResponse: (settings.auto_response as boolean) ?? true,
    budgetMin:    (settings.budget_min as number) ?? 5000,
    activeHours:  (settings.active_hours as { start: string; end: string }) ?? { start: '08:00', end: '20:00' },
  }
}
```

- [ ] **Step 2: Mettre à jour workflows/page.tsx**

Remplacer le contenu complet par :

```ts
import { getWorkflows } from '@/lib/ghl'
import { getKaiAgentSettings } from '@/lib/kai-agent-settings'
import WorkflowsView from '@/components/workflows/WorkflowsView'

export const revalidate = 300

export default async function WorkflowsPage() {
  let workflows: Awaited<ReturnType<typeof getWorkflows>> = []
  try { workflows = await getWorkflows() } catch {}

  const kai = await getKaiAgentSettings()

  return (
    <WorkflowsView
      workflows={workflows}
      escalade={{
        initialSystemPrompt: kai.systemPrompt,
        initialAutoResponse: kai.autoResponse,
        initialBudgetMin:    kai.budgetMin,
        initialActiveHours:  kai.activeHours,
      }}
    />
  )
}
```

- [ ] **Step 3: Mettre à jour chatbot/page.tsx**

Remplacer le contenu complet par :

```ts
import { getKaiAgentSettings } from '@/lib/kai-agent-settings'
import ChatbotView from '@/components/chatbot/ChatbotView'

export const revalidate = 300

export default async function ChatbotPage() {
  const kai = await getKaiAgentSettings()

  return (
    <ChatbotView
      initialSystemPrompt={kai.systemPrompt}
      initialAutoResponse={kai.autoResponse}
      initialBudgetMin={kai.budgetMin}
      initialActiveHours={kai.activeHours}
    />
  )
}
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/kai-agent-settings.ts src/app/workflows/page.tsx src/app/chatbot/page.tsx
rtk git commit -m "perf: deduplicate Supabase soul/memory queries via getKaiAgentSettings"
```

---

### Task 3: Lazy-load Recharts dans DashboardClient

**Files:**
- Create: `src/components/dashboard/WeeklyBarChart.tsx`
- Create: `src/components/dashboard/MonthlyAreaChart.tsx`
- Modify: `src/components/dashboard/DashboardClient.tsx`

Recharts (~200KB gzip) est importé synchroniquement dans le bundle principal. On extrait les deux graphiques en composants séparés chargés dynamiquement.

- [ ] **Step 1: Créer WeeklyBarChart.tsx**

```tsx
// src/components/dashboard/WeeklyBarChart.tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { WeeklyDay } from '@/lib/dashboard'

export default function WeeklyBarChart({ data }: { data: WeeklyDay[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={2} barCategoryGap="18%" margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="day"
          axisLine={false} tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
        />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fill: '#D1D5DB', fontSize: 10 }}
          width={24}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 } as React.SVGProps<SVGRectElement>}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const FULL: Record<string, string> = {
              Lun: 'Lundi', Mar: 'Mardi', Mer: 'Mercredi', Jeu: 'Jeudi',
              Ven: 'Vendredi', Sam: 'Samedi', Dim: 'Dimanche',
            }
            return (
              <div style={{ background: '#111', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff', minWidth: 110 }}>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{label != null ? (FULL[label] ?? label) : ''}</p>
                {payload.map(p => (
                  <p key={p.dataKey as string} style={{ color: p.dataKey === 'leads' ? '#E2FF8D' : p.dataKey === 'booked' ? '#fff' : '#9CA3AF', marginBottom: 2 }}>
                    {p.name} : {p.value}
                  </p>
                ))}
              </div>
            )
          }}
        />
        <Bar dataKey="rdv"    name="RDV"    fill="#3462EE" radius={[4, 4, 0, 0]} />
        <Bar dataKey="booked" name="Signés" fill="#111111" radius={[4, 4, 0, 0]} />
        <Bar dataKey="leads"  name="Leads"  fill="#E2FF8D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Créer MonthlyAreaChart.tsx**

```tsx
// src/components/dashboard/MonthlyAreaChart.tsx
'use client'

import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { MonthlyPoint } from '@/lib/dashboard'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export default function MonthlyAreaChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="pipelineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3462EE" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#3462EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false} tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
        />
        <YAxis
          axisLine={false} tickLine={false}
          tick={{ fill: '#D1D5DB', fontSize: 10 }}
          tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`}
          width={28}
        />
        <Tooltip
          wrapperStyle={{ border: 'none', outline: 'none' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div style={{ background: '#111', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff', minWidth: 110 }}>
                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{label}</p>
                <p style={{ color: '#fff' }}>{fmt(payload[0]?.value as number ?? 0)}</p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3462EE"
          strokeWidth={2}
          fill="url(#pipelineGrad)"
          dot={{ fill: '#3462EE', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#3462EE', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Mettre à jour les imports dans DashboardClient.tsx**

Remplacer les lignes 14-16 (imports recharts directs) :
```tsx
// Supprimer :
// import {
//   BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
//   AreaChart, Area,
// } from 'recharts'

// Ajouter après l'import existant `dynamic` (ligne 6) :
const WeeklyBarChart   = dynamic(() => import('./WeeklyBarChart'),   { ssr: false })
const MonthlyAreaChart = dynamic(() => import('./MonthlyAreaChart'), { ssr: false })
```

- [ ] **Step 4: Remplacer les deux blocs de chart dans DashboardClient.tsx**

Trouver le bloc weekly chart (autour des lignes 591-628) et remplacer :
```tsx
          <div className="flex-1 min-h-0 px-2 pb-4">
            <WeeklyBarChart data={weeklyData} />
          </div>
```

Trouver le bloc monthly chart (autour des lignes 642-685) et remplacer :
```tsx
          <div className="flex-1 min-h-0 px-2 pb-4">
            <MonthlyAreaChart data={monthlyPipeline} />
          </div>
```

- [ ] **Step 5: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/dashboard/WeeklyBarChart.tsx src/components/dashboard/MonthlyAreaChart.tsx src/components/dashboard/DashboardClient.tsx
rtk git commit -m "perf: lazy-load Recharts charts in Dashboard via next/dynamic"
```

---

### Task 4: Lazy-load Recharts dans AnalyseView

**Files:**
- Create: `src/components/analyse/AnalyseCharts.tsx`
- Modify: `src/components/analyse/AnalyseView.tsx`

- [ ] **Step 1: Créer AnalyseCharts.tsx**

```tsx
// src/components/analyse/AnalyseCharts.tsx
'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type DailyPoint  = { label: string; count: number }
type HourlyPoint = { hour: number;  count: number }

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { value: unknown }[]; label?: unknown }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#fff' }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{String(label)}</p>
      <p>{String(payload[0].value)} lead{Number(payload[0].value) !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function DailyBarChart({ data }: { data: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={data} barCategoryGap="30%">
        <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" fill="#E2FF8D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HourlyBarChart({ data }: { data: HourlyPoint[] }) {
  const maxH = Math.max(...data.map(d => d.count), 1)
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <XAxis
          dataKey="hour"
          tick={{ fill: '#BBB', fontSize: 8, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(h: number) => [0, 6, 12, 18, 23].includes(h) ? `${h}h` : ''}
          interval={0}
          tickMargin={4}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 4 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-[#111] border border-[#333] rounded-xl px-3 py-2 shadow-lg">
                <p className="text-[10px] text-[#777] mb-0.5">{label}h</p>
                <p className="text-sm font-bold text-white">{payload[0].value} lead{Number(payload[0].value) !== 1 ? 's' : ''}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((h, i) => (
            <Cell key={i} fill={h.count >= maxH * 0.4 && h.count > 0 ? '#1C1C1E' : '#E5E5E0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Mettre à jour les imports dans AnalyseView.tsx**

Remplacer la ligne 4 (`import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'`) par :

```tsx
import dynamic from 'next/dynamic'

const DailyBarChart  = dynamic(() => import('./AnalyseCharts').then(m => m.DailyBarChart),  { ssr: false })
const HourlyBarChart = dynamic(() => import('./AnalyseCharts').then(m => m.HourlyBarChart), { ssr: false })
```

- [ ] **Step 3: Remplacer les utilisations inline des charts dans AnalyseView.tsx**

Trouver le bloc "Leads par jour" (autour de la ligne 403) et remplacer :
```tsx
              <DailyBarChart data={chartData} />
```

Trouver le bloc "Par heure" (autour de la ligne 416) et remplacer :
```tsx
              <HourlyBarChart data={hourlyData} />
```

Supprimer aussi la fonction `DarkTooltip` locale si elle existe dans AnalyseView.tsx (elle est maintenant dans AnalyseCharts.tsx).

- [ ] **Step 4: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/analyse/AnalyseCharts.tsx src/components/analyse/AnalyseView.tsx
rtk git commit -m "perf: lazy-load Recharts charts in AnalyseView via next/dynamic"
```

---

### Task 5: Supprimer useLiveFeed (dead code avec setTimeout)

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

`useLiveFeed` déclenche un `setTimeout` toutes les 12-22 secondes, même quand l'utilisateur est ailleurs. Il remplace avec du contenu fictif. On remplace par un état statique.

- [ ] **Step 1: Supprimer le dead code dans DashboardClient.tsx**

Supprimer les lignes 23-54 (le bloc complet) :
```tsx
// Supprimer ces lignes :
type LiveEvent = { id: number; agent: string; color: string; msg: string; time: string }
let liveId = 0
const LIVE_EVENTS: { agent: string; color: string; msg: string }[] = [
  ...
]

function useLiveFeed(max = 5) {
  ...
}
```

- [ ] **Step 2: Supprimer l'appel useLiveFeed et remplacer le render**

Trouver ligne 224 : `const liveEvents = useLiveFeed(4)` — supprimer cette ligne.

Trouver le bloc render "Live agent activity" (lignes 540-561) et remplacer par :

```tsx
          {/* Live agent activity */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="font-jakarta text-[13px] font-semibold text-[#111111]">Agents IA</p>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse inline-block" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] italic">En attente d&apos;activité…</p>
          </div>
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/dashboard/DashboardClient.tsx
rtk git commit -m "perf: remove useLiveFeed fake setTimeout activity feed"
```

---

### Task 6: BudgetView — remplacer setInterval par SWR

**Files:**
- Modify: `src/components/budget/BudgetView.tsx`

L'interval de 5 min déclenche des fetches même si la page n'est pas visible. SWR gère ça proprement avec `dedupingInterval`.

- [ ] **Step 1: Mettre à jour les imports dans BudgetView.tsx**

Remplacer ligne 3 (`import { useState, useEffect } from 'react'`) par :
```tsx
import { useState } from 'react'
import useSWR from 'swr'
```

- [ ] **Step 2: Remplacer le bloc state + useEffect + load**

Supprimer les lignes 79-101 (l'état `data`, `loading`, `error` + la fonction `load` + le `useEffect`) et les remplacer par :

```tsx
  const { data, isLoading, error, mutate } = useSWR<BudgetData>(
    `/api/budget?period=${period}`,
    (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('Erreur serveur'); return r.json() }),
    {
      revalidateOnFocus: false,
      dedupingInterval:  300_000,   // 5 min — cohérent avec l'ancien setInterval
      keepPreviousData:  true,
    }
  )

  const loading = isLoading && !data
```

- [ ] **Step 3: Mettre à jour le bouton Refresh**

Trouver le bouton qui appelait `void load(period)` (autour de la ligne 130) et remplacer :
```tsx
onClick={() => { void mutate() }}
```

- [ ] **Step 4: Mettre à jour la condition d'erreur**

Trouver la condition d'erreur (affichait `error` string) et remplacer la vérification :
```tsx
{error && (
  <p className="text-sm text-red-500 text-center py-4">Erreur lors du chargement du budget.</p>
)}
```

- [ ] **Step 5: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/budget/BudgetView.tsx
rtk git commit -m "perf: replace BudgetView setInterval with SWR dedupingInterval"
```

---

### Task 7: ContactsView — debounce la recherche

**Files:**
- Modify: `src/components/contacts/ContactsView.tsx`

Le `useMemo` de filtrage se déclenche à chaque frappe. On ajoute un état `debouncedQuery` qui se met à jour 200ms après la dernière frappe.

- [ ] **Step 1: Ajouter debouncedQuery dans ContactsView.tsx**

Après la ligne `const [query, setQuery] = useState('')` (ligne 140), ajouter :

```tsx
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])
```

- [ ] **Step 2: Utiliser debouncedQuery dans le useMemo**

Trouver ligne 199 (`if (query.trim()) {`) et remplacer par :
```tsx
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
```

Mettre à jour la dépendance du `useMemo` ligne 228 :
```tsx
  }, [contacts, debouncedQuery, filterOrigin, sortCol, sortDir, attributions])
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/contacts/ContactsView.tsx
rtk git commit -m "perf: debounce ContactsView search filter (200ms)"
```

---

### Task 8: DevisView — debounce la recherche de contact

**Files:**
- Modify: `src/components/devis/DevisView.tsx`

Sans debounce, chaque frappe déclenche un `fetch('/api/contact')` qui charge TOUS les contacts. On ajoute un debounce 300ms.

- [ ] **Step 1: Ajouter useRef pour le timeout dans NewDevisModal**

Dans la fonction `NewDevisModal` (après la ligne `const inputRef = useRef<HTMLInputElement>(null)`), ajouter :

```tsx
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- [ ] **Step 2: Modifier le useEffect de recherche**

Remplacer le `useEffect` des lignes 74-92 par :

```tsx
  useEffect(() => {
    if (!search.trim()) { setContacts([]); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      const q = search.toLowerCase()
      fetch('/api/contact')
        .then(r => r.json())
        .then(d => {
          const all: Contact[] = d.contacts ?? d.data ?? []
          setContacts(
            all.filter(c =>
              contactDisplayName(c).toLowerCase().includes(q) ||
              (c.email ?? '').toLowerCase().includes(q) ||
              (c.phone ?? '').toLowerCase().includes(q)
            ).slice(0, 6)
          )
        })
        .catch(() => setContacts([]))
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/devis/DevisView.tsx
rtk git commit -m "perf: debounce DevisView contact search (300ms)"
```

---

### Task 9: ConversationsView — éviter les background refetch doublons

**Files:**
- Modify: `src/components/conversations/ConversationsView.tsx`

Quand on switche vite entre 2 conversations, le background refresh de la conv A peut se déclencher plusieurs fois. On utilise le `prefetching` Set existant pour dédupliquer aussi ces refreshes.

- [ ] **Step 1: Modifier le useEffect de chargement des messages**

Remplacer le bloc lignes 52-75 par :

```tsx
  useEffect(() => {
    if (!selected) return

    const cached = msgCache.current.get(selected.id)
    if (cached) {
      setMessages(cached)
      // Background refresh — uniquement si pas déjà en cours
      if (!prefetching.current.has(selected.id)) {
        prefetching.current.add(selected.id)
        void fetchMessages(selected.id).then(fresh => {
          prefetching.current.delete(selected.id)
          if (fresh.length > 0) {
            msgCache.current.set(selected.id, fresh)
            setMessages(fresh)
          }
        })
      }
      return
    }

    // Pas en cache → fetch normal
    setMessages([])
    if (!prefetching.current.has(selected.id)) {
      prefetching.current.add(selected.id)
      void fetchMessages(selected.id).then(msgs => {
        prefetching.current.delete(selected.id)
        msgCache.current.set(selected.id, msgs)
        setMessages(msgs)
      })
    }
  }, [selected?.id])
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed`

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/conversations/ConversationsView.tsx
rtk git commit -m "perf: deduplicate background message refetch in ConversationsView"
```

---

## Validation finale

```bash
rtk tsc --noEmit
```
Attendu : `TypeScript compilation completed` — zéro erreur.

Vérifications manuelles :
1. Pipeline, Contacts, Analyse → navigation rapide, ISR actif
2. Dashboard → pas de setTimeout qui fire toutes les 15s (vérifier via DevTools Performance)
3. Budget → pas d'interval réseau, bouton refresh fonctionne
4. Contacts → la recherche attend 200ms après la frappe avant de filtrer
5. Devis → nouvelle conversation ne spam pas le réseau à chaque frappe
6. Conversations → switch rapide entre convs ne génère pas de requêtes doublons
