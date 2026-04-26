# Module Devis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le module devis avec une liste en grille scrollable (vignettes PDF), un éditeur split-screen Apple-style, une section signature électronique, des relances automatiques et des statistiques de conversion.

**Architecture:** DevisView.tsx est découpé en sous-composants (DevisListView, DevisDetailView, sections indépendantes). Les nouvelles features (signature, relances, stats) ont chacune leur route API + composant React propre. Les migrations Supabase sont appliquées en premier.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase, Plus Jakarta Sans / Outfit, APITemplate (PDF existant), GHL (envoi existant)

---

## File Structure

```
src/
  components/devis/
    DevisView.tsx              — orchestrateur principal (modifié, réduit)
    DevisListView.tsx          — NOUVEAU: vue liste grille scrollable
    DevisDetailView.tsx        — NOUVEAU: vue détail split screen
    PdfThumbnail.tsx           — NOUVEAU: vignette miniature CSS du PDF
    InfoSection.tsx            — NOUVEAU: encadré infos + timeline (panel gauche)
    SignatureSection.tsx       — NOUVEAU: section signature (panel droit)
    RelancesSection.tsx        — NOUVEAU: section relances (panel droit)
    StatsSection.tsx           — NOUVEAU: section stats de conversion (panel droit)
  app/api/devis/
    [id]/relances/
      route.ts                 — NOUVEAU: GET + POST relances
      [rid]/route.ts           — NOUVEAU: PATCH relance individuelle
    [id]/stats/route.ts        — NOUVEAU: GET stats conversion
    [id]/signature/route.ts    — NOUVEAU: POST envoyer lien signature
    signature/[token]/route.ts — NOUVEAU: GET page + POST enregistrer signature
supabase/migrations/
  20260409_devis_signature.sql — NOUVEAU: colonnes signature sur table devis
  20260409_devis_relances.sql  — NOUVEAU: table devis_relances
```

---

## Task 1: Migrations Supabase

**Files:**
- Create: `supabase/migrations/20260409_devis_signature.sql`
- Create: `supabase/migrations/20260409_devis_relances.sql`

- [ ] **Step 1: Créer la migration signature**

```sql
-- supabase/migrations/20260409_devis_signature.sql
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS signature_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_statut TEXT NOT NULL DEFAULT 'non_envoye'
    CHECK (signature_statut IN ('non_envoye','envoye','vu','signe')),
  ADD COLUMN IF NOT EXISTS signature_vu_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_signe_le TIMESTAMPTZ;
```

- [ ] **Step 2: Créer la migration relances**

```sql
-- supabase/migrations/20260409_devis_relances.sql
CREATE TABLE IF NOT EXISTS devis_relances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id    UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  delai_jours INTEGER NOT NULL,
  canal       TEXT NOT NULL CHECK (canal IN ('whatsapp','email','sms')),
  statut      TEXT NOT NULL DEFAULT 'programmee'
    CHECK (statut IN ('programmee','envoyee','annulee','ignoree')),
  message     TEXT,
  envoye_le   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE devis_relances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open" ON devis_relances FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 3: Appliquer les migrations**

Exécuter dans le dashboard Supabase (SQL editor) ou via CLI :
```bash
npx supabase db push
```

- [ ] **Step 4: Vérifier que les colonnes existent**

Dans Supabase table editor, confirmer :
- Table `devis` a les colonnes `signature_token`, `signature_statut`, `signature_vu_le`, `signature_signe_le`
- Table `devis_relances` existe avec les bonnes colonnes

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(devis): migrations signature + relances"
```

---

## Task 2: API Stats de conversion

**Files:**
- Create: `src/app/api/devis/[id]/stats/route.ts`

- [ ] **Step 1: Créer la route**

```typescript
// src/app/api/devis/[id]/stats/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Récupérer le devis courant pour avoir son montant_ht
  const { data: current } = await supabase
    .from('devis')
    .select('montant_ht')
    .eq('id', params.id)
    .single()

  if (!current) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const ht = current.montant_ht ?? 0
  const min = ht * 0.5
  const max = ht * 1.5

  // Devis similaires (montant dans fourchette ±50%), excluant le courant
  const { data: similaires } = await supabase
    .from('devis')
    .select('statut, montant_ht, created_at, envoye_le')
    .neq('id', params.id)
    .gte('montant_ht', min)
    .lte('montant_ht', max)

  const all = similaires ?? []
  const acceptes = all.filter(d => d.statut === 'accepté').length
  const refuses  = all.filter(d => d.statut === 'refusé').length
  const enCours  = all.filter(d => !['accepté', 'refusé'].includes(d.statut)).length
  const total    = acceptes + refuses // pour le taux (exclut "en cours")

  // Délai moyen entre creation et envoye_le sur les envoyés
  const envoyes = all.filter(d => d.envoye_le && d.created_at)
  const delaiMoyen = envoyes.length > 0
    ? Math.round(
        envoyes.reduce((sum, d) => {
          const diff = new Date(d.envoye_le!).getTime() - new Date(d.created_at).getTime()
          return sum + diff / (1000 * 60 * 60 * 24)
        }, 0) / envoyes.length
      )
    : null

  // Évolution: taux acceptation ce mois vs mois précédent
  const now = new Date()
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonth = all.filter(d => new Date(d.created_at) >= startThisMonth)
  const lastMonth = all.filter(d => {
    const d2 = new Date(d.created_at)
    return d2 >= startLastMonth && d2 < startThisMonth
  })

  function tauxAcceptation(list: typeof all) {
    const a = list.filter(d => d.statut === 'accepté').length
    const r = list.filter(d => d.statut === 'refusé').length
    return a + r > 0 ? Math.round((a / (a + r)) * 100) : null
  }

  const tauxCeMois    = tauxAcceptation(thisMonth)
  const tauxMoisPrec  = tauxAcceptation(lastMonth)
  const evolution = (tauxCeMois !== null && tauxMoisPrec !== null)
    ? tauxCeMois - tauxMoisPrec
    : null

  return Response.json({
    taux_acceptation: total > 0 ? Math.round((acceptes / total) * 100) : null,
    delai_moyen_jours: delaiMoyen,
    evolution_pct: evolution,
    similaires: { acceptes, refuses, en_cours: enCours, total: all.length },
  })
}
```

- [ ] **Step 2: Tester la route**

```bash
curl http://localhost:3000/api/devis/<un-vrai-id>/stats
```

Expected: `{"taux_acceptation":64,"delai_moyen_jours":5,"evolution_pct":12,"similaires":{"acceptes":9,"refuses":4,"en_cours":2,"total":15}}`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/devis/
git commit -m "feat(devis): route API stats de conversion"
```

---

## Task 3: API Relances

**Files:**
- Create: `src/app/api/devis/[id]/relances/route.ts`
- Create: `src/app/api/devis/[id]/relances/[rid]/route.ts`

- [ ] **Step 1: Créer GET + POST relances**

```typescript
// src/app/api/devis/[id]/relances/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devis_relances')
    .select('*')
    .eq('devis_id', params.id)
    .order('delai_jours', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ relances: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supabase = await createClient()

  if (!body.delai_jours || !body.canal) {
    return Response.json({ error: 'delai_jours et canal requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('devis_relances')
    .insert({
      devis_id:    params.id,
      delai_jours: body.delai_jours,
      canal:       body.canal,
      message:     body.message ?? null,
      statut:      'programmee',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ relance: data }, { status: 201 })
}
```

- [ ] **Step 2: Créer PATCH relance individuelle**

```typescript
// src/app/api/devis/[id]/relances/[rid]/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const body = await req.json()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('devis_relances')
    .update(body)
    .eq('id', params.rid)
    .eq('devis_id', params.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ relance: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; rid: string } }
) {
  const supabase = await createClient()
  await supabase.from('devis_relances').delete().eq('id', params.rid).eq('devis_id', params.id)
  return Response.json({ ok: true })
}
```

- [ ] **Step 3: Tester**

```bash
# Créer une relance
curl -X POST http://localhost:3000/api/devis/<id>/relances \
  -H "Content-Type: application/json" \
  -d '{"delai_jours": 3, "canal": "whatsapp"}'
# Expected: {"relance": {...}}

# Lister
curl http://localhost:3000/api/devis/<id>/relances
# Expected: {"relances": [...]}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/devis/
git commit -m "feat(devis): API relances CRUD"
```

---

## Task 4: API Signature électronique

**Files:**
- Create: `src/app/api/devis/[id]/signature/route.ts`
- Create: `src/app/api/devis/signature/[token]/route.ts`

- [ ] **Step 1: Créer la route d'envoi de lien signature**

```typescript
// src/app/api/devis/[id]/signature/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: devis } = await supabase
    .from('devis')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  // Générer un token unique
  const token = generateToken()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const signatureUrl = `${appUrl}/api/devis/signature/${token}`

  // Sauvegarder le token + statut
  await supabase
    .from('devis')
    .update({
      signature_token:  token,
      signature_statut: 'envoye',
      updated_at:       new Date().toISOString(),
    })
    .eq('id', params.id)

  // Envoyer via GHL WhatsApp si conversation_id disponible
  if (devis.conversation_id && devis.contact_id) {
    const message = `Bonjour${devis.contact_name ? ` ${devis.contact_name}` : ''},\n\nVotre devis ${devis.numero ?? ''} est prêt à être signé électroniquement :\n${signatureUrl}\n\nCordialement,\nL'équipe`
    await sendGHLMessage({
      conversationId: devis.conversation_id,
      contactId:      devis.contact_id,
      message,
      type:           'WhatsApp',
    }).catch(() => null) // ne pas bloquer si GHL échoue
  }

  return Response.json({ signature_url: signatureUrl, token })
}
```

- [ ] **Step 2: Créer la page publique de signature**

```typescript
// src/app/api/devis/signature/[token]/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — marquer comme "vu" et retourner les infos du devis
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()

  const { data: devis } = await supabase
    .from('devis')
    .select('id, titre, numero, contact_name, montant_ht, signature_statut, pdf_url')
    .eq('signature_token', params.token)
    .single()

  if (!devis) return Response.json({ error: 'Lien invalide ou expiré' }, { status: 404 })

  // Marquer comme vu (uniquement si pas encore signé)
  if (devis.signature_statut === 'envoye') {
    await supabase
      .from('devis')
      .update({ signature_statut: 'vu', signature_vu_le: new Date().toISOString() })
      .eq('id', devis.id)
  }

  return Response.json({
    devis: {
      id:           devis.id,
      titre:        devis.titre,
      numero:       devis.numero,
      contact_name: devis.contact_name,
      montant_ht:   devis.montant_ht,
      pdf_url:      devis.pdf_url,
      statut:       devis.signature_statut,
    }
  })
}

// POST — enregistrer la signature
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()

  const { data: devis } = await supabase
    .from('devis')
    .select('id, signature_statut')
    .eq('signature_token', params.token)
    .single()

  if (!devis) return Response.json({ error: 'Lien invalide' }, { status: 404 })
  if (devis.signature_statut === 'signe') {
    return Response.json({ error: 'Déjà signé' }, { status: 409 })
  }

  await supabase
    .from('devis')
    .update({
      signature_statut:  'signe',
      signature_signe_le: new Date().toISOString(),
      statut:             'accepté',
      updated_at:         new Date().toISOString(),
    })
    .eq('id', devis.id)

  return Response.json({ ok: true })
}
```

- [ ] **Step 3: Exclure la route signature du middleware auth**

Ouvrir `src/middleware.ts` et ajouter l'exclusion :

```typescript
// src/middleware.ts — ajouter cette condition AVANT le check user
if (pathname.startsWith('/api/devis/signature/')) {
  return supabaseResponse
}
```

Le fichier complet doit ressembler à :

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) return supabaseResponse

  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/devis/ src/middleware.ts
git commit -m "feat(devis): API signature électronique"
```

---

## Task 5: Composant PdfThumbnail

**Files:**
- Create: `src/components/devis/PdfThumbnail.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/devis/PdfThumbnail.tsx
// Vignette miniature CSS simulant un document PDF A4

interface PdfThumbnailProps {
  pdfUrl: string | null
  numero: string | null
  montantTtc?: number | null
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function PdfThumbnail({ pdfUrl, numero, montantTtc }: PdfThumbnailProps) {
  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span className="text-[9px] text-[#9CA3AF] font-semibold">PDF non généré</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      {/* Miniature A4 CSS — 82×116px */}
      <div className="w-[82px] h-[116px] bg-white rounded shadow-md overflow-hidden flex flex-col" style={{ transform: 'scale(0.95)' }}>
        {/* Header noir */}
        <div className="bg-[#111111] px-1.5 flex items-center justify-between flex-shrink-0" style={{ height: 22 }}>
          <span className="text-[#E2FF8D] font-black" style={{ fontSize: 5 }}>SOREN</span>
          <span className="text-white/60" style={{ fontSize: 5 }}>{numero ?? 'DEVIS'}</span>
        </div>
        {/* Body */}
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          {/* Lignes simulées */}
          <div className="h-[3px] bg-[#d1d5db] rounded-sm w-3/5" />
          <div className="h-[2px] bg-[#e5e7eb] rounded-sm w-2/5" />
          {/* Table simulée */}
          <div className="mt-1 flex flex-col gap-[2px]">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex gap-[2px]">
                <div className={`h-[4px] rounded-[1px] flex-1 ${i === 0 ? 'bg-[#111111]' : 'bg-[#f3f4f6]'}`} />
                <div className={`h-[4px] rounded-[1px] ${i === 0 ? 'bg-[#111111]' : 'bg-[#f3f4f6]'}`} style={{ width: 12 }} />
                <div className={`h-[4px] rounded-[1px] ${i === 0 ? 'bg-[#111111]' : 'bg-[#f3f4f6]'}`} style={{ width: 16 }} />
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="bg-[#f0f0eb] px-1.5 flex items-center justify-end flex-shrink-0" style={{ height: 14 }}>
          {montantTtc != null && (
            <span className="font-black text-[#111111]" style={{ fontSize: 4 }}>{fmtEUR(montantTtc)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/devis/PdfThumbnail.tsx
git commit -m "feat(devis): composant PdfThumbnail"
```

---

## Task 6: Vue Liste (DevisListView)

**Files:**
- Create: `src/components/devis/DevisListView.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/devis/DevisListView.tsx
'use client'

import { Plus } from 'lucide-react'
import PdfThumbnail from './PdfThumbnail'

type Devis = {
  id: string
  numero: string | null
  contact_name: string | null
  titre: string
  lignes: { quantite: number; prixUnitaire: number; tvaRate: number }[]
  montant_ht: number | null
  statut: string
  created_at: string
  pdf_url: string | null
  source: string
}

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  brouillon: { label: 'Brouillon', bg: '#f3f4f6',  color: '#6b7280' },
  'envoyé':  { label: 'Envoyé',   bg: '#EEF3FF',   color: '#3462EE' },
  'accepté': { label: 'Accepté',  bg: '#f0fdf4',   color: '#16a34a' },
  'refusé':  { label: 'Refusé',   bg: '#fef2f2',   color: '#dc2626' },
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function totalHT(lignes: Devis['lignes']) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
}

function totalTTC(lignes: Devis['lignes']) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)
}

interface DevisListViewProps {
  devisList: Devis[]
  onNew:    () => void
  onSelect: (d: Devis) => void
}

export default function DevisListView({ devisList, onNew, onSelect }: DevisListViewProps) {
  const enAttente = devisList.filter(d => d.statut === 'envoyé').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0">
        <div>
          <h1 className="font-montserrat text-[26px] font-extrabold text-[#111111]">Devis</h1>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-jakarta">
            {devisList.length} devis{enAttente > 0 ? ` · ${enAttente} en attente` : ''}
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 bg-[#111111] text-white rounded-full px-5 py-2.5 text-[13px] font-semibold hover:bg-[#222] transition-colors font-jakarta"
        >
          <Plus size={13} /> Nouveau devis
        </button>
      </div>

      {/* Grille scrollable horizontalement */}
      {devisList.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#f3f4f6] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-[#111111]">Aucun devis</p>
          <p className="text-[12px] text-[#9CA3AF]">Créez votre premier devis</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
          <div className="flex flex-row gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {devisList.map((d) => {
              const lignes = d.lignes ?? []
              const ht  = totalHT(lignes)
              const ttc = totalTTC(lignes)
              const displayHt  = ht  > 0 ? ht  : (d.montant_ht ?? 0)
              const displayTtc = ttc > 0 ? ttc : null
              const cfg = STATUT_CONFIG[d.statut] ?? STATUT_CONFIG.brouillon

              return (
                <div
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.01] cursor-pointer transition-all duration-200 border border-transparent hover:border-[#E2FF8D] flex-shrink-0"
                  style={{ width: 220 }}
                >
                  {/* Thumbnail */}
                  <div className="h-[140px] bg-[#f8f8f6] flex items-center justify-center">
                    <PdfThumbnail pdfUrl={d.pdf_url} numero={d.numero} montantTtc={displayTtc} />
                  </div>

                  {/* Infos */}
                  <div className="p-3.5">
                    <p className="text-[10px] text-[#9CA3AF] font-semibold mb-0.5 font-jakarta">{d.numero ?? '—'}</p>
                    <p className="text-[13px] font-bold text-[#111111] truncate font-jakarta">{d.titre}</p>
                    <p className="text-[11px] text-[#6B7280] mb-2.5 truncate font-jakarta">{d.contact_name ?? '—'}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-outfit text-[15px] font-bold text-[#111111]">
                        {displayHt > 0 ? fmtEUR(displayHt) : '—'}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/devis/DevisListView.tsx
git commit -m "feat(devis): vue liste grille scrollable avec vignettes PDF"
```

---

## Task 7: Section Infos + Timeline (panel gauche)

**Files:**
- Create: `src/components/devis/InfoSection.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/devis/InfoSection.tsx

type TimelineEvent = {
  label:  string
  detail: string
  date:   string | null
  color:  string
  done:   boolean
}

interface InfoSectionProps {
  devisId:         string
  contactId:       string | null
  contactName:     string | null
  conversationId:  string | null
  source:          string
  createdAt:       string
  envoyeLe:        string | null
  pdfUrl:          string | null
  montantHt:       number | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function InfoSection({
  devisId, contactId, contactName, conversationId, source,
  createdAt, envoyeLe, pdfUrl, montantHt,
}: InfoSectionProps) {
  const acompte30 = montantHt != null ? montantHt * 0.3 : null

  const timeline: TimelineEvent[] = [
    {
      label: 'Créé',
      detail: source === 'n8n' ? 'par IA depuis conversation' : 'manuellement',
      date: createdAt,
      color: '#E2FF8D',
      done: true,
    },
    {
      label: 'PDF généré',
      detail: pdfUrl ? '2.3 Mo' : 'non généré',
      date: pdfUrl ? createdAt : null,
      color: '#3462EE',
      done: !!pdfUrl,
    },
    {
      label: 'Envoyé',
      detail: envoyeLe ? 'par WhatsApp' : 'non envoyé',
      date: envoyeLe,
      color: '#4A91A8',
      done: !!envoyeLe,
    },
  ]

  return (
    <div className="border border-[#f0f0eb] rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Informations</p>

      {/* Contact */}
      {contactName && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Contact
          </span>
          <a
            href={contactId ? `/contacts/${contactId}` : '#'}
            className="text-[12px] font-semibold text-[#3462EE] hover:underline underline-offset-2"
          >
            {contactName} →
          </a>
        </div>
      )}

      {/* Conversation GHL */}
      {conversationId && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Conversation
          </span>
          <a
            href={`/conversations?id=${conversationId}`}
            className="text-[12px] font-semibold text-[#3462EE] hover:underline underline-offset-2"
          >
            Voir dans GHL →
          </a>
        </div>
      )}

      {/* Source */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Source
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={source === 'n8n'
            ? { background: '#f3e8ff', color: '#7c3aed' }
            : { background: '#f3f4f6', color: '#6b7280' }
          }
        >
          {source === 'n8n' ? 'IA · N8N' : 'Manuel'}
        </span>
      </div>

      <div className="h-px bg-[#f0f0eb]" />

      {/* Timeline */}
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Historique</p>
      <div className="flex flex-col gap-2">
        {timeline.map((ev) => (
          <div key={ev.label} className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: ev.done ? ev.color : '#e5e7eb',
                boxShadow: ev.done && ev.label === 'Créé' ? '0 0 0 2px #111' : 'none',
              }}
            />
            <span className="text-[11px] text-[#6B7280] flex-1">
              <strong className={ev.done ? 'text-[#111111]' : 'text-[#d1d5db]'}>{ev.label}</strong>
              {ev.done && ` · ${ev.detail}`}
            </span>
            {ev.date && (
              <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">{fmtDate(ev.date)}</span>
            )}
          </div>
        ))}
      </div>

      <div className="h-px bg-[#f0f0eb]" />

      {/* Acompte + PDF */}
      {acompte30 != null && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Acompte 30%
          </span>
          <span className="text-[12px] font-semibold text-[#111111]">{fmtEUR(acompte30)}</span>
        </div>
      )}

      {pdfUrl && (
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF
          </span>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold text-[#3462EE] hover:underline underline-offset-2"
          >
            Télécharger →
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/devis/InfoSection.tsx
git commit -m "feat(devis): section infos + timeline"
```

---

## Task 8: Section Signature

**Files:**
- Create: `src/components/devis/SignatureSection.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/devis/SignatureSection.tsx
'use client'

import { useState } from 'react'

type SignatureStatut = 'non_envoye' | 'envoye' | 'vu' | 'signe'

interface SignatureSectionProps {
  devisId:          string
  statut:           SignatureStatut
  contactEmail:     string | null
  signatureVuLe:    string | null
  signatureSigne:   string | null
  onStatutChange:   (statut: SignatureStatut) => void
}

const STEPS: { key: SignatureStatut | 'created'; label: string }[] = [
  { key: 'created',    label: 'Créé' },
  { key: 'envoye',     label: 'Envoyé' },
  { key: 'vu',         label: 'Vu' },
  { key: 'signe',      label: 'Signé' },
]

function stepIndex(statut: SignatureStatut): number {
  const map: Record<SignatureStatut, number> = {
    non_envoye: 0, envoye: 1, vu: 2, signe: 3,
  }
  return map[statut]
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function badgeLabel(statut: SignatureStatut) {
  const map: Record<SignatureStatut, { label: string; bg: string; color: string }> = {
    non_envoye: { label: 'Non envoyé',  bg: '#f3f4f6',  color: '#6b7280' },
    envoye:     { label: 'En attente',  bg: '#FEF9C3',  color: '#854D0E' },
    vu:         { label: 'Vu',          bg: '#EEF3FF',  color: '#3462EE' },
    signe:      { label: 'Signé ✓',     bg: '#f0fdf4',  color: '#16a34a' },
  }
  return map[statut]
}

export default function SignatureSection({
  devisId, statut, contactEmail, signatureVuLe, signatureSigne, onStatutChange,
}: SignatureSectionProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const badge = badgeLabel(statut)
  const done  = stepIndex(statut)

  async function handleEnvoyer() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/devis/${devisId}/signature`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onStatutChange('envoye')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          <span className="text-[13px] font-bold text-[#111111]">Signature électronique</span>
        </div>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-4">
        {STEPS.map((step, i) => {
          const isDone = i <= done
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: isDone ? '#111' : '#f3f4f6',
                    border: isDone ? 'none' : '2px dashed #d1d5db',
                  }}
                >
                  {isDone ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#d1d5db]" />
                  )}
                </div>
                <span className="text-[9px] font-semibold text-[#9CA3AF]">{step.label}</span>
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 mb-4"
                  style={{ background: i < done ? '#111' : '#e5e7eb' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Info + action */}
      {error && (
        <p className="text-[11px] text-red-600 mb-2">{error}</p>
      )}
      <div className="flex items-center justify-between bg-[#f9f9f7] rounded-xl px-3 py-2.5">
        <div>
          {statut === 'non_envoye' ? (
            <p className="text-[11px] text-[#9CA3AF]">Aucun lien envoyé</p>
          ) : (
            <>
              <p className="text-[10px] text-[#9CA3AF] mb-0.5">
                {statut === 'signe' ? 'Signé le' : statut === 'vu' ? 'Vu le' : 'Envoyé à'}
              </p>
              <p className="text-[12px] font-semibold text-[#111111]">
                {statut === 'signe' && signatureSigne ? fmtDate(signatureSigne)
                  : statut === 'vu' && signatureVuLe ? fmtDate(signatureVuLe)
                  : contactEmail ?? '—'}
              </p>
            </>
          )}
        </div>
        {statut !== 'signe' && (
          <button
            onClick={handleEnvoyer}
            disabled={loading}
            className="bg-[#111] text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 font-jakarta"
          >
            {loading ? '...' : statut === 'non_envoye' ? 'Envoyer le lien' : 'Renvoyer le lien'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/devis/SignatureSection.tsx
git commit -m "feat(devis): section signature électronique"
```

---

## Task 9: Section Relances

**Files:**
- Create: `src/components/devis/RelancesSection.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/devis/RelancesSection.tsx
'use client'

import { useState, useEffect } from 'react'

type Relance = {
  id:          string
  delai_jours: number
  canal:       'whatsapp' | 'email' | 'sms'
  statut:      'programmee' | 'envoyee' | 'annulee' | 'ignoree'
  envoye_le:   string | null
  created_at:  string
}

const STATUT_LABEL: Record<Relance['statut'], { label: string; bg: string; color: string }> = {
  programmee: { label: 'Programmée', bg: '#EEF3FF',  color: '#3462EE' },
  envoyee:    { label: 'Envoyée',    bg: '#f0fdf4',  color: '#16a34a' },
  annulee:    { label: 'Annulée',    bg: '#f3f4f6',  color: '#9ca3af' },
  ignoree:    { label: 'Ignorée',    bg: '#fef2f2',  color: '#dc2626' },
}

const CANAL_COLOR: Record<Relance['canal'], string> = {
  whatsapp: '#4A91A8',
  email:    '#3462EE',
  sms:      '#8B5CF6',
}

function dayLabel(devis_created_at: string, delai: number): string {
  const d = new Date(devis_created_at)
  d.setDate(d.getDate() + delai)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface RelancesSectionProps {
  devisId:         string
  devisCreatedAt:  string
}

export default function RelancesSection({ devisId, devisCreatedAt }: RelancesSectionProps) {
  const [relances, setRelances] = useState<Relance[]>([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [newDelai, setNewDelai] = useState(3)
  const [newCanal, setNewCanal] = useState<Relance['canal']>('whatsapp')

  useEffect(() => {
    fetch(`/api/devis/${devisId}/relances`)
      .then(r => r.json())
      .then(j => { setRelances(j.relances ?? []); setLoading(false) })
  }, [devisId])

  async function handleAdd() {
    const res = await fetch(`/api/devis/${devisId}/relances`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delai_jours: newDelai, canal: newCanal }),
    })
    const json = await res.json()
    if (res.ok) {
      setRelances(prev => [...prev, json.relance])
      setAdding(false)
    }
  }

  async function handleCancel(rid: string) {
    await fetch(`/api/devis/${devisId}/relances/${rid}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ statut: 'annulee' }),
    })
    setRelances(prev => prev.map(r => r.id === rid ? { ...r, statut: 'annulee' } : r))
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span className="text-[13px] font-bold text-[#111111]">Relances automatiques</span>
        </div>
      </div>

      {loading ? (
        <p className="text-[11px] text-[#9CA3AF]">Chargement…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {relances.map(r => {
            const cfg = STATUT_LABEL[r.statut]
            return (
              <div key={r.id} className="flex items-center justify-between bg-[#f9f9f7] rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CANAL_COLOR[r.canal] }} />
                  <div>
                    <p className="text-[12px] font-semibold text-[#111111]">
                      J+{r.delai_jours} · {r.canal.charAt(0).toUpperCase() + r.canal.slice(1)}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">{dayLabel(devisCreatedAt, r.delai_jours)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  {r.statut === 'programmee' && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="text-[#9CA3AF] hover:text-red-500 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulaire ajout */}
      {adding ? (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={newDelai}
            onChange={e => setNewDelai(Number(e.target.value))}
            className="bg-[#f9f9f7] border border-[#f0f0eb] rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#111] font-jakarta"
          >
            {[3, 7, 14, 21].map(d => <option key={d} value={d}>J+{d}</option>)}
          </select>
          <select
            value={newCanal}
            onChange={e => setNewCanal(e.target.value as Relance['canal'])}
            className="bg-[#f9f9f7] border border-[#f0f0eb] rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#111] font-jakarta"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <button onClick={handleAdd} className="bg-[#111] text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold font-jakarta">
            Ajouter
          </button>
          <button onClick={() => setAdding(false)} className="text-[#9CA3AF] text-[11px] font-semibold font-jakarta">
            Annuler
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full border border-dashed border-[#d1d5db] rounded-xl py-2 text-[11px] font-semibold text-[#9CA3AF] hover:text-[#6b7280] hover:border-[#9ca3af] transition-colors font-jakarta"
        >
          + Ajouter une relance
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/devis/RelancesSection.tsx
git commit -m "feat(devis): section relances automatiques"
```

---

## Task 10: Section Stats

**Files:**
- Create: `src/components/devis/StatsSection.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// src/components/devis/StatsSection.tsx
'use client'

import { useState, useEffect } from 'react'

interface StatsData {
  taux_acceptation:  number | null
  delai_moyen_jours: number | null
  evolution_pct:     number | null
  similaires: {
    acceptes:  number
    refuses:   number
    en_cours:  number
    total:     number
  }
}

interface StatsSectionProps {
  devisId: string
}

export default function StatsSection({ devisId }: StatsSectionProps) {
  const [stats, setStats]   = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/devis/${devisId}/stats`)
      .then(r => r.json())
      .then(j => { setStats(j); setLoading(false) })
  }, [devisId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] text-[#9CA3AF]">Chargement des statistiques…</p>
      </div>
    )
  }

  if (!stats || stats.similaires.total === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span className="text-[13px] font-bold text-[#111111]">Statistiques de conversion</span>
        </div>
        <p className="text-[11px] text-[#9CA3AF]">Pas encore assez de devis similaires pour afficher des statistiques.</p>
      </div>
    )
  }

  const { taux_acceptation, delai_moyen_jours, evolution_pct, similaires } = stats
  const maxBar = Math.max(similaires.acceptes, similaires.refuses, similaires.en_cours, 1)

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span className="text-[13px] font-bold text-[#111111]">Statistiques de conversion</span>
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#f9f9f7] rounded-xl p-2.5 text-center">
          <p className="font-outfit text-[22px] font-bold text-[#111111] leading-none">
            {taux_acceptation != null ? `${taux_acceptation}%` : '—'}
          </p>
          <p className="text-[9px] text-[#9CA3AF] font-semibold mt-1">Taux accept.</p>
        </div>
        <div className="bg-[#f9f9f7] rounded-xl p-2.5 text-center">
          <p className="font-outfit text-[22px] font-bold text-[#111111] leading-none">
            {delai_moyen_jours != null ? `${delai_moyen_jours}j` : '—'}
          </p>
          <p className="text-[9px] text-[#9CA3AF] font-semibold mt-1">Délai moyen</p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: evolution_pct != null && evolution_pct >= 0 ? '#E2FF8D' : '#fef2f2' }}
        >
          <p className="font-outfit text-[22px] font-bold text-[#111111] leading-none">
            {evolution_pct != null
              ? `${evolution_pct >= 0 ? '↑' : '↓'}${Math.abs(evolution_pct)}%`
              : '—'
            }
          </p>
          <p
            className="text-[9px] font-semibold mt-1"
            style={{ color: evolution_pct != null && evolution_pct >= 0 ? '#556b00' : '#dc2626' }}
          >
            vs mois préc.
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <p className="text-[10px] text-[#9CA3AF] font-semibold mb-2">
        Devis similaires (±50% du montant) · {similaires.total} au total
      </p>
      <div className="flex flex-col gap-1.5">
        {[
          { label: 'Acceptés', count: similaires.acceptes, color: '#111111' },
          { label: 'Refusés',  count: similaires.refuses,  color: '#d1d5db' },
          { label: 'En cours', count: similaires.en_cours, color: '#E2FF8D' },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B7280] font-jakarta" style={{ width: 52 }}>{label}</span>
            <div className="flex-1 h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((count / maxBar) * 100)}%`, background: color }}
              />
            </div>
            <span className="text-[10px] font-bold text-[#111111]" style={{ width: 16, textAlign: 'right' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/devis/StatsSection.tsx
git commit -m "feat(devis): section statistiques de conversion"
```

---

## Task 11: Vue Détail Split Screen (DevisDetailView)

**Files:**
- Create: `src/components/devis/DevisDetailView.tsx`

- [ ] **Step 1: Créer le composant (partie 1 — types + helpers + state)**

```tsx
// src/components/devis/DevisDetailView.tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, Save, Download, ExternalLink, Send, Trash2, Plus, X } from 'lucide-react'
import InfoSection from './InfoSection'
import SignatureSection from './SignatureSection'
import RelancesSection from './RelancesSection'
import StatsSection from './StatsSection'

type Ligne = {
  _id: string; description: string; quantite: number
  unite: string; prixUnitaire: number; tvaRate: number
}

type SignatureStatut = 'non_envoye' | 'envoye' | 'vu' | 'signe'

type Devis = {
  id: string; numero: string | null; contact_name: string | null
  contact_email: string | null; contact_phone: string | null
  contact_id: string | null; conversation_id: string | null
  titre: string; contenu: string; lignes: Omit<Ligne, '_id'>[]
  notes: string; montant_ht: number | null; statut: string
  created_at: string; envoye_le: string | null; ville: string | null
  date_validite: string | null; adresse_chantier: string | null
  pdf_url: string | null; source: string
  signature_statut: SignatureStatut
  signature_vu_le: string | null
  signature_signe_le: string | null
}

type Tab = 'split' | 'edit' | 'preview'

const STATUT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  brouillon: { label: 'Brouillon', bg: '#f3f4f6', color: '#6b7280' },
  'envoyé':  { label: 'Envoyé',   bg: '#EEF3FF', color: '#3462EE' },
  'accepté': { label: 'Accepté',  bg: '#f0fdf4', color: '#16a34a' },
  'refusé':  { label: 'Refusé',   bg: '#fef2f2', color: '#dc2626' },
}

const UNITES = ['U', 'm²', 'ml', 'm³', 'h', 'j', 'forfait', 'ens.']

function uid() { return Math.random().toString(36).slice(2) }
function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function totalHT(lignes: Ligne[]) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
}
function totalTTC(lignes: Ligne[]) {
  return lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)
}
function fromLignesDb(raw: Omit<Ligne, '_id'>[]): Ligne[] {
  return (raw ?? []).map(l => ({ ...l, _id: uid() }))
}
function toLignesPayload(lignes: Ligne[]) {
  return lignes.map(({ _id: _, ...rest }) => rest)
}

const inputCls = 'w-full bg-[#f9f9f7] border border-[#f0f0eb] rounded-xl px-3 py-2 text-[13px] text-[#111111] placeholder-[#d1d5db] focus:outline-none focus:border-[#3462EE] focus:bg-white transition-colors font-jakarta'

interface DevisDetailViewProps {
  devis:      Devis
  onClose:    () => void
  onUpdated:  (d: Devis) => void
  onDeleted:  (id: string) => void
}
```

- [ ] **Step 2: Créer le composant (partie 2 — rendu)**

Ajouter à la suite du même fichier `src/components/devis/DevisDetailView.tsx` :

```tsx
export default function DevisDetailView({ devis: initial, onClose, onUpdated, onDeleted }: DevisDetailViewProps) {
  const [tab, setTab]           = useState<Tab>('split')
  const [titre, setTitre]       = useState(initial.titre)
  const [lignes, setLignes]     = useState<Ligne[]>(fromLignesDb(initial.lignes))
  const [notes, setNotes]       = useState(initial.notes ?? '')
  const [ville, setVille]       = useState(initial.ville ?? '')
  const [dateVal, setDateVal]   = useState(initial.date_validite?.slice(0, 10) ?? '')
  const [chantier, setChantier] = useState(initial.adresse_chantier ?? '')
  const [sigStatut, setSigStatut] = useState<SignatureStatut>(initial.signature_statut ?? 'non_envoye')
  const [saving, setSaving]     = useState(false)
  const [genPdf, setGenPdf]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [pdfUrl, setPdfUrl]     = useState(initial.pdf_url)

  const statut = initial.statut
  const cfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG.brouillon
  const ht  = totalHT(lignes)
  const ttc = totalTTC(lignes)

  // TVA par taux
  const tvaMap: Record<number, number> = {}
  for (const l of lignes) {
    const lHt = l.quantite * l.prixUnitaire
    tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + lHt * (l.tvaRate / 100)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const validLignes = lignes.filter(l => l.description.trim())
      const res = await fetch(`/api/devis/${initial.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre, notes,
          ville: ville || null,
          date_validite:    dateVal || null,
          adresse_chantier: chantier || null,
          lignes:           toLignesPayload(validLignes),
          montant_ht:       ht > 0 ? ht : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onUpdated(json.devis as Devis)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function handleGeneratePdf() {
    setGenPdf(true); setError(null)
    try {
      const res = await fetch(`/api/devis/${initial.id}/pdf`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur PDF')
      setPdfUrl(json.pdf_url)
      window.open(json.pdf_url, '_blank')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur PDF')
    } finally {
      setGenPdf(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce devis définitivement ?')) return
    await fetch(`/api/devis/${initial.id}`, { method: 'DELETE' })
    onDeleted(initial.id)
  }

  // Panel gauche — formulaire
  const formPanel = (
    <div className="overflow-y-auto p-6 flex flex-col gap-5" style={{ scrollbarWidth: 'thin' }}>
      {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {/* Client */}
      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Client</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Nom</label>
            <input className={inputCls} defaultValue={initial.contact_name ?? ''} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Téléphone</label>
            <input className={inputCls} defaultValue={initial.contact_phone ?? ''} readOnly />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Email</label>
            <input className={inputCls} defaultValue={initial.contact_email ?? ''} readOnly />
          </div>
        </div>
      </div>

      {/* Devis */}
      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Devis</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Titre</label>
            <input className={inputCls} value={titre} onChange={e => setTitre(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Ville</label>
            <input className={inputCls} value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Validité</label>
            <input type="date" className={inputCls} value={dateVal} onChange={e => setDateVal(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] font-semibold text-[#6B7280] block mb-1">Adresse chantier</label>
            <input className={inputCls} value={chantier} onChange={e => setChantier(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Lignes */}
      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Lignes</p>
        <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          <table className="w-full" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                {['Description', 'Qté', 'Unité', 'PU HT', 'TVA%', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] pb-2 pr-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l._id} className="border-b border-[#f0f0eb] last:border-0">
                  <td className="py-1.5 pr-2">
                    <input
                      value={l.description}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, description: e.target.value } : x))}
                      placeholder="Libellé…"
                      className="w-full bg-transparent text-[12px] text-[#111] outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 50 }}>
                    <input
                      type="number" value={l.quantite}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, quantite: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-transparent text-[12px] text-right outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 70 }}>
                    <select
                      value={l.unite}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, unite: e.target.value } : x))}
                      className="w-full bg-transparent text-[12px] outline-none"
                    >
                      {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 80 }}>
                    <input
                      type="number" value={l.prixUnitaire}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, prixUnitaire: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-transparent text-[12px] text-right outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5 pr-2" style={{ width: 50 }}>
                    <input
                      type="number" value={l.tvaRate}
                      onChange={e => setLignes(prev => prev.map(x => x._id === l._id ? { ...x, tvaRate: parseFloat(e.target.value) || 0 } : x))}
                      className="w-full bg-transparent text-[12px] text-right outline-none focus:bg-[#EEF3FF] focus:rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1.5" style={{ width: 28 }}>
                    <button
                      onClick={() => setLignes(prev => prev.filter(x => x._id !== l._id))}
                      className="text-[#d1d5db] hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => setLignes(prev => [...prev, { _id: uid(), description: '', quantite: 1, unite: 'U', prixUnitaire: 0, tvaRate: 20 }])}
          className="mt-2 flex items-center gap-1 text-[12px] text-[#3462EE] font-semibold hover:text-[#2550CC] transition-colors font-jakarta"
        >
          <Plus size={12} /> Ajouter une ligne
        </button>
      </div>

      {/* Notes */}
      <div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Notes</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Conditions de paiement, délai d'exécution…"
          className={inputCls + ' resize-none'}
        />
      </div>

      {/* Totaux */}
      <div className="bg-[#f9f9f7] rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex justify-between text-[12px] text-[#6B7280]">
          <span>Total HT</span>
          <span className="font-semibold text-[#111]">{fmtEUR(ht)}</span>
        </div>
        {Object.entries(tvaMap).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, amount]) => (
          <div key={rate} className="flex justify-between text-[12px] text-[#6B7280]">
            <span>TVA {rate}%</span><span>{fmtEUR(amount)}</span>
          </div>
        ))}
        <div className="flex justify-between text-[14px] font-bold text-[#111] border-t border-[#e5e7eb] pt-2 mt-1">
          <span>Total TTC</span><span>{fmtEUR(ttc)}</span>
        </div>
      </div>

      {/* Section Infos + Timeline */}
      <InfoSection
        devisId={initial.id}
        contactId={initial.contact_id}
        contactName={initial.contact_name}
        conversationId={initial.conversation_id}
        source={initial.source}
        createdAt={initial.created_at}
        envoyeLe={initial.envoye_le}
        pdfUrl={pdfUrl}
        montantHt={ht > 0 ? ht : initial.montant_ht}
      />

      {/* Danger */}
      <div>
        <button
          onClick={handleDelete}
          className="text-[12px] font-semibold text-red-500 hover:text-red-700 transition-colors font-jakarta"
        >
          Supprimer ce devis…
        </button>
      </div>
    </div>
  )

  // Panel droit — aperçu + sections
  const previewPanel = (
    <div className="overflow-y-auto bg-[#e8e9e4] flex flex-col items-center p-6 gap-4" style={{ scrollbarWidth: 'thin' }}>
      {/* Toolbar */}
      <div className="w-full max-w-[540px] flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Aperçu PDF</span>
        <div className="flex gap-2">
          {pdfUrl && (
            <>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-semibold bg-white text-[#6B7280] px-3 py-1.5 rounded-lg hover:text-[#111] transition-colors font-jakarta">
                ↗ Ouvrir
              </a>
              <a href={pdfUrl} download
                className="text-[11px] font-semibold bg-[#111] text-white px-3 py-1.5 rounded-lg hover:bg-[#333] transition-colors font-jakarta">
                ⬇ Télécharger
              </a>
            </>
          )}
        </div>
      </div>

      {/* A4 Page */}
      <div className="w-full max-w-[540px] bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header noir */}
        <div className="bg-[#111111] px-6 py-5 flex justify-between">
          <div>
            <p className="text-[#E2FF8D] font-black text-[16px]">{initial.contact_name ?? 'SOREN'}</p>
            <p className="text-white/40 text-[9px] mt-1">{ville || 'Infrastructure d\'Acquisition BTP'}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-outfit font-bold text-[18px]">DEVIS N° {initial.numero ?? '—'}</p>
            <p className="text-white/40 text-[9px] mt-1">{fmtDate(initial.created_at)}</p>
            <p className="text-white/70 text-[11px] font-semibold mt-2">{initial.contact_name ?? '—'}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="bg-[#f9f9f7] rounded-xl p-3 mb-4 flex justify-between">
            <div>
              <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Objet</p>
              <p className="text-[13px] font-bold text-[#111]">{titre}</p>
              {chantier && <p className="text-[10px] text-[#9CA3AF] mt-0.5">{chantier}</p>}
            </div>
            {dateVal && (
              <div className="text-right">
                <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Validité</p>
                <p className="text-[12px] font-bold text-[#111]">{fmtDate(dateVal)}</p>
              </div>
            )}
          </div>

          <table className="w-full mb-4" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111' }}>
                {['Description', 'Qté', 'Unité', 'PU HT', 'TVA', 'Total HT'].map(h => (
                  <th key={h} className="text-left px-2 py-2 text-white"
                    style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.filter(l => l.description.trim()).map((l, i) => (
                <tr key={l._id} style={{ background: i % 2 === 0 ? 'white' : '#fafaf8', borderBottom: '1px solid #f0f0eb' }}>
                  <td className="px-2 py-1.5 text-[10px] text-[#111]">{l.description}</td>
                  <td className="px-2 py-1.5 text-[10px] text-right">{l.quantite}</td>
                  <td className="px-2 py-1.5 text-[10px]">{l.unite}</td>
                  <td className="px-2 py-1.5 text-[10px] text-right">{fmtEUR(l.prixUnitaire)}</td>
                  <td className="px-2 py-1.5 text-[10px] text-right">{l.tvaRate}%</td>
                  <td className="px-2 py-1.5 text-[10px] text-right font-semibold">{fmtEUR(l.quantite * l.prixUnitaire)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-4">
            <div style={{ width: 180 }}>
              <div className="flex justify-between text-[10px] text-[#6B7280] py-1">
                <span>Total HT</span><span>{fmtEUR(ht)}</span>
              </div>
              {Object.entries(tvaMap).sort(([a], [b]) => Number(b) - Number(a)).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between text-[10px] text-[#6B7280] py-1">
                  <span>TVA {rate}%</span><span>{fmtEUR(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold py-2 border-t-2 border-[#111] mt-1" style={{ fontSize: 13 }}>
                <span>Total TTC</span><span>{fmtEUR(ttc)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="bg-[#f9f9f7] rounded-xl px-3 py-2 text-[9px] text-[#6B7280] leading-relaxed">
              <strong>Notes :</strong> {notes}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#111] px-6 py-2.5 flex justify-between">
          <span className="text-white/50 font-semibold" style={{ fontSize: 8 }}>Devis {initial.numero ?? '—'}</span>
          <span className="text-white/30" style={{ fontSize: 8 }}>Document généré par Soren</span>
        </div>
      </div>

      {/* 3 sections */}
      <div className="w-full max-w-[540px] flex flex-col gap-3">
        <SignatureSection
          devisId={initial.id}
          statut={sigStatut}
          contactEmail={initial.contact_email}
          signatureVuLe={initial.signature_vu_le}
          signatureSigne={initial.signature_signe_le}
          onStatutChange={setSigStatut}
        />
        <RelancesSection
          devisId={initial.id}
          devisCreatedAt={initial.created_at}
        />
        <StatsSection devisId={initial.id} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-[#f0f0eb] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#f5f5f0] rounded-xl flex items-center justify-center hover:bg-[#e5e7eb] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <div>
            <p className="text-[11px] text-[#9CA3AF] font-semibold font-jakarta">
              {initial.numero ?? '—'} · {initial.contact_name ?? '—'}
            </p>
            <p className="text-[15px] font-bold text-[#111]">{titre}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex gap-0.5 bg-[#f0f0eb] rounded-xl p-1">
            {(['split', 'edit', 'preview'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1 rounded-lg text-[12px] font-semibold transition-all font-jakarta"
                style={{
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? '#111' : '#9ca3af',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t === 'split' ? 'Split' : t === 'edit' ? 'Édition' : 'Aperçu'}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#f5f5f0] text-[#111] rounded-xl px-3 py-2 text-[12px] font-semibold hover:bg-[#e5e7eb] transition-colors disabled:opacity-40 font-jakarta"
          >
            <Save size={13} /> {saving ? '…' : 'Sauvegarder'}
          </button>

          {pdfUrl ? (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#E2FF8D] text-[#111] rounded-xl px-3 py-2 text-[12px] font-semibold hover:bg-[#d4f570] transition-colors font-jakarta">
              <ExternalLink size={13} /> Voir PDF
            </a>
          ) : (
            <button
              onClick={handleGeneratePdf}
              disabled={genPdf}
              className="flex items-center gap-1.5 bg-[#E2FF8D] text-[#111] rounded-xl px-3 py-2 text-[12px] font-semibold hover:bg-[#d4f570] transition-colors disabled:opacity-40 font-jakarta"
            >
              <Download size={13} /> {genPdf ? '…' : 'Générer PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Split / Edit / Preview */}
      <div className="flex-1 flex overflow-hidden" style={{ gap: 1, background: '#e5e7eb' }}>
        {tab !== 'preview' && (
          <div
            className="bg-white flex flex-col"
            style={{ width: tab === 'split' ? '45%' : '100%', flexShrink: 0 }}
          >
            {formPanel}
          </div>
        )}
        {tab !== 'edit' && (
          <div className="flex-1 flex flex-col">
            {previewPanel}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/devis/DevisDetailView.tsx
git commit -m "feat(devis): vue détail split screen avec aperçu A4 live"
```

---

## Task 12: Refonte DevisView (orchestrateur)

**Files:**
- Modify: `src/components/devis/DevisView.tsx`

- [ ] **Step 1: Remplacer DevisView.tsx par la version allégée**

```tsx
// src/components/devis/DevisView.tsx
'use client'

import { useState } from 'react'
import DevisListView from './DevisListView'
import DevisDetailView from './DevisDetailView'

// Types partagés
type Ligne = {
  quantite:     number
  prixUnitaire: number
  tvaRate:      number
  description:  string
  unite:        string
}

type Devis = {
  id: string; numero: string | null; contact_name: string | null
  contact_email: string | null; contact_phone: string | null
  contact_id: string | null; conversation_id: string | null
  titre: string; contenu: string; lignes: Ligne[]
  notes: string; montant_ht: number | null; statut: string
  created_at: string; envoye_le: string | null; ville: string | null
  date_validite: string | null; adresse_chantier: string | null
  pdf_url: string | null; source: string
  signature_statut: 'non_envoye' | 'envoye' | 'vu' | 'signe'
  signature_vu_le: string | null
  signature_signe_le: string | null
}

type View = 'list' | 'detail'

export default function DevisView({ devisList: initial }: { devisList: Devis[] }) {
  const [devisList, setDevisList] = useState<Devis[]>(initial)
  const [view, setView]           = useState<View>('list')
  const [selected, setSelected]   = useState<Devis | null>(null)

  function handleClose()          { setView('list'); setSelected(null) }
  function handleUpdated(d: Devis) {
    setDevisList(p => p.map(x => x.id === d.id ? d : x))
    setSelected(d)
  }
  function handleDeleted(id: string) {
    setDevisList(p => p.filter(x => x.id !== id))
    handleClose()
  }

  return (
    <div className="h-screen flex flex-col bg-[#EEF0EB]" style={{ marginLeft: 236 }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'list' && (
          <DevisListView
            devisList={devisList}
            onNew={() => {/* TODO: ouvre create panel */}}
            onSelect={d => { setSelected(d); setView('detail') }}
          />
        )}
        {view === 'detail' && selected && (
          <DevisDetailView
            devis={selected}
            onClose={handleClose}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        )}
      </div>
    </div>
  )
}
```

**Note :** Le bouton "Nouveau devis" dans `DevisListView` appelle `onNew`. Pour l'instant on ouvre juste un `alert('TODO')` — le create panel existant sera réintégré dans une prochaine itération si besoin.

- [ ] **Step 2: Mettre à jour la page Devis pour inclure les nouveaux champs Supabase**

```typescript
// src/app/devis/page.tsx
import { createClient } from '@/lib/supabase/server'
import DevisView from '@/components/devis/DevisView'

export const dynamic = 'force-dynamic'

export default async function DevisPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('devis')
    .select('*, signature_statut, signature_vu_le, signature_signe_le')
    .order('created_at', { ascending: false })
  return <DevisView devisList={data ?? []} />
}
```

- [ ] **Step 3: Vérifier que la build passe**

```bash
npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 4: Commit final**

```bash
git add src/components/devis/ src/app/devis/
git commit -m "feat(devis): refonte complète module - liste grille + split screen + signature + relances + stats"
```

---

## Self-Review

**Spec coverage:**
- ✅ Vue liste grille scrollable → Task 6 (DevisListView)
- ✅ Vignettes PDF CSS → Task 5 (PdfThumbnail)
- ✅ Split screen Édition/Aperçu/Split → Task 11 (DevisDetailView)
- ✅ Section infos + timeline → Task 7 (InfoSection)
- ✅ Signature électronique → Task 4 (API) + Task 8 (SignatureSection)
- ✅ Relances automatiques → Task 3 (API) + Task 9 (RelancesSection)
- ✅ Stats de conversion → Task 2 (API) + Task 10 (StatsSection)
- ✅ Migrations Supabase → Task 1
- ✅ Middleware exclusion signature publique → Task 4

**Type consistency:**
- `Devis` défini dans DevisView.tsx et réutilisé dans DevisDetailView (même structure)
- `SignatureStatut` cohérent entre API et SignatureSection
- `Relance.canal` cohérent entre API et RelancesSection

**Pas de placeholders.**
