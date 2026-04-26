# Devis Email Resend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer le devis par vrai email (PDF en pièce jointe + lien de signature) via Resend, en plus du canal WhatsApp existant.

**Architecture:** On ajoute un paramètre `channel` au endpoint signature existant (`POST /api/devis/[id]/signature`). Si `channel === 'email'`, on envoie via Resend avec le PDF attaché et le lien signature. L'UI `SignatureSection` affiche deux boutons côte à côte : WhatsApp (existant) et Email (nouveau, conditionnel à `contact_email`).

**Tech Stack:** `resend` npm package, Next.js App Router, Supabase, `generatePdfFromHtml` (apitemplate existant)

---

## File Map

| Fichier | Action |
|---|---|
| `src/lib/resend.ts` | Créer — helper `sendDevisEmail()` |
| `src/app/api/devis/[id]/signature/route.ts` | Modifier — lire `channel`, brancher email/whatsapp |
| `src/components/devis/SignatureSection.tsx` | Modifier — deux boutons WhatsApp + Email |
| `.env.local` | Modifier — ajouter `RESEND_API_KEY` et `RESEND_FROM_EMAIL` |

---

## Task 1 : Installer Resend et configurer les variables d'env

**Files:**
- Modify: `.env.local`

- [ ] **Step 1 : Installer le package**

```bash
cd C:/Users/thoma/qos && npm install resend
```

Expected: `added 1 package`

- [ ] **Step 2 : Ajouter les vars dans `.env.local`**

Ajouter ces deux lignes à la fin du fichier `.env.local` :

```
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXX
RESEND_FROM_EMAIL=onboarding@resend.dev
```

> Note : `onboarding@resend.dev` fonctionne sans domaine vérifié pour les tests. Pour la prod, remplacer par `devis@votredomaine.com` après vérification dans le dashboard Resend.
> L'API key s'obtient sur resend.com → API Keys → Create API Key.

- [ ] **Step 3 : Commit**

```bash
rtk git add package.json package-lock.json && rtk git commit -m "feat: install resend for email sending"
```

---

## Task 2 : Créer le helper `sendDevisEmail`

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1 : Créer `src/lib/resend.ts`**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendDevisEmailParams {
  to:            string
  contactName:   string | null
  devisNumero:   string | null
  devisTitre:    string
  montantHT:     number
  montantTTC:    number
  signatureUrl:  string
  pdfUrl:        string | null
  companyName:   string
  companyEmail:  string
  brandColor:    string
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function buildEmailHtml(p: SendDevisEmailParams): string {
  const greeting = p.contactName ? `Bonjour ${p.contactName},` : 'Bonjour,'
  const ref = p.devisNumero ? `Devis n°${p.devisNumero}` : 'Votre devis'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${ref} — ${p.devisTitre}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:${p.brandColor};padding:28px 36px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#111111;text-transform:uppercase;letter-spacing:1px;">${p.companyName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Veuillez trouver ci-joint votre <strong>${ref}</strong> intitulé <strong>${p.devisTitre}</strong>,
                prêt à être signé électroniquement.
              </p>

              <!-- Montants -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-right:1px solid #e5e7eb;" align="center">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;">Total HT</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#111111;">${fmtEUR(p.montantHT)}</p>
                  </td>
                  <td style="padding:16px 20px;" align="center">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;">Total TTC</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#111111;">${fmtEUR(p.montantTTC)}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${p.signatureUrl}"
                       style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:.3px;">
                      ✍️ Signer mon devis
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
                Ou copiez ce lien dans votre navigateur :<br/>
                <a href="${p.signatureUrl}" style="color:#3462EE;font-size:11px;word-break:break-all;">${p.signatureUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                ${p.companyName}${p.companyEmail ? ` · <a href="mailto:${p.companyEmail}" style="color:#9ca3af;">${p.companyEmail}</a>` : ''}
                <br/>Ce devis est valable 30 jours à compter de sa date d'émission.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendDevisEmail(params: SendDevisEmailParams): Promise<void> {
  const html = buildEmailHtml(params)

  // Télécharger le PDF pour l'attacher
  const attachments: { filename: string; content: Buffer }[] = []
  if (params.pdfUrl) {
    try {
      const res = await fetch(params.pdfUrl)
      if (res.ok) {
        const buffer = await res.arrayBuffer()
        const label = params.devisNumero
          ? `Devis-${params.devisNumero}`
          : `Devis-${params.devisTitre.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_')}`
        attachments.push({ filename: `${label}.pdf`, content: Buffer.from(buffer) })
      }
    } catch {
      // PDF non disponible — on envoie quand même l'email sans pièce jointe
    }
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const subject = params.devisNumero
    ? `Votre devis n°${params.devisNumero} — ${params.devisTitre}`
    : `Votre devis — ${params.devisTitre}`

  await resend.emails.send({
    from,
    to: params.to,
    subject,
    html,
    ...(attachments.length > 0 ? { attachments } : {}),
  })
}
```

- [ ] **Step 2 : Vérifier que TypeScript ne lève pas d'erreur**

```bash
cd C:/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur sur `src/lib/resend.ts`

- [ ] **Step 3 : Commit**

```bash
rtk git add src/lib/resend.ts && rtk git commit -m "feat: add sendDevisEmail helper via Resend"
```

---

## Task 3 : Modifier l'endpoint `/api/devis/[id]/signature`

**Files:**
- Modify: `src/app/api/devis/[id]/signature/route.ts`

Le fichier actuel génère un token, le sauvegarde en DB, et envoie un WhatsApp si `conversation_id` et `contact_id` sont présents. On ajoute le paramètre `channel` pour brancher email ou whatsapp.

- [ ] **Step 1 : Réécrire `src/app/api/devis/[id]/signature/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGHLMessage } from '@/lib/ghl'
import { sendDevisEmail } from '@/lib/resend'
import { generatePdfFromHtml } from '@/lib/apitemplate'
import { buildDevisHtml } from '@/lib/devisHtmlBuilder'
import type { CompanyForTemplate } from '@/components/devis/DevisTemplateStatic'

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({})) as { channel?: string }
  const channel = body.channel === 'email' ? 'email' : 'whatsapp'

  const supabase = await createClient()

  const [{ data: devis }, { data: settings }] = await Promise.all([
    supabase.from('devis').select('*').eq('id', params.id).single(),
    supabase.from('company_settings').select('*').single(),
  ])

  if (!devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  // Générer un token si nécessaire (ou réutiliser l'existant pour renvoyer)
  const token = devis.signature_token ?? generateToken()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const signatureUrl = `${appUrl}/api/devis/signature/${token}`

  await supabase
    .from('devis')
    .update({
      signature_token:  token,
      signature_statut: 'envoye',
      updated_at:       new Date().toISOString(),
    })
    .eq('id', params.id)

  if (channel === 'email') {
    // Vérifier qu'un email contact existe
    if (!devis.contact_email) {
      return Response.json({ error: 'Aucun email contact renseigné sur ce devis' }, { status: 422 })
    }

    // Générer le PDF si pas encore disponible
    let pdfUrl: string | null = devis.pdf_url ?? null
    if (!pdfUrl) {
      try {
        const svgRaw: string | null = settings?.logo_svg ?? null
        const logoBase64 = svgRaw ? Buffer.from(svgRaw).toString('base64') : null
        const company: CompanyForTemplate = settings ? {
          name:       settings.name       ?? 'Mon Entreprise',
          tagline:    settings.tagline    ?? '',
          address:    settings.address    ?? '',
          phone:      settings.phone      ?? '',
          email:      settings.email      ?? '',
          logoBase64,
          capital:    settings.capital    ?? '',
          siret:      settings.siret      ?? '',
          tvaIntra:   settings.tva_intra  ?? '',
          assurance:  settings.assurance  ?? '',
          brandColor: settings.brand_color ?? '#111111',
        } : {
          name: 'Mon Entreprise', tagline: '', address: '', phone: '', email: '',
          logoBase64: null, capital: '', siret: '', tvaIntra: '', assurance: '',
          brandColor: '#111111',
        }

        const lignes = Array.isArray(devis.lignes) ? devis.lignes : []
        const html = buildDevisHtml({
          numero:          devis.numero       ?? null,
          titre:           devis.titre        ?? '',
          lignes,
          notes:           devis.notes        ?? '',
          ville:           devis.ville        ?? '',
          dateValidite:    devis.date_validite ?? '',
          adresseChantier: devis.adresse_chantier ?? '',
          contactName:     devis.contact_name ?? null,
          adresseClient:   devis.adresse_client ?? '',
          createdAt:       devis.created_at   ?? '',
        }, company)

        pdfUrl = await generatePdfFromHtml(html)
        // Sauvegarder le pdf_url généré
        await supabase.from('devis').update({ pdf_url: pdfUrl }).eq('id', params.id)
      } catch {
        // PDF non généré — on continue sans pièce jointe
      }
    }

    const lignes = Array.isArray(devis.lignes) ? devis.lignes as { quantite: number; prixUnitaire: number; tvaRate: number }[] : []
    const montantHT  = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
    const montantTTC = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire * (1 + l.tvaRate / 100), 0)

    await sendDevisEmail({
      to:           devis.contact_email,
      contactName:  devis.contact_name  ?? null,
      devisNumero:  devis.numero        ?? null,
      devisTitre:   devis.titre         ?? '',
      montantHT:    montantHT > 0 ? montantHT : (devis.montant_ht ?? 0),
      montantTTC:   montantTTC > 0 ? montantTTC : (devis.montant_ht ?? 0) * 1.2,
      signatureUrl,
      pdfUrl,
      companyName:  settings?.name       ?? 'Mon Entreprise',
      companyEmail: settings?.email      ?? '',
      brandColor:   settings?.brand_color ?? '#111111',
    })

    return Response.json({ signature_url: signatureUrl, token, channel: 'email' })
  }

  // Canal WhatsApp (comportement original)
  if (devis.conversation_id && devis.contact_id) {
    const message = `Bonjour${devis.contact_name ? ` ${devis.contact_name}` : ''},\n\nVotre devis ${devis.numero ?? ''} est prêt à être signé électroniquement :\n${signatureUrl}\n\nCordialement,\nL'équipe`
    await sendGHLMessage(
      devis.conversation_id,
      message,
      'WhatsApp',
      undefined,
      devis.contact_id,
    ).catch(() => null)
  }

  return Response.json({ signature_url: signatureUrl, token, channel: 'whatsapp' })
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected : pas d'erreur sur ce fichier

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/api/devis/[id]/signature/route.ts && rtk git commit -m "feat: add email channel to signature endpoint"
```

---

## Task 4 : Modifier `SignatureSection` — deux boutons

**Files:**
- Modify: `src/components/devis/SignatureSection.tsx`

Le composant reçoit déjà `contactEmail`. On ajoute un état `loadingChannel` pour gérer les deux spinners indépendants, et on sépare les deux boutons.

- [ ] **Step 1 : Réécrire `src/components/devis/SignatureSection.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Mail, MessageCircle } from 'lucide-react'

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
  { key: 'created', label: 'Créé'   },
  { key: 'envoye',  label: 'Envoyé' },
  { key: 'vu',      label: 'Vu'     },
  { key: 'signe',   label: 'Signé'  },
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
  const [loadingChannel, setLoadingChannel] = useState<'whatsapp' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const badge = badgeLabel(statut)
  const done  = stepIndex(statut)

  async function handleEnvoyer(channel: 'whatsapp' | 'email') {
    setLoadingChannel(channel)
    setError(null)
    try {
      const res = await fetch(`/api/devis/${devisId}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      onStatutChange('envoye')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoadingChannel(null)
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

      {/* Info */}
      {error && <p className="text-[11px] text-red-600 mb-2">{error}</p>}

      <div className="bg-[#f9f9f7] rounded-xl px-3 py-2.5 mb-3">
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

      {/* Boutons d'envoi */}
      {statut !== 'signe' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleEnvoyer('whatsapp')}
            disabled={loadingChannel !== null}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#111] text-white rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 font-jakarta"
          >
            {loadingChannel === 'whatsapp'
              ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <MessageCircle size={11} />
            }
            WhatsApp
          </button>

          {contactEmail && (
            <button
              onClick={() => handleEnvoyer('email')}
              disabled={loadingChannel !== null}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#EEF3FF] text-[#3462EE] rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:bg-[#dce8ff] transition-colors disabled:opacity-40 font-jakarta"
            >
              {loadingChannel === 'email'
                ? <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Mail size={11} />
              }
              Email
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : aucune erreur

- [ ] **Step 3 : Tester visuellement**

Ouvrir un devis avec un `contact_email` renseigné → vérifier que deux boutons apparaissent (WhatsApp + Email).
Ouvrir un devis sans email → vérifier qu'un seul bouton WhatsApp apparaît.

- [ ] **Step 4 : Commit final**

```bash
rtk git add src/components/devis/SignatureSection.tsx && rtk git commit -m "feat: devis email sending via Resend with PDF attachment"
```
