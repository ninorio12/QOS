import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const META_API_VERSION = 'v21.0'

function convex(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// ─── GET : vérification du Webhook Meta ────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ─── POST : réception d'un lead Meta (leadgen) → Data OS (Convex) ──
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Vérification de signature HMAC si META_APP_SECRET configuré
    const appSecret = process.env.META_APP_SECRET
    if (appSecret) {
      const signature = req.headers.get('x-hub-signature-256') ?? ''
      const expected  = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
      if (signature !== expected) {
        console.warn('[Meta] Signature invalide')
        return new Response('Forbidden', { status: 403 })
      }
    }

    const body = JSON.parse(rawBody)
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue
        await processMetaLead(change.value)
      }
    }
    return new Response('EVENT_RECEIVED', { status: 200 })
  } catch (err) {
    console.error('[Meta] Erreur webhook:', err)
    // On répond 200 pour éviter les re-livraisons en boucle de Meta
    return new Response('EVENT_RECEIVED', { status: 200 })
  }
}

// Récupère les champs du formulaire via la Graph API si absents du payload.
async function fetchLeadFields(leadgenId: string): Promise<{ name: string; values: string[] }[]> {
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!accessToken) return []
  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${leadgenId}?fields=field_data&access_token=${encodeURIComponent(accessToken)}`
    const res  = await fetch(url)
    const data = await res.json() as { field_data?: { name: string; values: string[] }[] }
    return data.field_data ?? []
  } catch (err) {
    console.error('[Meta] Erreur Graph API:', err)
    return []
  }
}

async function processMetaLead(leadData: {
  leadgen_id?: string; page_id?: string; form_id?: string
  field_data?: { name: string; values: string[] }[]; created_time?: number
}) {
  // field_data du payload, sinon via Graph API
  let raw = leadData.field_data ?? []
  if (raw.length === 0 && leadData.leadgen_id) raw = await fetchLeadFields(leadData.leadgen_id)

  const f: Record<string, string> = {}
  for (const field of raw) f[field.name?.toLowerCase()] = field.values?.[0] ?? ''

  const pick = (...keys: string[]) => { for (const k of keys) if (f[k]) return f[k]; return undefined }
  const fullName = pick('full_name', 'nom_complet')
  const firstName = pick('first_name', 'prénom', 'prenom') ?? fullName?.split(' ')[0] ?? 'Prospect'
  const lastName  = pick('last_name', 'nom') ?? (fullName ? fullName.split(' ').slice(1).join(' ') || undefined : undefined)
  const email     = pick('email', 'e-mail', 'courriel')
  const phone     = pick('phone_number', 'téléphone', 'telephone', 'phone')
  const company   = pick('company_name', 'company', 'entreprise', 'société', 'societe')

  // Toutes les réponses du formulaire conservées en notes.
  const answers = Object.entries(f).map(([k, val]) => `  ${k}: ${val}`).join('\n')
  const notes = [
    'Lead entrant via formulaire Meta Ads.',
    leadData.page_id ? `Page : ${leadData.page_id}` : '',
    leadData.form_id ? `Formulaire : ${leadData.form_id}` : '',
    leadData.leadgen_id ? `Lead ID : ${leadData.leadgen_id}` : '',
    answers ? `\nRéponses :\n${answers}` : '',
  ].filter(Boolean).join('\n')

  await convex().mutation(api.crm_contacts.ingestInboundLead, {
    firstName, lastName, email, phone, companyName: company,
    notes, tags: ['Meta Ads'], temperature: 'tiede', createdBy: 'agent:meta-ads',
  })

  console.log(`[Meta] Lead inbound ingéré : ${firstName} ${lastName ?? ''} (${email ?? phone ?? 'sans contact'})`)
}
