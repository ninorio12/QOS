# Fluidity SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le SaaS Soren fluide en 3 axes : chargement instantané (skeleton + client-side), fade-in entre pages, et spinner+toast sur toutes les actions critiques.

**Architecture:** Convertir les Server Components lents (Devis, Conversations) en pages client-side qui affichent un skeleton immédiatement puis fetchent les données via API routes existantes. Ajouter un keyframe CSS `fadeIn` dans globals.css et l'appliquer au layout dashboard. Étendre le système toast+spinner existant à Devis et Conversations.

**Tech Stack:** Next.js 14 App Router, React hooks (useState/useEffect), CSS keyframes, hooks useToast existant (`src/hooks/useToast.ts`), Toaster existant (`src/components/shared/Toaster.tsx`)

**Modèle de référence :** `src/app/calendrier/page.tsx` (déjà converti) + `src/app/api/calendrier/route.ts`

---

## Task 1 : Fade-in CSS sur la navigation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1 : Vérifier globals.css**

Ouvrir `src/app/globals.css`. Vérifier qu'il n'y a pas déjà un `@keyframes fadeIn`.

- [ ] **Step 2 : Ajouter le keyframe**

Ajouter à la fin de `src/app/globals.css` :

```css
@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.page-fade-in {
  animation: page-fade-in 150ms ease-out;
}
```

- [ ] **Step 3 : Appliquer au layout dashboard**

Lire `src/app/dashboard/layout.tsx`. Trouver le wrapper div du contenu principal (pas le sidebar). Ajouter `className="page-fade-in"` à ce wrapper.

Si le layout ressemble à ceci :
```tsx
<div className="flex-1 overflow-hidden">
  {children}
</div>
```

Le changer en :
```tsx
<div className="flex-1 overflow-hidden page-fade-in">
  {children}
</div>
```

- [ ] **Step 4 : Tester en local**

Lancer `npm run dev` (port 3001). Naviguer entre Dashboard → Pipeline → Contacts. Vérifier le fade subtil de 150ms.

- [ ] **Step 5 : Commit**

```bash
git add src/app/globals.css src/app/dashboard/layout.tsx
git commit -m "feat(ui): 150ms fade-in on page navigation"
```

---

## Task 2 : Client-side loading — Devis

**Files:**
- Modify: `src/app/devis/page.tsx`
- Create: `src/app/devis/loading.tsx`
- Create: `src/app/api/devis/list/route.ts`

- [ ] **Step 1 : Créer le skeleton loader Devis**

Créer `src/app/devis/loading.tsx` :

```tsx
export default function DevisLoading() {
  return (
    <div className="h-full flex flex-col p-6 gap-4 animate-pulse bg-[#EEF0EB]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="h-8 w-32 bg-white rounded-xl shadow-sm" />
        <div className="h-9 w-36 bg-white rounded-xl shadow-sm" />
      </div>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB] flex flex-col gap-3">
            <div className="h-3 w-24 bg-[#E5E7EB] rounded" />
            <div className="h-6 w-32 bg-[#D9DDD6] rounded-lg" />
            <div className="h-3 w-16 bg-[#E5E7EB] rounded" />
            <div className="mt-auto h-8 w-full bg-[#E5E7EB] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Créer l'API route Devis**

Créer `src/app/api/devis/list/route.ts` :

```ts
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const [{ data: devisList }, { data: settings }] = await Promise.all([
    supabase
      .from('devis')
      .select('*, signature_statut, signature_vu_le, signature_signe_le')
      .order('created_at', { ascending: false }),
    supabase
      .from('company_settings')
      .select('brand_color')
      .single(),
  ])

  return NextResponse.json({
    devisList: devisList ?? [],
    brandColor: settings?.brand_color ?? '#d28e46',
  })
}
```

- [ ] **Step 3 : Convertir la page Devis en client-side**

Remplacer entièrement `src/app/devis/page.tsx` par :

```tsx
'use client'

import { useEffect, useState } from 'react'
import DevisView from '@/components/devis/DevisView'
import DevisLoading from './loading'

type DevisData = {
  devisList: Record<string, unknown>[]
  brandColor: string
}

export default function DevisPage() {
  const [data, setData] = useState<DevisData | null>(null)

  useEffect(() => {
    fetch('/api/devis/list')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ devisList: [], brandColor: '#d28e46' }))
  }, [])

  if (!data) return <DevisLoading />

  return <DevisView devisList={data.devisList as any} brandColor={data.brandColor} />
}
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5 : Tester en local**

Naviguer vers `localhost:3001/devis`. Le skeleton doit apparaître instantanément, puis les devis chargent.

- [ ] **Step 6 : Commit**

```bash
git add src/app/devis/page.tsx src/app/devis/loading.tsx src/app/api/devis/list/route.ts
git commit -m "perf(devis): client-side loading, instant skeleton"
```

---

## Task 3 : Client-side loading — Conversations

**Files:**
- Modify: `src/app/conversations/page.tsx`
- Create: `src/app/api/conversations/list/route.ts`

- [ ] **Step 1 : Créer l'API route Conversations**

Créer `src/app/api/conversations/list/route.ts` :

```ts
import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { getConversations, getOpportunities, getPipelines } from '@/lib/ghl'

export const dynamic = 'force-dynamic'

type Channel = 'email' | 'sms' | 'whatsapp' | 'phone' | 'meeting' | 'note'
type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned'

function mapGHLType(type: string): Channel {
  switch (type) {
    case 'TYPE_EMAIL':    return 'email'
    case 'TYPE_SMS':      return 'sms'
    case 'TYPE_WHATSAPP': return 'whatsapp'
    case 'TYPE_PHONE':    return 'phone'
    case 'TYPE_CALL':     return 'phone'
    default:              return 'note'
  }
}

function tsToISO(ts: number | null): string {
  if (!ts) return new Date().toISOString()
  return new Date(ts).toISOString()
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [ghlConvs, ghlOpps, ghlPipelines] = await Promise.all([
      getConversations(100),
      getOpportunities(100),
      getPipelines(),
    ])

    const pipelines = ghlPipelines.map(p => ({
      id: p.id, name: p.name,
      stages: p.stages.map(s => ({ id: s.id, name: s.name })),
    }))

    const contactOppMap: Record<string, { pipelineStageId: string; opportunityStatus: OpportunityStatus }> = {}
    for (const opp of ghlOpps) {
      const cid = opp.contact?.id
      if (cid && !contactOppMap[cid]) {
        contactOppMap[cid] = {
          pipelineStageId: opp.pipelineStageId,
          opportunityStatus: opp.status as OpportunityStatus,
        }
      }
    }

    const channelLabel: Record<Channel, string> = {
      email: 'Email', phone: 'Appel', sms: 'SMS', whatsapp: 'WhatsApp', meeting: 'Réunion', note: 'Note',
    }

    const conversations = ghlConvs.map(c => {
      const channel = mapGHLType(c.type)
      const contactName = c.fullName ?? c.contactName ?? c.email ?? 'Contact inconnu'
      const opp = contactOppMap[c.contactId]
      return {
        id: c.id, user_id: 'ghl', lead_id: null,
        contact_id: c.contactId, channel,
        subject: `${channelLabel[channel]} — ${contactName}`,
        summary: null,
        created_at: tsToISO(c.dateAdded),
        updated_at: tsToISO(c.dateUpdated),
        contact_name: contactName,
        contact_company: c.companyName ?? undefined,
        contact_phone: c.phone ?? null,
        last_message: undefined,
        last_message_at: tsToISO(c.lastMessageDate),
        unread: c.unreadCount ?? 0,
        assigned_to: c.assignedTo ?? null,
        pipeline_stage_id: opp?.pipelineStageId ?? null,
        opportunity_status: opp?.opportunityStatus ?? null,
        ai_enabled: true,
        source: null,
      }
    })

    return NextResponse.json({ conversations, pipelines })
  } catch (err) {
    console.error('[Conversations API]', err)
    return NextResponse.json({ conversations: [], pipelines: [] })
  }
}
```

- [ ] **Step 2 : Convertir la page Conversations en client-side**

Remplacer entièrement `src/app/conversations/page.tsx` par :

```tsx
'use client'

import { useEffect, useState } from 'react'
import ConversationsView from '@/components/conversations/ConversationsView'
import ConversationsLoading from './loading'
import type { Conversation, Pipeline } from '@/components/conversations/types'

type ConvData = { conversations: Conversation[]; pipelines: Pipeline[] }

export default function ConversationsPage() {
  const [data, setData] = useState<ConvData | null>(null)

  useEffect(() => {
    fetch('/api/conversations/list')
      .then(r => r.json())
      .then((d: ConvData) => setData(d))
      .catch(() => setData({ conversations: [], pipelines: [] }))
  }, [])

  if (!data) return <ConversationsLoading />

  return <ConversationsView dbConversations={data.conversations} pipelines={data.pipelines} />
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Tester en local**

Naviguer vers `localhost:3001/conversations`. Skeleton instantané, conversations chargent.

- [ ] **Step 5 : Commit**

```bash
git add src/app/conversations/page.tsx src/app/api/conversations/list/route.ts
git commit -m "perf(conversations): client-side loading, instant skeleton"
```

---

## Task 4 : Client-side loading — Dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/api/dashboard/route.ts`

- [ ] **Step 1 : Vérifier l'API route dashboard**

Lire `src/app/api/dashboard/route.ts`. Vérifier qu'elle retourne `metrics`, `funnel`, `recentOpps`, `weeklyBreakdown`, `monthlyPipeline`. Si ce n'est pas le cas, ajouter les champs manquants.

- [ ] **Step 2 : Convertir la page Dashboard en client-side**

Remplacer entièrement `src/app/dashboard/page.tsx` par :

```tsx
'use client'

import { useEffect, useState } from 'react'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardLoading from './loading'
import type { WeeklyDay, MonthlyPoint } from '@/lib/dashboard'

type DashData = {
  metrics: { activeDeals: number; pipelineValue: number; wonDeals: number; totalDeals: number }
  funnel: Array<{ label: string; count: number; value: number; color: string; pct: number }>
  recentOpps: Array<{ id: string; contactName: string; value: number; stage: string; tag: string; date: string; color: string; textColor: string }>
  weeklyBreakdown: WeeklyDay[]
  monthlyPipeline: MonthlyPoint[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (!data) return <DashboardLoading />

  return (
    <div className="h-full flex flex-col p-5 overflow-hidden">
      <DashboardClient
        activeLeads={data.metrics.activeDeals}
        pipelineValue={data.metrics.pipelineValue}
        wonLeads={data.metrics.wonDeals}
        totalLeads={data.metrics.totalDeals}
        stageBreakdown={data.funnel}
        recentOpps={data.recentOpps}
        weeklyBreakdown={data.weeklyBreakdown}
        monthlyPipeline={data.monthlyPipeline}
      />
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier l'API dashboard retourne le bon format**

Lire `src/app/api/dashboard/route.ts`. S'assurer que la réponse JSON contient `metrics`, `funnel`, `recentOpps`, `weeklyBreakdown`, `monthlyPipeline` — le même format que ce que `getDashboardData()` retournait.

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5 : Tester en local**

Naviguer vers `localhost:3001/dashboard`. Skeleton instantané, métriques chargent.

- [ ] **Step 6 : Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "perf(dashboard): client-side loading, instant skeleton"
```

---

## Task 5 : Spinner inline + Toast sur Devis

**Files:**
- Modify: `src/components/devis/DevisView.tsx`

- [ ] **Step 1 : Localiser les actions critiques dans DevisView**

Lire `src/components/devis/DevisView.tsx`. Identifier les fonctions qui font des appels API :
- Création d'un devis
- Suppression d'un devis
- Envoi d'un devis

- [ ] **Step 2 : Ajouter useToast au composant**

En haut du composant principal, ajouter :

```tsx
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

// Dans le composant :
const { toasts, toast, dismiss } = useToast()
```

Ajouter `<Toaster toasts={toasts} dismiss={dismiss} />` au début du JSX retourné.

- [ ] **Step 3 : Wrapper chaque action avec spinner + toast**

Pour chaque bouton d'action critique, appliquer ce pattern :

```tsx
// State par action
const [saving, setSaving] = useState(false)

// Handler
async function handleCreate() {
  setSaving(true)
  try {
    const res = await fetch('/api/devis', { method: 'POST', ... })
    if (!res.ok) throw new Error('Erreur serveur')
    toast('Devis créé', 'success')
    // refresh data
  } catch {
    toast('Erreur lors de la création', 'error')
  } finally {
    setSaving(false)
  }
}

// Bouton
<button onClick={handleCreate} disabled={saving}>
  {saving ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Créer'}
</button>
```

- [ ] **Step 4 : Tester les 3 actions**

- Créer un devis → spinner pendant création → toast "Devis créé"
- Supprimer → toast "Devis supprimé"
- Erreur simulée (couper réseau) → toast rouge "Erreur"

- [ ] **Step 5 : Commit**

```bash
git add src/components/devis/DevisView.tsx
git commit -m "feat(devis): spinner + toast feedback on all actions"
```

---

## Task 6 : Spinner inline + Toast sur Conversations

**Files:**
- Modify: `src/components/conversations/MessageThread.tsx`

- [ ] **Step 1 : Localiser l'envoi de message**

Lire `src/components/conversations/MessageThread.tsx` lignes 181-199. Trouver la fonction d'envoi de message.

- [ ] **Step 2 : Ajouter useToast**

```tsx
import { useToast } from '@/hooks/useToast'
import { Toaster } from '@/components/shared/Toaster'

const { toasts, toast, dismiss } = useToast()
```

- [ ] **Step 3 : Ajouter spinner sur le bouton d'envoi**

Trouver le bouton d'envoi. Le rendre :

```tsx
<button
  onClick={handleSend}
  disabled={sending}
  className="..."
>
  {sending
    ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
    : <Send size={14} />
  }
</button>
```

- [ ] **Step 4 : Ajouter toast sur échec**

Dans le catch de la fonction d'envoi :

```tsx
} catch (err) {
  toast('Erreur lors de l\'envoi', 'error')
}
```

- [ ] **Step 5 : Tester**

Envoyer un message → spinner sur le bouton → disparaît quand envoyé. Simuler erreur → toast rouge.

- [ ] **Step 6 : Commit**

```bash
git add src/components/conversations/MessageThread.tsx
git commit -m "feat(conversations): spinner + toast on message send"
```

---

## Task 7 : Push final et vérification Vercel

- [ ] **Step 1 : Build local final**

```bash
npm run build 2>&1 | tail -10
```

Attendu : `Errors: 0 | Warnings: 0`

- [ ] **Step 2 : Push**

```bash
git push
```

- [ ] **Step 3 : Vérifier sur app.qorpoia.com**

- Dashboard → skeleton instantané ✓
- Devis → skeleton instantané ✓
- Conversations → skeleton instantané ✓
- Navigation entre pages → fade 150ms ✓
- Action sur devis → spinner + toast ✓

---

## Self-Review

**Spec coverage :**
- ✅ Client-side loading Dashboard (Task 4)
- ✅ Client-side loading Devis (Task 2)
- ✅ Client-side loading Conversations (Task 3)
- ✅ Fade-in 150ms (Task 1)
- ✅ Spinner inline + Toast Devis (Task 5)
- ✅ Spinner inline + Toast Conversations (Task 6)

**Placeholders :** Aucun TBD/TODO.

**Cohérence des types :** `WeeklyDay`, `MonthlyPoint` importés depuis `@/lib/dashboard` dans Task 4 — correspondent aux types existants. `Conversation`, `Pipeline` importés depuis `@/components/conversations/types` dans Task 3.
