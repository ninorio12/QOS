import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { isApiCallerAdmin, authedConvexClient } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

function convex() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL not set')
  return new ConvexHttpClient(url)
}

// Catalogue défini selon les besoins réels du Data OS (évolutif).
type Cat = {
  key: string; name: string; domain: string; description: string; category: string
  kind: 'core' | 'env' | 'manual'; envVars?: string[]; logo?: string
}
const CATALOG: Cat[] = [
  // Plateforme (cœur du Data OS)
  { key: 'convex',     name: 'Convex',      domain: 'convex.dev',     description: 'Base de données temps réel (source de vérité)', category: 'Plateforme', kind: 'core',  envVars: ['NEXT_PUBLIC_CONVEX_URL'] },
  { key: 'vercel',     name: 'Vercel',      domain: 'vercel.com',     description: 'Hébergement & déploiement',                     category: 'Plateforme', kind: 'core' },
  { key: 'supabase',   name: 'Supabase',    domain: 'supabase.com',   description: 'Authentification',                              category: 'Plateforme', kind: 'env',   envVars: ['NEXT_PUBLIC_SUPABASE_URL'] },
  { key: 'hermes',     name: 'Hermes Agent',domain: 'nousresearch.com', description: 'Agents & serveur MCP du Data OS (Nous Research)', category: 'Plateforme', kind: 'env',   envVars: ['HERMES_API_SECRET'], logo: 'https://www.google.com/s2/favicons?domain=nousresearch.com&sz=128' },
  // IA & réunions
  { key: 'anthropic',  name: 'Claude (Anthropic)', domain: 'anthropic.com', description: 'Modèles IA',                            category: 'IA & Réunions', kind: 'env', envVars: ['ANTHROPIC_API_KEY'], logo: 'https://cdn.simpleicons.org/claude/D97757' },
  { key: 'tldv',       name: 'tl;dv',       domain: 'tldv.io',        description: 'Enregistrements & transcripts de réunions',     category: 'IA & Réunions', kind: 'env', envVars: ['TLDV_API_KEY'] },
  { key: 'fathom',     name: 'Fathom',      domain: 'fathom.ai',      description: 'Enregistrements & transcripts de réunions',     category: 'IA & Réunions', kind: 'env', envVars: ['FATHOM_API_KEY'] },
  // Paiements
  { key: 'stripe',     name: 'Stripe',      domain: 'stripe.com',     description: 'Paiements & encaissements',                     category: 'Paiements', kind: 'manual', envVars: ['STRIPE_SECRET_KEY'] },
  // Communication
  { key: 'twilio',     name: 'Twilio',      domain: 'twilio.com',     description: 'SMS / WhatsApp',                                category: 'Communication', kind: 'manual', envVars: ['TWILIO_ACCOUNT_SID'] },
  { key: 'slack',      name: 'Slack',       domain: 'slack.com',      description: 'Canal agents & notifications',                  category: 'Communication', kind: 'manual', envVars: ['SLACK_BOT_TOKEN'] },
  { key: 'telegram',   name: 'Telegram',    domain: 'telegram.org',   description: 'Canal agents',                                  category: 'Communication', kind: 'manual', envVars: ['TELEGRAM_BOT_TOKEN'] },
  // CRM & données
  { key: 'ghl',        name: 'GoHighLevel', domain: 'gohighlevel.com',description: 'CRM (contacts, pipelines)',                     category: 'CRM & Données', kind: 'manual', envVars: ['GHL_API_KEY'] },
  { key: 'notion',     name: 'Notion',      domain: 'notion.so',      description: 'Bases & documents liés',                        category: 'CRM & Données', kind: 'manual', envVars: ['NOTION_API_KEY'] },
  { key: 'github',     name: 'GitHub',      domain: 'github.com',     description: 'Repositories',                                  category: 'CRM & Données', kind: 'manual', envVars: ['GITHUB_TOKEN'] },
  { key: 'lucidchart', name: 'Lucidchart',  domain: 'lucidchart.com', description: 'Diagrammes de process',                         category: 'CRM & Données', kind: 'manual' },
]

const envSet = (vars?: string[]) => !!vars?.some(v => !!process.env[v])

export async function GET() {
  let stored: { key: string; status: string; account: string; hasSecret: boolean }[] = []
  try { stored = await convex().query(api.integrations.list, {}) } catch { /* ignore */ }
  const map = new Map(stored.map(s => [s.key, s]))

  const items = CATALOG.map(c => {
    const s = map.get(c.key)
    const env = envSet(c.envVars)
    const connected = c.kind === 'core' ? true : (env || s?.status === 'connected')
    const source = c.kind === 'core' ? 'core' : (env ? 'env' : (s?.status === 'connected' ? 'manual' : 'none'))
    return {
      key: c.key, name: c.name, domain: c.domain, description: c.description, category: c.category,
      kind: c.kind, manageable: c.kind === 'manual', connected, source, logo: c.logo ?? '',
      account: s?.account ?? (env ? 'Configuré (env)' : ''),
    }
  })
  return NextResponse.json({ integrations: items })
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isApiCallerAdmin())) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 })
    const { key, secret, account } = await req.json()
    if (!CATALOG.find(c => c.key === key)) return NextResponse.json({ error: 'Unknown integration' }, { status: 400 })
    const convex = await authedConvexClient()
    await convex.mutation(api.integrations.connect, { key, secret, account })
    return NextResponse.json({ ok: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await isApiCallerAdmin())) return NextResponse.json({ error: 'Réservé aux administrateurs.' }, { status: 403 })
    const { key } = await req.json()
    const convex = await authedConvexClient()
    await convex.mutation(api.integrations.disconnect, { key })
    return NextResponse.json({ ok: true })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
