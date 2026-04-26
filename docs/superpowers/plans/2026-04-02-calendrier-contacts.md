# Calendrier + Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter la sync de suppression de RDV (GHL↔Google Calendar), la preview de notes sur le calendrier, la fiche contact, la colonne "Origine" et l'intégration GHL complète dans le module contacts.

**Architecture:** GHL est la source de vérité pour contacts et RDV. Supabase stocke les données Soren-spécifiques (mapping calendar_event_links, attribution contact_attribution). Les pages Next.js sont server-rendered et fetchent les deux sources avant de rendre.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (SSR client), GHL REST API, Google Calendar API (googleapis), Tailwind CSS.

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/app/api/calendar-event/link/route.ts` | Créer |
| `src/app/api/calendar-event/[id]/route.ts` | Modifier (DELETE aussi supprime Google) |
| `src/app/api/webhooks/ghl/route.ts` | Créer |
| `src/components/calendrier/NewAppointmentModal.tsx` | Modifier (appel link après création) |
| `src/components/calendrier/CalendarView.tsx` | Modifier (notes preview EventPill + WeekCard) |
| `src/lib/ghl.ts` | Modifier (étendre GHLContact) |
| `src/app/api/contact/[id]/route.ts` | Créer |
| `src/app/api/contact/attribution/route.ts` | Créer |
| `src/app/contacts/[id]/page.tsx` | Créer |
| `src/components/contacts/ContactDetailPage.tsx` | Créer |
| `src/app/contacts/page.tsx` | Modifier (attribution + GHLContact direct) |
| `src/components/contacts/ContactsView.tsx` | Modifier (rows cliquables + colonne Origine) |

---

## Task 1 : Migrations Supabase

**Files:**
- Supabase SQL Editor (dashboard ou `supabase/migrations/`)

- [ ] **Step 1 : Créer la table `calendar_event_links`**

Dans le Supabase Dashboard → SQL Editor, exécuter :

```sql
create table if not exists calendar_event_links (
  id                  uuid primary key default gen_random_uuid(),
  ghl_appointment_id  text unique not null,
  google_event_id     text not null,
  created_at          timestamptz default now()
);
create index if not exists idx_calendar_event_links_ghl
  on calendar_event_links (ghl_appointment_id);
```

- [ ] **Step 2 : Créer la table `contact_attribution`**

```sql
create table if not exists contact_attribution (
  ghl_contact_id  text primary key,
  created_by      text not null,
  created_at      timestamptz default now()
);
```

- [ ] **Step 3 : Vérifier**

Dans Supabase → Table Editor, confirmer que les deux tables existent avec les bonnes colonnes.

---

## Task 2 : Endpoint POST /api/calendar-event/link

**Files:**
- Créer : `src/app/api/calendar-event/link/route.ts`

- [ ] **Step 1 : Vérifier manuellement que la table est accessible**

```bash
curl -s http://localhost:3000/api/calendar-event/link \
  -X POST -H "Content-Type: application/json" \
  -d '{}' | cat
```
Attendu : `{"error":"Missing fields"}` (400) — confirme que la route répond.

- [ ] **Step 2 : Créer le fichier**

```ts
// src/app/api/calendar-event/link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json() as { ghlId?: string; googleEventId?: string }
  const { ghlId, googleEventId } = body

  if (!ghlId || !googleEventId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('calendar_event_links')
    .upsert({ ghl_appointment_id: ghlId, google_event_id: googleEventId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3 : Vérifier**

```bash
curl -s http://localhost:3000/api/calendar-event/link \
  -X POST -H "Content-Type: application/json" \
  -d '{"ghlId":"test-ghl-123","googleEventId":"test-google-456"}' | cat
```
Attendu : `{"ok":true}`. Vérifier la ligne dans Supabase Table Editor.

- [ ] **Step 4 : Commit**

```bash
rtk git add src/app/api/calendar-event/link/route.ts && \
rtk git commit -m "feat(calendar): add calendar_event_links mapping endpoint"
```

---

## Task 3 : Sync suppression depuis Soren (DELETE /api/calendar-event/[id])

**Files:**
- Modifier : `src/app/api/calendar-event/[id]/route.ts`

- [ ] **Step 1 : Lire le fichier actuel**

```
src/app/api/calendar-event/[id]/route.ts
```
(déjà lu — contient DELETE vers GHL + PUT pour mise à jour)

- [ ] **Step 2 : Remplacer le contenu**

```ts
// src/app/api/calendar-event/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

const BASE = () => process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
const KEY  = () => process.env.GHL_API_KEY!

function ghlHeaders() {
  return {
    Authorization:  `Bearer ${KEY()}`,
    Version:        '2021-07-28',
    'Content-Type': 'application/json',
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params
  const supabase = await createClient()

  // 1. Lookup Google event ID from mapping
  const { data: link } = await supabase
    .from('calendar_event_links')
    .select('google_event_id')
    .eq('ghl_appointment_id', id)
    .single()

  // 2. Delete from Google Calendar if linked
  if (link?.google_event_id && isGoogleConfigured()) {
    try {
      const cal = getCalendarClient()
      const calId = process.env.GOOGLE_CALENDAR_ID || 'primary'
      await cal.events.delete({ calendarId: calId, eventId: link.google_event_id })
    } catch (err) {
      console.error('[calendar-event/delete] Google delete failed:', err)
      // Non-fatal: continue to delete from GHL
    }
  }

  // 3. Delete mapping row
  if (link) {
    await supabase
      .from('calendar_event_links')
      .delete()
      .eq('ghl_appointment_id', id)
  }

  // 4. Delete from GHL
  const res = await fetch(`${BASE()}/calendars/events/${id}`, {
    method:  'DELETE',
    headers: ghlHeaders(),
    cache:   'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  return NextResponse.json({ success: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params
  const { startTime, endTime } = await req.json() as {
    startTime: string
    endTime:   string
  }

  const res = await fetch(`${BASE()}/calendars/events/appointments/${id}`, {
    method:  'PUT',
    headers: ghlHeaders(),
    body:    JSON.stringify({
      startTime: new Date(startTime).toISOString(),
      endTime:   new Date(endTime).toISOString(),
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ event: data })
}
```

- [ ] **Step 3 : Vérifier manuellement**

Créer un RDV via Soren (il crée dans GHL + Google). Supprimer depuis Soren. Vérifier dans Google Calendar que l'événement a disparu.

- [ ] **Step 4 : Commit**

```bash
rtk git add src/app/api/calendar-event/[id]/route.ts && \
rtk git commit -m "feat(calendar): cascade delete to Google Calendar on GHL appointment delete"
```

---

## Task 4 : Webhook GHL pour suppressions depuis GHL

**Files:**
- Créer : `src/app/api/webhooks/ghl/route.ts`

- [ ] **Step 1 : Créer le handler**

```ts
// src/app/api/webhooks/ghl/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCalendarClient, isGoogleConfigured } from '@/lib/google'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type?: string
      appointmentId?: string
      id?: string
    }

    const eventType    = body.type ?? ''
    const appointmentId = body.appointmentId ?? body.id ?? ''

    if (eventType !== 'AppointmentDelete' || !appointmentId) {
      return NextResponse.json({ ok: true })
    }

    const supabase = await createClient()

    // Lookup Google event ID
    const { data: link } = await supabase
      .from('calendar_event_links')
      .select('google_event_id')
      .eq('ghl_appointment_id', appointmentId)
      .single()

    if (link?.google_event_id && isGoogleConfigured()) {
      try {
        const cal = getCalendarClient()
        const calId = process.env.GOOGLE_CALENDAR_ID || 'primary'
        await cal.events.delete({ calendarId: calId, eventId: link.google_event_id })
        console.log(`[ghl-webhook] Deleted Google event ${link.google_event_id}`)
      } catch (err) {
        console.error('[ghl-webhook] Google delete failed:', err)
      }
    }

    // Clean up mapping
    if (link) {
      await supabase
        .from('calendar_event_links')
        .delete()
        .eq('ghl_appointment_id', appointmentId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ghl-webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

- [ ] **Step 2 : Configurer le webhook dans GHL**

Dans GHL → Settings → Webhooks → Add Webhook :
- URL : `https://<ton-domaine>/api/webhooks/ghl`
- Events : `AppointmentDelete`

En dev local : utiliser ngrok ou Cloudflare Tunnel pour exposer localhost:3000.

- [ ] **Step 3 : Vérifier**

Simuler un payload :
```bash
curl -s http://localhost:3000/api/webhooks/ghl \
  -X POST -H "Content-Type: application/json" \
  -d '{"type":"AppointmentDelete","appointmentId":"test-ghl-123"}' | cat
```
Attendu : `{"ok":true}`. Vérifier dans Supabase que la ligne `test-ghl-123` a été supprimée de `calendar_event_links`.

- [ ] **Step 4 : Commit**

```bash
rtk git add src/app/api/webhooks/ghl/route.ts && \
rtk git commit -m "feat(calendar): GHL webhook handler for appointment deletion sync"
```

---

## Task 5 : NewAppointmentModal — stocker le lien après création

**Files:**
- Modifier : `src/components/calendrier/NewAppointmentModal.tsx`

- [ ] **Step 1 : Localiser la section `handleSave`**

Dans `NewAppointmentModal.tsx`, la fonction `handleSave` (ligne ~113) crée d'abord le RDV GHL (récupère `ghlId`), puis le RDV Google (récupère `gData.event?.id`).

- [ ] **Step 2 : Ajouter l'appel link après les deux créations**

Après la ligne `const gData = await gRes.json() ...` et avant `const cal = calendars.find(...)`, ajouter :

```ts
// Store GHL↔Google mapping
const googleEventId = gData.event?.id
if (ghlId && googleEventId) {
  fetch('/api/calendar-event/link', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ghlId, googleEventId }),
  }).catch(console.error)
}
```

- [ ] **Step 3 : Vérifier**

Créer un nouveau RDV via le modal Soren. Vérifier dans Supabase → `calendar_event_links` qu'une ligne a été insérée avec le bon `ghl_appointment_id` et `google_event_id`.

- [ ] **Step 4 : Commit**

```bash
rtk git add src/components/calendrier/NewAppointmentModal.tsx && \
rtk git commit -m "feat(calendar): store GHL↔Google event link on appointment creation"
```

---

## Task 6 : Notes preview sur le calendrier

**Files:**
- Modifier : `src/components/calendrier/CalendarView.tsx`

### Sous-tâche A — EventPill avec tooltip (vue mois)

- [ ] **Step 1 : Remplacer la fonction `EventPill` (ligne ~136)**

```tsx
function EventPill({ appt, onClick }: { appt: Appointment; onClick: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={e => { e.stopPropagation(); onClick() }}
        className="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-semibold truncate transition-all hover:brightness-95"
        style={{ background: appt.color + '22', color: appt.color, borderLeft: `2px solid ${appt.color}` }}
      >
        {fmt(appt.startTime)} {appt.title}
      </button>
      {appt.notes && (
        <div
          className="absolute left-0 bottom-full mb-1.5 z-50 w-52 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
        >
          <div className="bg-[#111111] text-white text-[10px] leading-relaxed rounded-xl px-3 py-2 whitespace-pre-line">
            {appt.notes}
          </div>
        </div>
      )}
    </div>
  )
}
```

### Sous-tâche B — WeekCard avec notes inline + tooltip (vue semaine)

- [ ] **Step 2 : Modifier `WeekCard` (ligne ~238)**

Dans le bloc JSX de `WeekCard`, après le bloc `{cardH > 52 && subtext && ...}` (ligne ~302), ajouter les notes inline :

```tsx
{/* Notes inline (si card assez haute et notes présentes) */}
{cardH > 52 && appt.notes && (
  <p
    className="text-[9px] leading-snug truncate mt-0.5"
    style={{ color: color + '88' }}
  >
    {appt.notes}
  </p>
)}
```

- [ ] **Step 3 : Ajouter le tooltip sur WeekCard**

Envelopper le `<div className="absolute inset-0 overflow-hidden group" ...>` existant dans un wrapper relatif avec tooltip. Remplacer le `return (` de `WeekCard` par :

```tsx
return (
  <div className="absolute inset-0 group/card">
    {/* Tooltip notes */}
    {appt.notes && (
      <div
        className="absolute left-full top-0 ml-2 z-50 w-52 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}
      >
        <div className="bg-[#111111] text-white text-[10px] leading-relaxed rounded-xl px-3 py-2 whitespace-pre-line">
          {appt.notes}
        </div>
      </div>
    )}
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        borderRadius:    6,
        background:      bg,
        border:          `1px solid ${color}30`,
        borderLeftWidth: 3,
        borderLeftColor: color,
        opacity:         isDragging ? 0.4 : 1,
        cursor:          isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* ... contenu existant inchangé ... */}
    </div>
  </div>
)
```

**Note :** conserver tout le contenu interne de `WeekCard` inchangé. Seule l'enveloppe externe change.

- [ ] **Step 4 : Vérifier visuellement**

Dans l'app, naviguer sur `/calendrier`. En vue mois, passer la souris sur un event avec notes → tooltip apparaît. En vue semaine, les notes apparaissent inline sur les cards hautes + tooltip au hover.

- [ ] **Step 5 : Commit**

```bash
rtk git add src/components/calendrier/CalendarView.tsx && \
rtk git commit -m "feat(calendar): show notes as tooltip on month pills and inline+tooltip on week cards"
```

---

## Task 7 : Étendre GHLContact

**Files:**
- Modifier : `src/lib/ghl.ts`

- [ ] **Step 1 : Remplacer le type `GHLContact`**

Trouver le bloc `export type GHLContact` (ligne ~54) et le remplacer par :

```ts
export type GHLContact = {
  id:               string
  contactName:      string
  firstName:        string | null
  lastName:         string | null
  email:            string | null
  phone:            string | null
  companyName:      string | null
  dateAdded:        string
  dateUpdated:      string | null
  tags:             string[]
  // Champs GHL étendus
  source:           string | null
  assignedTo:       string | null
  address1:         string | null
  city:             string | null
  state:            string | null
  postalCode:       string | null
  country:          string | null
  website:          string | null
  customFields:     { id: string; value: string | null }[]
  dnd:              boolean
  type:             string | null
}
```

- [ ] **Step 2 : Vérifier que le build compile**

```bash
rtk tsc --noEmit
```
Attendu : 0 erreurs (les champs ajoutés sont optionnels car l'API GHL peut ne pas tous les retourner — TypeScript accepte les propriétés manquantes dans les objets JSON).

- [ ] **Step 3 : Commit**

```bash
rtk git add src/lib/ghl.ts && \
rtk git commit -m "feat(contacts): extend GHLContact type with full GHL fields"
```

---

## Task 8 : Endpoint GET /api/contact/[id]

**Files:**
- Créer : `src/app/api/contact/[id]/route.ts`

- [ ] **Step 1 : Créer le fichier**

```ts
// src/app/api/contact/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const apiKey  = process.env.GHL_API_KEY!
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const { id }  = params

  const res = await fetch(`${baseUrl}/contacts/${id}`, {
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json() as { contact: unknown }
  return NextResponse.json({ contact: data.contact })
}
```

- [ ] **Step 2 : Vérifier**

```bash
curl -s http://localhost:3000/api/contact/<un-vrai-id-ghl> | cat
```
Attendu : objet JSON du contact avec tous ses champs GHL.

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/api/contact/[id]/route.ts && \
rtk git commit -m "feat(contacts): add GET /api/contact/[id] endpoint"
```

---

## Task 9 : Endpoint attribution (GET + POST)

**Files:**
- Créer : `src/app/api/contact/attribution/route.ts`

- [ ] **Step 1 : Créer le fichier**

```ts
// src/app/api/contact/attribution/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/contact/attribution?ids=id1,id2,id3
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  if (ids.length === 0) return NextResponse.json({ attributions: [] })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_attribution')
    .select('ghl_contact_id, created_by, created_at')
    .in('ghl_contact_id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attributions: data ?? [] })
}

// POST /api/contact/attribution
// Body: { ghlContactId: string, createdBy: string }
export async function POST(req: NextRequest) {
  const { ghlContactId, createdBy } = await req.json() as {
    ghlContactId?: string
    createdBy?: string
  }

  if (!ghlContactId || !createdBy) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_attribution')
    .upsert({ ghl_contact_id: ghlContactId, created_by: createdBy })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2 : Vérifier**

```bash
# Insérer une attribution test
curl -s http://localhost:3000/api/contact/attribution \
  -X POST -H "Content-Type: application/json" \
  -d '{"ghlContactId":"test-id-1","createdBy":"Mia"}' | cat

# La récupérer
curl -s "http://localhost:3000/api/contact/attribution?ids=test-id-1" | cat
```
Attendu POST : `{"ok":true}`. Attendu GET : `{"attributions":[{"ghl_contact_id":"test-id-1","created_by":"Mia",...}]}`.

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/api/contact/attribution/route.ts && \
rtk git commit -m "feat(contacts): add contact attribution GET/POST endpoint"
```

---

## Task 10 : Fiche contact — composant ContactDetailPage

**Files:**
- Créer : `src/components/contacts/ContactDetailPage.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/components/contacts/ContactDetailPage.tsx
import Link from 'next/link'
import { ChevronLeft, Mail, Phone, Building2, MapPin, Globe, User } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { getInitials, getAvatarColor } from './types'

type Attribution = { ghl_contact_id: string; created_by: string; created_at: string }

function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
      style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
    >
      {initials}
    </div>
  )
}

function Row({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide w-28 pt-0.5 flex-shrink-0">{label}</p>
      {href ? (
        <a href={href} className="text-sm text-[#3462EE] hover:underline break-all">{value}</a>
      ) : (
        <p className="text-sm text-[#111111] break-all">{value}</p>
      )}
    </div>
  )
}

function OriginBadge({ createdBy }: { createdBy: string }) {
  const BOT_COLORS: Record<string, string> = {
    Mia: '#8B5CF6', Kai: '#3462EE', Luc: '#F97316', Eva: '#EC4899',
  }
  const isBot  = createdBy !== 'Thomas' && createdBy !== 'Toi'
  const color  = isBot ? (BOT_COLORS[createdBy] ?? '#6B7280') : '#111111'
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: color + '18', color }}
    >
      {isBot ? '🤖' : '👤'} {createdBy}
    </span>
  )
}

export default function ContactDetailPage({
  contact,
  attribution,
}: {
  contact:     GHLContact
  attribution: Attribution | null
}) {
  const name    = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  const address = [contact.address1, contact.city, contact.postalCode, contact.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-[#EEF0EB] p-6">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111111] mb-6 transition-colors"
        >
          <ChevronLeft size={15} />
          Retour aux contacts
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl p-6 mb-4 flex items-start gap-4">
          <Avatar contact={contact} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-[#111111] leading-tight">{name}</h1>
            {contact.companyName && (
              <p className="text-sm text-[#6B7280] mt-0.5">{contact.companyName}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {contact.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5F0] text-[#6B7280] border border-[#E5E7EB]">
                  {t}
                </span>
              ))}
              {attribution && <OriginBadge createdBy={attribution.created_by} />}
            </div>
          </div>
        </div>

        {/* Infos card */}
        <div className="bg-white rounded-2xl px-6 py-2 mb-4">
          <Row label="Téléphone"  value={contact.phone}   href={contact.phone ? `tel:${contact.phone}` : undefined} />
          <Row label="Email"      value={contact.email}   href={contact.email ? `mailto:${contact.email}` : undefined} />
          <Row label="Entreprise" value={contact.companyName} />
          <Row label="Adresse"    value={address || null} />
          <Row label="Site web"   value={contact.website} href={contact.website ?? undefined} />
          <Row label="Source"     value={contact.source} />
          <Row label="Type"       value={contact.type} />
          <Row label="Ajouté le"  value={new Date(contact.dateAdded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </div>

        {/* Custom fields */}
        {contact.customFields && contact.customFields.length > 0 && (
          <div className="bg-white rounded-2xl px-6 py-2">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wide py-3 border-b border-[#F0F0EE]">
              Champs personnalisés
            </p>
            {contact.customFields.map(f => (
              f.value ? (
                <Row key={f.id} label={f.id} value={String(f.value)} />
              ) : null
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
rtk git add src/components/contacts/ContactDetailPage.tsx && \
rtk git commit -m "feat(contacts): add ContactDetailPage component"
```

---

## Task 11 : Page /contacts/[id]

**Files:**
- Créer : `src/app/contacts/[id]/page.tsx`

- [ ] **Step 1 : Créer le fichier**

```tsx
// src/app/contacts/[id]/page.tsx
import { notFound } from 'next/navigation'
import { type GHLContact } from '@/lib/ghl'
import ContactDetailPage from '@/components/contacts/ContactDetailPage'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

type Attribution = { ghl_contact_id: string; created_by: string; created_at: string }

async function fetchContact(id: string): Promise<GHLContact | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/contact/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json() as { contact?: GHLContact }
  return data.contact ?? null
}

async function fetchAttribution(id: string): Promise<Attribution | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/contact/attribution?ids=${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json() as { attributions?: Attribution[] }
  return data.attributions?.[0] ?? null
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  const [contact, attribution] = await Promise.all([
    fetchContact(params.id),
    fetchAttribution(params.id),
  ])

  if (!contact) notFound()

  return <ContactDetailPage contact={contact} attribution={attribution} />
}
```

- [ ] **Step 2 : Vérifier**

Naviguer sur `/contacts/<un-vrai-id-ghl>` dans le browser. La fiche doit s'afficher avec les infos du contact.

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/contacts/[id]/page.tsx && \
rtk git commit -m "feat(contacts): add /contacts/[id] detail page"
```

---

## Task 12 : ContactsView — rows cliquables + colonne Origine

**Files:**
- Modifier : `src/components/contacts/ContactsView.tsx`
- Modifier : `src/app/contacts/page.tsx`

### Sous-tâche A — Page contacts enrichie avec attribution

- [ ] **Step 1 : Modifier `src/app/contacts/page.tsx`**

```tsx
// src/app/contacts/page.tsx
import ContactsView from '@/components/contacts/ContactsView'
import { type GHLContact, getContacts } from '@/lib/ghl'

export const dynamic   = 'force-dynamic'
export const revalidate = 0

type Attribution = { ghl_contact_id: string; created_by: string; created_at: string }

async function fetchAttributions(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res  = await fetch(`${baseUrl}/api/contact/attribution?ids=${ids.join(',')}`, { cache: 'no-store' })
    if (!res.ok) return new Map()
    const data = await res.json() as { attributions?: Attribution[] }
    return new Map((data.attributions ?? []).map(a => [a.ghl_contact_id, a.created_by]))
  } catch {
    return new Map()
  }
}

export default async function ContactsPage() {
  let contacts: GHLContact[] = []
  let attributions: Map<string, string> = new Map()

  try {
    const { contacts: raw } = await getContacts(100)
    contacts = raw
    attributions = await fetchAttributions(raw.map(c => c.id))
  } catch (err) {
    console.error('[Contacts] fetch failed:', err)
  }

  return <ContactsView contacts={contacts} attributions={attributions} />
}
```

### Sous-tâche B — ContactsView avec rows cliquables et colonne Origine

- [ ] **Step 2 : Modifier `src/components/contacts/ContactsView.tsx`**

**a) Mettre à jour les imports** (ajouter `useRouter` et changer le type Contact → GHLContact) :

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Download } from 'lucide-react'
import { type GHLContact } from '@/lib/ghl'
import { getInitials, getAvatarColor, formatDate, formatRelative } from './types'
import NewContactModal from './NewContactModal'
import ImportModal from './ImportModal'
```

**b) Remplacer la function `Avatar`** (adapter pour GHLContact) :

```tsx
function Avatar({ contact }: { contact: GHLContact }) {
  const name     = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
  const initials = (name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
  const color    = getAvatarColor(initials)
  const isDark   = color === '#C8F135' || color === '#EFE347'
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{ background: color, color: isDark ? '#111111' : '#ffffff' }}
    >
      {initials}
    </div>
  )
}
```

**c) Ajouter le composant `OriginBadge`** après `TagPill` :

```tsx
const BOT_COLORS: Record<string, string> = {
  Mia: '#8B5CF6', Kai: '#3462EE', Luc: '#F97316', Eva: '#EC4899',
}

function OriginBadge({ createdBy }: { createdBy: string | undefined }) {
  if (!createdBy) return <span className="text-sm text-[#D1D5DB]">—</span>
  const isBot = createdBy !== 'Thomas' && createdBy !== 'Toi'
  const color = isBot ? (BOT_COLORS[createdBy] ?? '#6B7280') : '#111111'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: color + '18', color }}
    >
      {isBot ? '🤖 ' : ''}{createdBy}
    </span>
  )
}
```

**d) Remplacer `ContactRow`** — cliquable + colonne Origine :

```tsx
function ContactRow({
  contact,
  checked,
  onCheck,
  createdBy,
  onClick,
}: {
  contact:   GHLContact
  checked:   boolean
  onCheck:   (id: string) => void
  createdBy: string | undefined
  onClick:   () => void
}) {
  const name = contact.contactName || `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || '—'
  return (
    <tr
      className="border-b border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors group cursor-pointer"
      onClick={onClick}
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-10" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck(contact.id)}
          className="w-4 h-4 rounded border-[#D1D5DB] accent-[#111111] cursor-pointer"
        />
      </td>

      {/* Nom */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          <Avatar contact={contact} />
          <span className="text-sm font-semibold text-[#111111] truncate">{name}</span>
        </div>
      </td>

      {/* Téléphone */}
      <td className="px-4 py-3 min-w-[140px]">
        {contact.phone
          ? <span className="text-sm text-[#374151]">{contact.phone}</span>
          : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>

      {/* E-mail */}
      <td className="px-4 py-3 min-w-[200px]">
        {contact.email
          ? <span className="text-sm text-[#374151]">{contact.email}</span>
          : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>

      {/* Entreprise */}
      <td className="px-4 py-3 min-w-[160px]">
        {contact.companyName
          ? <span className="text-sm text-[#374151] truncate">{contact.companyName}</span>
          : <span className="text-sm text-[#D1D5DB]">—</span>}
      </td>

      {/* Origine */}
      <td className="px-4 py-3 min-w-[120px]">
        <OriginBadge createdBy={createdBy} />
      </td>

      {/* Créé */}
      <td className="px-4 py-3 min-w-[130px]">
        <span className="text-sm text-[#6B7280]">{formatDate(contact.dateAdded)}</span>
      </td>

      {/* Dernière activité */}
      <td className="px-4 py-3 min-w-[150px]">
        <span className="text-sm text-[#6B7280]">{formatRelative(contact.dateUpdated ?? contact.dateAdded)}</span>
      </td>

      {/* Tags */}
      <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-1 flex-wrap">
          {contact.tags.map(t => <TagPill key={t} label={t} />)}
        </div>
      </td>
    </tr>
  )
}
```

**e) Modifier la signature de `ContactsView`** et ajouter `useRouter` + colonne header :

```tsx
export default function ContactsView({
  contacts: initial,
  attributions,
}: {
  contacts:     GHLContact[]
  attributions: Map<string, string>
}) {
  const router   = useRouter()
  const [contacts, setContacts] = useState<GHLContact[]>(initial)
  // ... reste identique (checked, query, showModal, showImport, allChecked)
```

Dans le JSX du `<table>`, ajouter le header de colonne "Origine" après "Entreprise" et avant "Créé" :

```tsx
<th className={COL_HEADER}>Origine</th>
```

Dans le mapping des rows :

```tsx
{filtered.map(contact => (
  <ContactRow
    key={contact.id}
    contact={contact}
    checked={checked.has(contact.id)}
    onCheck={toggleCheck}
    createdBy={attributions.get(contact.id)}
    onClick={() => router.push(`/contacts/${contact.id}`)}
  />
))}
```

**f) Adapter `handleAdd`** pour accepter `GHLContact` :

```tsx
function handleAdd(c: GHLContact) {
  setContacts(prev => [c, ...prev])
}
```

- [ ] **Step 3 : Vérifier**

```bash
rtk tsc --noEmit
```
Attendu : 0 erreurs. Naviguer sur `/contacts` → les rows sont cliquables → clic → `/contacts/<id>` → fiche contact. La colonne "Origine" apparaît (vide pour contacts sans attribution, badge pour ceux avec).

- [ ] **Step 4 : Commit**

```bash
rtk git add src/components/contacts/ContactsView.tsx src/app/contacts/page.tsx && \
rtk git commit -m "feat(contacts): clickable rows, Origine column, GHLContact as data source"
```

---

## Task 13 : Adapter NewContactModal pour GHLContact

**Files:**
- Modifier : `src/components/contacts/NewContactModal.tsx`

- [ ] **Step 1 : Vérifier si NewContactModal retourne un `Contact` ou `GHLContact`**

Ouvrir `src/components/contacts/NewContactModal.tsx` et chercher le type retourné dans `onCreated`. Si c'est `Contact`, adapter pour retourner `GHLContact`.

- [ ] **Step 2 : Remplacer le type dans la prop `onCreated`**

```tsx
// Trouver la interface Props et changer :
interface Props {
  onClose:   () => void
  onCreated: (contact: GHLContact) => void  // était: Contact
}
```

- [ ] **Step 3 : Adapter l'objet retourné après création**

Dans le `handleSave` ou équivalent, construire un `GHLContact` minimal :

```tsx
onCreated({
  id:           data.contact.id,
  contactName:  `${firstName} ${lastName}`.trim(),
  firstName:    firstName || null,
  lastName:     lastName  || null,
  email:        email     || null,
  phone:        phone     || null,
  companyName:  companyName || null,
  dateAdded:    data.contact.dateAdded ?? new Date().toISOString(),
  dateUpdated:  null,
  tags:         [],
  source:       null, assignedTo: null, address1: null, city: null,
  state: null, postalCode: null, country: null, website: null,
  customFields: [], dnd: false, type: null,
})
```

- [ ] **Step 4 : Vérifier**

```bash
rtk tsc --noEmit
```
Attendu : 0 erreurs.

- [ ] **Step 5 : Commit**

```bash
rtk git add src/components/contacts/NewContactModal.tsx && \
rtk git commit -m "feat(contacts): adapt NewContactModal to return GHLContact"
```

---

## Vérification finale

- [ ] `rtk tsc --noEmit` → 0 erreurs
- [ ] Créer un RDV → vérifier ligne dans `calendar_event_links`
- [ ] Supprimer ce RDV depuis Soren → vérifier que l'event Google Calendar disparaît
- [ ] Naviguer sur `/contacts` → rows cliquables, colonne Origine visible
- [ ] Clic sur un contact → `/contacts/<id>` → fiche complète
- [ ] Hover sur un event calendrier avec notes → tooltip visible
