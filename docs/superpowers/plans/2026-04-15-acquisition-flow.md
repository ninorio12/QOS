# Acquisition Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le flow complet acquisition client — formulaire public → GHL contact → Kai WhatsApp < 60s → qualification → RDV calendrier.

**Architecture:** Une page publique `/formulaire` capture le lead, l'API `/api/leads/capture` crée le contact dans GHL + Supabase et trigger Kai via le gateway (port 18789). Kai dispose de 3 nouveaux tools GHL pour envoyer WhatsApp, vérifier les dispos et booker les RDV.

**Tech Stack:** Next.js 14 App Router, TypeScript, GHL API v2021-07-28, Supabase service key, Gateway Express (port 18789), Anthropic Claude Sonnet 4.6

---

## Fichiers touchés

| Action | Fichier | Responsabilité |
|--------|---------|----------------|
| Modifier | `src/lib/ghl.ts` | Ajouter `createGHLContact` + `createGHLOpportunity` |
| Créer | `src/app/api/leads/capture/route.ts` | API publique — orchestration du flow |
| Créer | `src/app/formulaire/page.tsx` | Landing page publique (demo Canva) |
| Créer | `src/app/formulaire/merci/page.tsx` | Page succès après soumission |
| Modifier | `gateway/src/skills/ghl.ts` | 3 nouveaux tools : WhatsApp, slots, booking |
| Modifier | `gateway/src/index.ts` | Enregistrer les tools sur la session Kai |
| Modifier | `.agents/kai/SOUL.md` | Ajouter flow `new_lead` → WhatsApp → RDV |

---

## Task 1 : Ajouter les fonctions GHL dans `src/lib/ghl.ts`

**Files:**
- Modify: `src/lib/ghl.ts`

- [ ] **Step 1 : Ajouter `createGHLContact` à la fin de `src/lib/ghl.ts`**

```typescript
export async function createGHLContact(data: {
  firstName: string
  lastName:  string
  phone:     string
  email?:    string
}): Promise<string> {
  const res = await ghlMutate('/contacts/', 'POST', {
    firstName:  data.firstName,
    lastName:   data.lastName,
    phone:      data.phone,
    email:      data.email ?? undefined,
    locationId: env.ghlLocationId(),
    source:     'Formulaire Soren',
  }) as { contact?: { id: string } }

  const id = res.contact?.id
  if (!id) throw new Error('GHL createContact: id manquant dans la réponse')
  return id
}
```

- [ ] **Step 2 : Ajouter `createGHLOpportunity` juste après**

```typescript
export async function createGHLOpportunity(data: {
  contactId:       string
  firstName:       string
  lastName:        string
  pipelineId:      string
  pipelineStageId: string
}): Promise<string> {
  const res = await ghlMutate('/opportunities/', 'POST', {
    name:            `Devis — ${data.firstName} ${data.lastName}`,
    contactId:       data.contactId,
    pipelineId:      data.pipelineId,
    pipelineStageId: data.pipelineStageId,
    status:          'open',
    monetaryValue:   0,
  }) as { opportunity?: { id: string } }

  const id = res.opportunity?.id
  if (!id) throw new Error('GHL createOpportunity: id manquant dans la réponse')
  return id
}
```

- [ ] **Step 3 : Vérifier la compilation TypeScript**

```bash
cd C:\Users\thoma\qos
npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur sur `src/lib/ghl.ts`

- [ ] **Step 4 : Commit**

```bash
cd C:\Users\thoma\qos
git add src/lib/ghl.ts
git commit -m "feat(ghl): createGHLContact + createGHLOpportunity"
```

---

## Task 2 : API publique `POST /api/leads/capture`

**Files:**
- Create: `src/app/api/leads/capture/route.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// src/app/api/leads/capture/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { createGHLContact, createGHLOpportunity } from '@/lib/ghl'
import { env } from '@/lib/env'

// Client Supabase avec service key (bypass RLS — route système)
function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRole())
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, phone, email } = await req.json() as {
      firstName: string
      lastName:  string
      phone:     string
      email?:    string
    }

    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // ── 1. Créer contact GHL ─────────────────────────────────────────────────
    const ghlContactId = await createGHLContact({ firstName, lastName, phone, email })

    // ── 2. Créer opportunité GHL pipeline ACQUISITION ────────────────────────
    const pipelineId      = process.env.GHL_ACQUISITION_PIPELINE_ID!
    const pipelineStageId = process.env.GHL_NOUVEAU_STAGE_ID!
    await createGHLOpportunity({ contactId: ghlContactId, firstName, lastName, pipelineId, pipelineStageId })

    // ── 3. Sync Supabase — récupérer l'user admin ───────────────────────────
    const { data: users } = await supabase.auth.admin.listUsers()
    const userId = users?.users?.[0]?.id
    if (!userId) throw new Error('Aucun utilisateur admin Supabase trouvé')

    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        user_id:        userId,
        first_name:     firstName,
        last_name:      lastName,
        phone,
        email:          email ?? null,
        ghl_contact_id: ghlContactId,
      })
      .select('id')
      .single()

    if (contactErr) throw new Error(`Supabase contact: ${contactErr.message}`)

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        user_id:    userId,
        contact_id: contact.id,
        title:      `Lead formulaire — ${firstName} ${lastName}`,
        status:     'new',
        source:     'other',
      })
      .select('id')
      .single()

    if (leadErr) throw new Error(`Supabase lead: ${leadErr.message}`)

    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .insert({
        user_id:    userId,
        lead_id:    lead.id,
        contact_id: contact.id,
        channel:    'whatsapp',
        subject:    `Qualification — ${firstName} ${lastName}`,
        source:     'formulaire',
        ai_enabled: true,
      })
      .select('id')
      .single()

    if (convErr) throw new Error(`Supabase conversation: ${convErr.message}`)

    // ── 4. Trigger Kai via gateway ───────────────────────────────────────────
    const gatewayUrl = process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:18789'
    const triggerMsg = [
      'NOUVEAU_LEAD',
      `Prénom: ${firstName}`,
      `Nom: ${lastName}`,
      `Téléphone: ${phone}`,
      `Email: ${email ?? 'non renseigné'}`,
      `GHL Contact ID: ${ghlContactId}`,
      `Supabase Conv ID: ${conversation.id}`,
      'ACTION REQUISE: Contacter immédiatement via WhatsApp GHL.',
    ].join(' | ')

    try {
      await fetch(`${gatewayUrl}/sessions/kai/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: triggerMsg }),
        signal:  AbortSignal.timeout(5000),
      })
    } catch (err) {
      // Ne pas bloquer la réponse si le gateway est indisponible
      console.error('[capture] Kai trigger échoué (gateway indisponible):', err)
    }

    return NextResponse.json({ ok: true, contactId: contact.id, conversationId: conversation.id })
  } catch (err) {
    console.error('[/api/leads/capture]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 2 : Ajouter les env vars à `.env.local`**

Ouvrir `C:\Users\thoma\qos\.env.local` et ajouter à la fin :

```
# Flow acquisition
GHL_ACQUISITION_PIPELINE_ID=REMPLACER_PAR_ID_PIPELINE_ACQUISITION
GHL_NOUVEAU_STAGE_ID=REMPLACER_PAR_ID_STAGE_NOUVEAU
GATEWAY_INTERNAL_URL=http://localhost:18789
```

Pour trouver les IDs : aller dans GHL → Settings → Pipelines → ACQUISITION → inspecter l'URL ou utiliser l'API `/pipelines/?locationId=VZxWSmcMt2Hdtae8RuPs`.

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd C:\Users\thoma\qos
npx tsc --noEmit 2>&1 | head -20
```

Attendu : 0 erreur

- [ ] **Step 4 : Commit**

```bash
git add src/app/api/leads/capture/route.ts .env.local
git commit -m "feat(api): route publique /api/leads/capture — GHL + Supabase + trigger Kai"
```

---

## Task 3 : Page formulaire public `/formulaire`

**Files:**
- Create: `src/app/formulaire/page.tsx`

- [ ] **Step 1 : Créer le fichier**

```tsx
// src/app/formulaire/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FormulairePublicPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      firstName: form.get('firstName') as string,
      lastName:  form.get('lastName')  as string,
      phone:     form.get('phone')     as string,
      email:     (form.get('email') as string) || undefined,
    }

    try {
      const res = await fetch('/api/leads/capture', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erreur serveur')
      }
      router.push('/formulaire/merci?prenom=' + encodeURIComponent(body.firstName))
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#EEF0EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center">
              <span className="text-[#E2FF8D] text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-[#111] text-lg">Soren</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111] leading-tight">
            Demandez votre devis gratuit
          </h1>
          <p className="text-sm text-[#666] mt-2">
            Réponse garantie en moins de 60 secondes
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Prénom *</label>
              <input
                name="firstName"
                required
                placeholder="Jean"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm focus:outline-none focus:border-[#111] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Nom *</label>
              <input
                name="lastName"
                required
                placeholder="Dupont"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm focus:outline-none focus:border-[#111] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#444] mb-1">Téléphone *</label>
            <input
              name="phone"
              required
              type="tel"
              placeholder="+33 6 12 34 56 78"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm focus:outline-none focus:border-[#111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#444] mb-1">Email</label>
            <input
              name="email"
              type="email"
              placeholder="jean@email.com"
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm focus:outline-none focus:border-[#111] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111] text-white rounded-xl py-3 text-sm font-medium
                       hover:bg-[#222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Envoyer ma demande'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#999] mt-6">
          Vos données sont protégées et ne seront jamais revendues.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2 : Vérifier dans le navigateur**

Démarrer le serveur si pas déjà lancé :
```bash
cd C:\Users\thoma\qos && npm run dev
```

Ouvrir `http://localhost:4000/formulaire`

Attendu : page blanche avec card centrée, formulaire visible, sans sidebar Soren.

- [ ] **Step 3 : Commit**

```bash
git add src/app/formulaire/page.tsx
git commit -m "feat(formulaire): landing page publique lead capture"
```

---

## Task 4 : Page succès `/formulaire/merci`

**Files:**
- Create: `src/app/formulaire/merci/page.tsx`

- [ ] **Step 1 : Créer le fichier**

```tsx
// src/app/formulaire/merci/page.tsx
import { Suspense } from 'react'
import MerciContent from './MerciContent'

export default function MerciPage() {
  return (
    <main className="min-h-screen bg-[#EEF0EB] flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <MerciContent />
      </Suspense>
    </main>
  )
}
```

- [ ] **Step 2 : Créer le composant client `MerciContent`**

```tsx
// src/app/formulaire/merci/MerciContent.tsx
'use client'

import { useSearchParams } from 'next/navigation'

export default function MerciContent() {
  const params = useSearchParams()
  const prenom = params.get('prenom') ?? 'vous'

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 text-center">
      <div className="w-16 h-16 bg-[#E2FF8D] rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-[#111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-[#111] mb-3">
        Merci {prenom} !
      </h1>
      <p className="text-[#666] text-sm leading-relaxed">
        Votre demande a bien été reçue. Vous allez recevoir un message WhatsApp dans les prochaines secondes.
      </p>

      <div className="mt-8 p-4 bg-[#F8F8F6] rounded-2xl">
        <p className="text-xs text-[#999]">
          Si vous ne recevez pas de message dans 2 minutes, vérifiez que votre numéro est correct.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier**

Ouvrir `http://localhost:4000/formulaire/merci?prenom=Jean`

Attendu : checkmark vert, message de confirmation avec "Jean"

- [ ] **Step 4 : Commit**

```bash
git add src/app/formulaire/merci/
git commit -m "feat(formulaire): page succès /formulaire/merci"
```

---

## Task 5 : Gateway — tool `ghl_send_whatsapp`

**Files:**
- Modify: `gateway/src/skills/ghl.ts`

- [ ] **Step 1 : Ajouter la fonction `sendWhatsAppViaGHL` et le tool à la fin de `gateway/src/skills/ghl.ts`**

```typescript
// ─── WhatsApp via GHL Unified Messaging ──────────────────────

async function getOrCreateGHLConversation(ghlContactId: string): Promise<string> {
  const { baseUrl, apiKey, locationId } = config.ghl

  // Chercher conversation existante
  const searchRes = await fetch(
    `${baseUrl}/conversations/search?contactId=${ghlContactId}&locationId=${locationId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version:       '2021-07-28',
      },
    }
  )
  if (searchRes.ok) {
    const data = await searchRes.json() as { conversations?: { id: string }[] }
    const existing = data.conversations?.[0]?.id
    if (existing) return existing
  }

  // Créer une nouvelle conversation
  const createRes = await fetch(`${baseUrl}/conversations/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contactId: ghlContactId, locationId }),
  })
  if (!createRes.ok) throw new Error(`GHL createConversation: ${createRes.status}`)
  const created = await createRes.json() as { conversation?: { id: string } }
  const convId = created.conversation?.id
  if (!convId) throw new Error('GHL createConversation: id manquant')
  return convId
}

async function sendWhatsAppViaGHL(ghlContactId: string, message: string): Promise<{ ok: boolean; messageId?: string }> {
  const { baseUrl, apiKey } = config.ghl
  const conversationId = await getOrCreateGHLConversation(ghlContactId)

  const res = await fetch(`${baseUrl}/conversations/messages`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'WhatsApp', conversationId, contactId: ghlContactId, message }),
  })
  if (!res.ok) throw new Error(`GHL sendWhatsApp: ${res.status} ${await res.text()}`)
  const data = await res.json() as { messageId?: string }
  return { ok: true, messageId: data.messageId }
}

export const ghlSendWhatsAppTool = {
  name: 'ghl_send_whatsapp' as const,
  definition: {
    description: 'Envoyer un message WhatsApp à un contact via GHL. Utilise le GHL Contact ID. Message tracé dans CRM.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ghlContactId: { type: 'string', description: 'GHL Contact ID du prospect' },
        message:      { type: 'string', description: 'Message WhatsApp (max 1000 chars, pas de markdown)' },
      },
      required: ['ghlContactId', 'message'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    return sendWhatsAppViaGHL(String(input.ghlContactId), String(input.message))
  },
}
```

- [ ] **Step 2 : Vérifier TypeScript gateway**

```bash
cd C:\Users\thoma\qos\gateway
npx tsc --noEmit 2>&1 | head -20
```

Attendu : 0 erreur

- [ ] **Step 3 : Commit**

```bash
git add gateway/src/skills/ghl.ts
git commit -m "feat(gateway): tool ghl_send_whatsapp via GHL Unified Messaging"
```

---

## Task 6 : Gateway — tool `ghl_get_available_slots`

**Files:**
- Modify: `gateway/src/skills/ghl.ts`

- [ ] **Step 1 : Ajouter la fonction et le tool à la fin de `gateway/src/skills/ghl.ts`**

```typescript
// ─── Calendar — créneaux disponibles ─────────────────────────

async function getAvailableSlots(
  calendarId: string,
  startDate: string,
  endDate:   string
): Promise<{ date: string; slots: string[] }[]> {
  const { baseUrl, apiKey } = config.ghl
  const start = new Date(startDate).getTime()
  const end   = new Date(endDate).getTime()

  const res = await fetch(
    `${baseUrl}/calendars/${calendarId}/free-slots?startDate=${start}&endDate=${end}&timezone=Europe/Paris`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version:       '2021-07-28',
      },
    }
  )
  if (!res.ok) throw new Error(`GHL getAvailableSlots: ${res.status}`)
  const data = await res.json() as Record<string, { slots: string[] }>

  return Object.entries(data).map(([date, { slots }]) => ({ date, slots: slots ?? [] }))
}

export const ghlGetAvailableSlotsTool = {
  name: 'ghl_get_available_slots' as const,
  definition: {
    description: 'Récupère les créneaux disponibles dans le calendrier GHL pour proposer des RDV au prospect.',
    input_schema: {
      type: 'object' as const,
      properties: {
        calendarId: { type: 'string', description: 'ID du calendrier GHL (utiliser env GHL_DEFAULT_CALENDAR_ID si non précisé)' },
        startDate:  { type: 'string', description: 'Date début ISO (ex: 2026-04-16)' },
        endDate:    { type: 'string', description: 'Date fin ISO (ex: 2026-04-23)' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    const calId = String(input.calendarId ?? process.env.GHL_DEFAULT_CALENDAR_ID ?? '')
    if (!calId) throw new Error('calendarId requis — configure GHL_DEFAULT_CALENDAR_ID')
    return getAvailableSlots(calId, String(input.startDate), String(input.endDate))
  },
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd C:\Users\thoma\qos\gateway
npx tsc --noEmit 2>&1 | head -20
```

Attendu : 0 erreur

- [ ] **Step 3 : Commit**

```bash
git add gateway/src/skills/ghl.ts
git commit -m "feat(gateway): tool ghl_get_available_slots"
```

---

## Task 7 : Gateway — tool `ghl_book_appointment`

**Files:**
- Modify: `gateway/src/skills/ghl.ts`

- [ ] **Step 1 : Ajouter à la fin de `gateway/src/skills/ghl.ts`**

```typescript
// ─── Calendar — réserver un RDV ──────────────────────────────

async function bookAppointment(data: {
  calendarId:   string
  contactId:    string
  startTime:    string
  endTime:      string
  title:        string
  notes?:       string
}): Promise<{ ok: boolean; appointmentId: string }> {
  const { baseUrl, apiKey, locationId } = config.ghl

  const res = await fetch(`${baseUrl}/calendars/events/appointments`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendarId:        data.calendarId,
      locationId,
      contactId:         data.contactId,
      startTime:         data.startTime,
      endTime:           data.endTime,
      title:             data.title,
      appointmentStatus: 'confirmed',
      notes:             data.notes ?? '',
    }),
  })
  if (!res.ok) throw new Error(`GHL bookAppointment: ${res.status} ${await res.text()}`)
  const result = await res.json() as { id?: string }
  const id = result.id
  if (!id) throw new Error('GHL bookAppointment: id manquant')
  return { ok: true, appointmentId: id }
}

export const ghlBookAppointmentTool = {
  name: 'ghl_book_appointment' as const,
  definition: {
    description: 'Réserve un RDV dans le calendrier GHL pour un contact. Confirme automatiquement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        calendarId: { type: 'string', description: 'ID calendrier GHL (utiliser GHL_DEFAULT_CALENDAR_ID si vide)' },
        contactId:  { type: 'string', description: 'GHL Contact ID du prospect' },
        startTime:  { type: 'string', description: 'Début RDV en ISO (ex: 2026-04-18T14:00:00+02:00)' },
        endTime:    { type: 'string', description: 'Fin RDV en ISO (ex: 2026-04-18T14:30:00+02:00)' },
        title:      { type: 'string', description: 'Titre du RDV (ex: Consultation devis façade)' },
        notes:      { type: 'string', description: 'Notes optionnelles (résumé qualification)' },
      },
      required: ['contactId', 'startTime', 'endTime', 'title'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    const calId = String(input.calendarId ?? process.env.GHL_DEFAULT_CALENDAR_ID ?? '')
    if (!calId) throw new Error('calendarId requis — configure GHL_DEFAULT_CALENDAR_ID')
    return bookAppointment({
      calendarId: calId,
      contactId:  String(input.contactId),
      startTime:  String(input.startTime),
      endTime:    String(input.endTime),
      title:      String(input.title),
      notes:      input.notes ? String(input.notes) : undefined,
    })
  },
}
```

- [ ] **Step 2 : Ajouter `GHL_DEFAULT_CALENDAR_ID` dans le `.env` du gateway**

Dans `C:\Users\thoma\qos\gateway\.env` (ou le fichier d'env du gateway sur VPS), ajouter :

```
GHL_DEFAULT_CALENDAR_ID=REMPLACER_PAR_ID_CALENDRIER_GHL
```

Pour trouver l'ID : GHL → Settings → Calendars → inspecter l'URL ou `GET /calendars/?locationId=VZxWSmcMt2Hdtae8RuPs`

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd C:\Users\thoma\qos\gateway
npx tsc --noEmit 2>&1 | head -20
```

Attendu : 0 erreur

- [ ] **Step 4 : Commit**

```bash
git add gateway/src/skills/ghl.ts gateway/.env
git commit -m "feat(gateway): tool ghl_book_appointment"
```

---

## Task 8 : Enregistrer les 3 tools sur Kai dans `gateway/src/index.ts`

**Files:**
- Modify: `gateway/src/index.ts`

- [ ] **Step 1 : Ajouter les imports des nouveaux tools**

En haut de `gateway/src/index.ts`, trouver la ligne :
```typescript
import { ghlPipelineTool, ghlStaleLeadsTool, ghlUpdateStageTool } from './skills/ghl'
```

La remplacer par :
```typescript
import {
  ghlPipelineTool,
  ghlStaleLeadsTool,
  ghlUpdateStageTool,
  ghlSendWhatsAppTool,
  ghlGetAvailableSlotsTool,
  ghlBookAppointmentTool,
} from './skills/ghl'
```

- [ ] **Step 2 : Enregistrer les tools sur Kai**

Dans la boucle `for (const [name, session] of Object.entries(sessions))`, trouver la section où les tools sont enregistrés sur les sessions. Juste après les tools communs (telegram, sessions, log), ajouter les tools Kai-spécifiques UNIQUEMENT sur Kai :

```typescript
// ── Kai-only tools ─────────────────────────────────────────────────────────
sessions.kai.registerTool('ghl_send_whatsapp',       ghlSendWhatsAppTool.definition,       ghlSendWhatsAppTool.executor)
sessions.kai.registerTool('ghl_get_available_slots', ghlGetAvailableSlotsTool.definition,  ghlGetAvailableSlotsTool.executor)
sessions.kai.registerTool('ghl_book_appointment',    ghlBookAppointmentTool.definition,    ghlBookAppointmentTool.executor)
```

Placer ce bloc APRÈS la boucle for (il y a déjà un bloc `// ── Soren-only` — suivre le même pattern).

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd C:\Users\thoma\qos\gateway
npx tsc --noEmit 2>&1 | head -20
```

Attendu : 0 erreur

- [ ] **Step 4 : Commit**

```bash
git add gateway/src/index.ts
git commit -m "feat(gateway): enregistrer tools WhatsApp + slots + booking sur Kai"
```

---

## Task 9 : Mettre à jour le SOUL.md de Kai

**Files:**
- Modify: `.agents/kai/SOUL.md`

- [ ] **Step 1 : Ajouter la section `## Gestion NOUVEAU_LEAD` dans `.agents/kai/SOUL.md`**

Ajouter cette section après la section `## Flux de qualification` existante :

```markdown
## Gestion trigger NOUVEAU_LEAD

Quand tu reçois un message contenant `NOUVEAU_LEAD`, extrais les informations (Prénom, Nom, Téléphone, GHL Contact ID) et exécute ce flow **immédiatement sans attendre** :

### Étape 1 — Message WhatsApp de bienvenue (< 60 sec)

Utilise `ghl_send_whatsapp` avec le `GHL Contact ID` extrait du message.

Message template :
```
Bonjour [Prénom] ! Je suis Kai, assistant Soren.
J'ai bien reçu votre demande. Pour vous proposer la meilleure solution, quel type de travaux vous intéresse ? (façade, rénovation intérieure, toiture, autre ?)
```

### Étape 2 — Conversation qualification (max 4 questions)

Attends la réponse du prospect (elle arrivera via un nouveau message de l'orchestrateur Soren).

Questions à poser naturellement, une par une :
1. Type de travaux (si pas déjà répondu)
2. Budget approximatif ("moins de 10k€, 10-30k€, ou plus ?")
3. Délai souhaité ("vous souhaitez démarrer dans combien de temps ?")
4. Propriétaire ? ("vous êtes propriétaire du bien ?")

### Étape 3 — Score et décision

Calcule le score selon la grille (section Grille de scoring).

**Si score >= 70 (lead chaud) :**
1. Appelle `ghl_get_available_slots` avec startDate = aujourd'hui, endDate = dans 7 jours
2. Propose 2 créneaux disponibles dans ton message :
   "Super ! J'ai de la disponibilité [jour1] à [heure1] ou [jour2] à [heure2]. Lequel vous convient ?"
3. Sur confirmation du prospect → appelle `ghl_book_appointment` :
   - contactId = GHL Contact ID
   - title = "Consultation devis — [Prénom] [Nom]"
   - notes = résumé de la qualification (type travaux, budget, délai)
4. Confirme par WhatsApp : "Parfait ! RDV confirmé le [date] à [heure]. Vous recevrez un rappel la veille. À bientôt !"

**Si score < 40 (lead froid) :**
Réponds chaleureusement et conclus : "Je comprends, je garde votre contact et reviendrai vers vous au bon moment."

**Si score 40-69 (lead tiède) :**
Propose un RDV d'information sans engagement : "Que diriez-vous d'un rapide appel de 15 minutes pour explorer ensemble ?"
```

- [ ] **Step 2 : Redémarrer le gateway pour recharger le SOUL.md**

Sur le VPS (ou en local) :
```bash
# Local :
cd C:\Users\thoma\qos\gateway
npm run dev

# VPS (via PM2) :
pm2 restart gateway
```

- [ ] **Step 3 : Commit**

```bash
cd C:\Users\thoma\qos
git add .agents/kai/SOUL.md
git commit -m "feat(kai): flow NOUVEAU_LEAD — WhatsApp → qualification → RDV booking"
```

---

## Task 10 : Test end-to-end complet

**Prérequis :**
- `.env.local` rempli avec les vrais IDs GHL (pipeline + stage + calendar)
- Gateway démarré en local (`npm run dev` dans `gateway/`)
- Next.js démarré (`npm run dev` dans racine, port 4000)
- Ngrok lancé : `ngrok http --domain=septilateral-triable-shantay.ngrok-free.dev 4000`

- [ ] **Step 1 : Récupérer les IDs GHL manquants**

```bash
# Remplacer GHL_API_KEY et GHL_LOCATION_ID par tes vraies valeurs depuis .env.local

# Pipeline ACQUISITION
curl -s "https://services.leadconnectorhq.com/pipelines/?locationId=$GHL_LOCATION_ID" \
  -H "Authorization: Bearer $GHL_API_KEY" \
  -H "Version: 2021-07-28"

# Calendrier par défaut  
curl -s "https://services.leadconnectorhq.com/calendars/?locationId=$GHL_LOCATION_ID" \
  -H "Authorization: Bearer $GHL_API_KEY" \
  -H "Version: 2021-07-28"
```

Copier les IDs dans `.env.local`.

- [ ] **Step 2 : Soumettre le formulaire avec ton vrai numéro**

Ouvrir `http://localhost:4000/formulaire`

Remplir :
- Prénom : ton prénom
- Nom : ton nom
- Téléphone : ton vrai numéro WhatsApp (+336...)
- Email : ton email

Cliquer "Envoyer ma demande"

Attendu : redirect vers `/formulaire/merci`

- [ ] **Step 3 : Vérifier les logs**

Terminal Next.js : chercher `[/api/leads/capture]` — doit montrer succès sans erreur

Terminal Gateway : chercher `NOUVEAU_LEAD` — Kai doit avoir reçu le trigger

- [ ] **Step 4 : Vérifier dans Soren**

- `/contacts` → contact visible
- `/pipeline` → card dans colonne ACQUISITION
- `/conversations` → conversation ouverte canal WhatsApp

- [ ] **Step 5 : Vérifier WhatsApp**

Ton téléphone doit recevoir un WhatsApp de Kai en < 60s.

- [ ] **Step 6 : Répondre et tester la qualification**

Répondre au WhatsApp — Kai doit enchaîner les questions et finalement proposer des créneaux.

- [ ] **Step 7 : Push final**

```bash
cd C:\Users\thoma\qos
git push origin main
```

---

## Résumé des env vars à remplir

| Variable | Où | Valeur |
|----------|----|--------|
| `GHL_ACQUISITION_PIPELINE_ID` | `.env.local` | ID pipeline ACQUISITION GHL |
| `GHL_NOUVEAU_STAGE_ID` | `.env.local` | ID stage "Nouveau" dans ACQUISITION |
| `GATEWAY_INTERNAL_URL` | `.env.local` | `http://localhost:18789` (local) |
| `GHL_DEFAULT_CALENDAR_ID` | `gateway/.env` | ID calendrier GHL pour RDV |
