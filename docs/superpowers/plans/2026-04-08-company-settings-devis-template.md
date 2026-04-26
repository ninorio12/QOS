# Company Settings & Devis Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'admin de configurer les paramètres de son entreprise (logo SVG, couleur brand, infos légales) dans la page Paramètres, et que ces paramètres soient utilisés automatiquement lors de la génération des devis PDF.

**Architecture:** Table Supabase `company_settings` (1 ligne), page `/parametres` avec formulaire + aperçu logo, `buildDevisHtml()` étendu avec `logoSvg`, routes PDF et Send qui lisent depuis Supabase.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Tailwind CSS

---

## File Structure

| Fichier | Action | Rôle |
|---------|--------|------|
| `supabase/migrations/20260408_company_settings.sql` | Créer | Table company_settings + ligne par défaut |
| `src/app/api/settings/company/route.ts` | Créer | GET + PATCH company_settings |
| `src/lib/apitemplate.ts` | Modifier | Ajouter `logoSvg` à `CompanyInfo` + `buildDevisHtml()` |
| `src/app/parametres/page.tsx` | Modifier | Charger et afficher CompanySettingsView |
| `src/components/settings/CompanySettingsView.tsx` | Créer | Formulaire paramètres entreprise |
| `src/app/api/devis/[id]/pdf/route.ts` | Modifier | Lire company_settings depuis Supabase |
| `src/app/api/devis/[id]/send/route.ts` | Modifier | Lire company_settings depuis Supabase |

---

## Task 1 : Migration Supabase — table `company_settings`

**Files:**
- Create: `supabase/migrations/20260408_company_settings.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- supabase/migrations/20260408_company_settings.sql

CREATE TABLE IF NOT EXISTS company_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Soren',
  tagline     TEXT NOT NULL DEFAULT 'Construction · Rénovation · Aménagement',
  address     TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  siret       TEXT NOT NULL DEFAULT '',
  capital     TEXT NOT NULL DEFAULT '',
  tva_intra   TEXT NOT NULL DEFAULT '',
  assurance   TEXT NOT NULL DEFAULT '',
  brand_color TEXT NOT NULL DEFAULT '#d28e46',
  logo_svg    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ligne admin par défaut (idempotente)
INSERT INTO company_settings (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Soren')
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2 : Exécuter la migration dans Supabase**

Dans le dashboard Supabase → SQL Editor, coller et exécuter le contenu du fichier ci-dessus.

Vérifier que la table existe et contient une ligne :
```sql
SELECT * FROM company_settings;
```
Expected : 1 ligne avec `name = 'Soren'` et les autres champs vides.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/20260408_company_settings.sql
git commit -m "feat: add company_settings migration"
```

---

## Task 2 : Route API `GET/PATCH /api/settings/company`

**Files:**
- Create: `src/app/api/settings/company/route.ts`

- [ ] **Step 1 : Créer le fichier de route**

```ts
// src/app/api/settings/company/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ company: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()

  const allowed = [
    'name', 'tagline', 'address', 'phone', 'email',
    'siret', 'capital', 'tva_intra', 'assurance',
    'brand_color', 'logo_svg',
  ]
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabase
    .from('company_settings')
    .update(update)
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ company: data })
}
```

- [ ] **Step 2 : Tester les routes**

Dans le terminal :
```bash
# GET
curl http://localhost:3000/api/settings/company
# Expected: { "company": { "name": "Soren", "brand_color": "#d28e46", ... } }

# PATCH
curl -X PATCH http://localhost:3000/api/settings/company \
  -H "Content-Type: application/json" \
  -d '{"name": "Soren Test", "brand_color": "#ff0000"}'
# Expected: { "company": { "name": "Soren Test", "brand_color": "#ff0000", ... } }
```

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/settings/company/route.ts
git commit -m "feat: add GET/PATCH /api/settings/company"
```

---

## Task 3 : Mettre à jour `CompanyInfo` et `buildDevisHtml()` dans `apitemplate.ts`

**Files:**
- Modify: `src/lib/apitemplate.ts`

- [ ] **Step 1 : Ajouter `logoSvg` au type `CompanyInfo`**

Dans `src/lib/apitemplate.ts`, modifier le type `CompanyInfo` (ligne ~17) :

```ts
export type CompanyInfo = {
  name:        string
  tagline?:    string
  address?:    string
  phone?:      string
  email?:      string
  siret?:      string
  capital?:    string
  tvaIntra?:   string
  brandColor:  string
  accentColor: string
  assurance?:  string
  logoSvg?:    string | null   // SVG brut ou null → fallback logo CSS
}
```

- [ ] **Step 2 : Mettre à jour le bloc logo dans `buildDevisHtml()`**

Dans la fonction `buildDevisHtml()`, remplacer le bloc HTML du logo dans le header. Actuellement il y a `<div class="logo-house"></div>`. Remplacer par :

```ts
const logoBlock = params.company.logoSvg
  ? `<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${params.company.logoSvg}</div>`
  : `<div class="logo-house"></div>`
```

Et dans le HTML du header, remplacer `<div class="logo-house"></div>` par `${logoBlock}`.

- [ ] **Step 3 : Vérifier que TypeScript compile sans erreur**

```bash
rtk tsc --noEmit
```
Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/apitemplate.ts
git commit -m "feat: add logoSvg support to buildDevisHtml"
```

---

## Task 4 : Composant `CompanySettingsView`

**Files:**
- Create: `src/components/settings/CompanySettingsView.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// src/components/settings/CompanySettingsView.tsx
'use client'

import { useEffect, useState } from 'react'

type CompanySettings = {
  id: string
  name: string
  tagline: string
  address: string
  phone: string
  email: string
  siret: string
  capital: string
  tva_intra: string
  assurance: string
  brand_color: string
  logo_svg: string
}

export default function CompanySettingsView() {
  const [form, setForm] = useState<CompanySettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.json())
      .then(d => setForm(d.company))
  }, [])

  if (!form) return <div className="p-8 text-white/40">Chargement...</div>

  function set(key: keyof CompanySettings, value: string) {
    setForm(f => f ? { ...f, [key]: value } : f)
  }

  async function save() {
    setSaving(true)
    await fetch('/api/settings/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = (label: string, key: keyof CompanySettings, type = 'text') => (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
      />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h2 className="text-white font-semibold text-lg">Paramètres de l'entreprise</h2>

      <div className="grid grid-cols-2 gap-4">
        {field("Nom de l'entreprise", 'name')}
        {field("Tagline", 'tagline')}
        {field("Adresse", 'address')}
        {field("Téléphone", 'phone')}
        {field("Email", 'email')}
        {field("SIRET", 'siret')}
        {field("Capital social", 'capital')}
        {field("TVA intracommunautaire", 'tva_intra')}
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">Assurance décennale</label>
        <input
          value={form.assurance}
          onChange={e => set('assurance', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">Couleur brand</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.brand_color}
            onChange={e => set('brand_color', e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-white/10 bg-transparent"
          />
          <span className="text-white/60 text-sm font-mono">{form.brand_color}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1">Logo SVG (coller le code SVG)</label>
        <textarea
          value={form.logo_svg}
          onChange={e => set('logo_svg', e.target.value)}
          rows={6}
          placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>'
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-white/30 resize-none"
        />
        {form.logo_svg && (
          <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
            <div
              style={{ width: 60, height: 60 }}
              dangerouslySetInnerHTML={{ __html: form.logo_svg }}
            />
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-5 py-2 rounded-lg bg-[#E2FF8D] text-[#111111] font-semibold text-sm disabled:opacity-50"
      >
        {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/components/settings/CompanySettingsView.tsx
git commit -m "feat: add CompanySettingsView component"
```

---

## Task 5 : Page `/parametres`

**Files:**
- Modify: `src/app/parametres/page.tsx`

- [ ] **Step 1 : Lire la page existante**

```bash
cat src/app/parametres/page.tsx
```

- [ ] **Step 2 : Remplacer le contenu par le composant**

Si la page existe déjà, remplacer son contenu. Sinon la créer :

```tsx
// src/app/parametres/page.tsx
import CompanySettingsView from '@/components/settings/CompanySettingsView'

export default function ParametresPage() {
  return <CompanySettingsView />
}
```

- [ ] **Step 3 : Vérifier dans le navigateur**

Ouvrir `http://localhost:3000/parametres`. Expected : formulaire avec tous les champs pré-remplis depuis Supabase.

- [ ] **Step 4 : Commit**

```bash
git add src/app/parametres/page.tsx
git commit -m "feat: add company settings page"
```

---

## Task 6 : Mettre à jour `/api/devis/[id]/pdf` pour lire depuis Supabase

**Files:**
- Modify: `src/app/api/devis/[id]/pdf/route.ts`

- [ ] **Step 1 : Remplacer `getCompanyFromEnv()` par une lecture Supabase**

Remplacer le contenu complet du fichier `src/app/api/devis/[id]/pdf/route.ts` :

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePdfFromHtml, buildDevisHtml, type LigneDevis, type CompanyInfo } from '@/lib/apitemplate'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const company: CompanyInfo = settings ? {
    name:        settings.name,
    tagline:     settings.tagline,
    address:     settings.address,
    phone:       settings.phone,
    email:       settings.email,
    siret:       settings.siret,
    capital:     settings.capital,
    tvaIntra:    settings.tva_intra,
    assurance:   settings.assurance,
    brandColor:  settings.brand_color,
    accentColor: '#ffffff',
    logoSvg:     settings.logo_svg || null,
  } : {
    name: 'Soren', brandColor: '#d28e46', accentColor: '#ffffff',
  }

  const date   = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const lignes: LigneDevis[] = Array.isArray(devis.lignes) ? devis.lignes : []

  const html = buildDevisHtml({
    titre:           devis.titre,
    numero:          devis.numero,
    contactName:     devis.contact_name ?? 'Client',
    contactEmail:    devis.contact_email,
    contactPhone:    devis.contact_phone,
    contactAddress:  null,
    lignes,
    notes:           devis.notes,
    date,
    ville:           devis.ville,
    dateValidite:    devis.date_validite
      ? new Date(devis.date_validite).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null,
    adresseChantier: devis.adresse_chantier,
    company,
  })

  try {
    const pdfUrl = await generatePdfFromHtml(html)
    await supabase.from('devis').update({ pdf_url: pdfUrl, updated_at: new Date().toISOString() }).eq('id', params.id)
    return Response.json({ pdf_url: pdfUrl })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/devis/[id]/pdf/route.ts
git commit -m "feat: pdf route reads company_settings from Supabase"
```

---

## Task 7 : Mettre à jour `/api/devis/[id]/send` pour lire depuis Supabase

**Files:**
- Modify: `src/app/api/devis/[id]/send/route.ts`

- [ ] **Step 1 : Remplacer `getCompanyFromEnv()` par une lecture Supabase**

Remplacer le contenu complet du fichier `src/app/api/devis/[id]/send/route.ts` :

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'
import { generatePdfFromHtml, buildDevisHtml, type LigneDevis, type CompanyInfo } from '@/lib/apitemplate'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { channel, conversationId, contactId } = await req.json()
  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  const company: CompanyInfo = settings ? {
    name:        settings.name,
    tagline:     settings.tagline,
    address:     settings.address,
    phone:       settings.phone,
    email:       settings.email,
    siret:       settings.siret,
    capital:     settings.capital,
    tvaIntra:    settings.tva_intra,
    assurance:   settings.assurance,
    brandColor:  settings.brand_color,
    accentColor: '#ffffff',
    logoSvg:     settings.logo_svg || null,
  } : {
    name: 'Soren', brandColor: '#d28e46', accentColor: '#ffffff',
  }

  const ghlChannel: 'WhatsApp' | 'SMS' | 'Email' =
    channel === 'Email' ? 'Email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'

  const lignes: LigneDevis[] = Array.isArray(devis.lignes) ? devis.lignes : []
  const totalHT  = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const totalTVA = lignes.reduce((s, l) => s + (l.quantite * l.prixUnitaire * l.tvaRate / 100), 0)
  const totalTTC = totalHT + totalTVA

  let pdfUrl: string | null = devis.pdf_url ?? null
  try {
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const html = buildDevisHtml({
      titre:           devis.titre,
      numero:          devis.numero,
      contactName:     devis.contact_name ?? 'Client',
      contactEmail:    devis.contact_email,
      contactPhone:    devis.contact_phone,
      contactAddress:  null,
      lignes,
      notes:           devis.notes,
      date,
      ville:           devis.ville,
      dateValidite:    devis.date_validite
        ? new Date(devis.date_validite).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null,
      adresseChantier: devis.adresse_chantier,
      company,
    })
    pdfUrl = await generatePdfFromHtml(html)
  } catch (err) {
    console.error('[devis/send] PDF échoué:', err)
  }

  const fmtEUR = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  const message = [
    `📋 *${devis.titre}*`,
    lignes.length > 0 ? lignes.slice(0, 3).map((l: LigneDevis) => `• ${l.description}`).join('\n') : '',
    '',
    `💰 Total HT : ${fmtEUR(totalHT)}`,
    `💰 Total TTC : ${fmtEUR(totalTTC)}`,
    pdfUrl ? `\n📄 Devis PDF : ${pdfUrl}` : '',
    '\n_Devis valable 30 jours_',
  ].filter(Boolean).join('\n')

  await sendGHLMessage(conversationId, message, ghlChannel, devis.titre, contactId)

  await supabase.from('devis').update({
    statut:     'envoyé',
    envoye_le:  new Date().toISOString(),
    updated_at: new Date().toISOString(),
    montant_ht: totalHT || devis.montant_ht,
    pdf_url:    pdfUrl,
  }).eq('id', params.id)

  return Response.json({ ok: true, pdf_url: pdfUrl })
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
rtk tsc --noEmit
```
Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/app/api/devis/[id]/send/route.ts
git commit -m "feat: send route reads company_settings from Supabase"
```

---

## Task 8 : Synchroniser le script de démo avec `buildDevisHtml()`

**Files:**
- Modify: `src/lib/apitemplate.ts` (vérification finale)

- [ ] **Step 1 : Vérifier que le logo SVG s'affiche dans le header**

Dans `src/lib/apitemplate.ts`, vérifier que le bloc logo dans `buildDevisHtml()` ressemble à :

```ts
const logoBlock = params.company.logoSvg
  ? `<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${params.company.logoSvg}</div>`
  : `<div class="logo-house"></div>`
```

Et que dans le HTML du header, `<div class="logo-house"></div>` est remplacé par `${logoBlock}`.

- [ ] **Step 2 : Test end-to-end**

1. Aller sur `http://localhost:3000/parametres`
2. Renseigner les infos entreprise + coller un SVG logo
3. Cliquer "Sauvegarder"
4. Aller sur un devis existant → "Générer PDF"
5. Vérifier que le PDF généré contient le logo SVG et la bonne couleur brand

- [ ] **Step 3 : Commit final**

```bash
git add src/lib/apitemplate.ts
git commit -m "feat: company settings fully wired to devis PDF generation"
```
