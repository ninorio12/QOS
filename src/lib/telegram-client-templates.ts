/**
 * Templates et contexte pour le bot client Telegram (mode soren-client)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientVars = {
  first_name?:   string
  project_type?: string
  city?:         string
  budget_range?: string
  next_slot_1?:  string
  next_slot_2?:  string
  company_name?: string
}

// ── Fallbacks ─────────────────────────────────────────────────────────────────

const FALLBACKS: Required<ClientVars> = {
  first_name:   'Bonjour',
  project_type: 'votre projet',
  city:         'votre secteur',
  budget_range: 'à définir',
  next_slot_1:  'un créneau disponible',
  next_slot_2:  'un autre créneau',
  company_name: 'notre équipe',
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, string> = {
  welcome_new_lead:
    'Bonjour {{first_name}} 👋\nJe suis Lucie, l\'assistante de {{company_name}}.\nJ\'ai bien reçu votre demande pour {{project_type}} à {{city}}.\nJe vous aide à avancer rapidement.',

  qualification_project:
    'Pour bien vous orienter, vous visez plutôt quel type de travaux exactement pour {{project_type}} ?',

  qualification_budget:
    'Parfait 👍\nPour vous proposer la meilleure option, vous êtes plutôt sur quel budget approximatif ?\n({{budget_range}} ou "je ne sais pas encore")',

  qualification_timeline:
    'Merci 🙏\nVous souhaitez démarrer ces travaux à quel horizon :\nrapidement, sous 1 mois, ou plus tard ?',

  rdv_offer_two_slots:
    'Top, j\'ai ce qu\'il faut.\nJe peux vous proposer :\n• {{next_slot_1}}\n• {{next_slot_2}}\nLequel vous convient le mieux ?',

  rdv_confirmed:
    'Parfait {{first_name}} ✅\nVotre rendez-vous est confirmé pour {{next_slot_1}}.\nJe vous envoie un rappel avant le créneau.',

  no_show_plus_24h:
    'Bonjour {{first_name}}, petit message suite au rendez-vous d\'hier.\nJe peux vous reproposer un créneau rapidement pour {{project_type}} à {{city}}.\nVous préférez que je vous envoie 2 nouvelles disponibilités ?',

  quote_pending_human_validation:
    'Bonjour {{first_name}} ✅\nVotre devis pour {{project_type}} est prêt.\nIl passe en validation finale par notre équipe avant envoi.\nJe vous l\'envoie dès validation.',

  quote_sent:
    'Bonjour {{first_name}}, votre devis est envoyé 📩\nDites-moi si vous voulez qu\'on le revoie ensemble point par point (2 min).',

  post_work_followup:
    'Bonjour {{first_name}} 👋\nJ\'espère que tout s\'est bien passé pour vos travaux.\nSi vous êtes satisfait, je peux vous envoyer le lien pour laisser un avis rapide.',
}

// ── Renderer ──────────────────────────────────────────────────────────────────

export function renderTemplate(name: string, vars: ClientVars): string {
  const tpl = TEMPLATES[name]
  if (!tpl) return ''
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const k = key as keyof ClientVars
    return vars[k] ?? FALLBACKS[k] ?? key
  })
}

// ── Contexte GHL (best-effort) ────────────────────────────────────────────────

type GHLContactResult = {
  firstName?: string
  customFields?: Array<{ fieldKey: string; value: string }>
  tags?: string[]
}

async function fetchGHLContactByName(firstName: string): Promise<GHLContactResult | null> {
  const key      = process.env.GHL_API_KEY
  const location = process.env.GHL_LOCATION_ID
  if (!key || !location) return null
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${location}&query=${encodeURIComponent(firstName)}&limit=1`,
      {
        headers: { Authorization: `Bearer ${key}`, Version: '2021-07-28' },
        signal:  AbortSignal.timeout(3000),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { contacts?: GHLContactResult[] }
    return data.contacts?.[0] ?? null
  } catch {
    return null
  }
}

function extractCustomField(contact: GHLContactResult, key: string): string | undefined {
  return contact.customFields?.find(f => f.fieldKey === key)?.value || undefined
}

// ── Builder principal ─────────────────────────────────────────────────────────

export async function buildClientContext(tgFirstName: string): Promise<ClientVars> {
  const vars: ClientVars = {
    first_name:   tgFirstName || undefined,
    company_name: process.env.CLIENT_COMPANY_NAME || 'notre équipe',
  }

  // Lookup GHL best-effort
  if (tgFirstName) {
    const contact = await fetchGHLContactByName(tgFirstName)
    if (contact) {
      vars.first_name   = contact.firstName || vars.first_name
      vars.project_type = extractCustomField(contact, 'project_type')
                       ?? extractCustomField(contact, 'type_travaux')
      vars.city         = extractCustomField(contact, 'city')
                       ?? extractCustomField(contact, 'ville')
      vars.budget_range = extractCustomField(contact, 'budget')
                       ?? extractCustomField(contact, 'budget_range')
    }
  }

  return vars
}

// ── System prompt client enrichi ──────────────────────────────────────────────

export function buildClientSystemPrefix(vars: ClientVars): string {
  const resolve = (k: keyof ClientVars) => vars[k] ?? FALLBACKS[k]

  return [
    '[CONTEXTE INTERNE — ne pas mentionner]',
    'Mode client activé. Tu es Lucie, assistante commerciale simple et chaleureuse.',
    `Prénom client : ${resolve('first_name')}`,
    `Projet : ${resolve('project_type')}`,
    `Ville : ${resolve('city')}`,
    vars.budget_range ? `Budget : ${vars.budget_range}` : null,
    'Règles : max 4 lignes, 1 question par message, toujours un CTA clair.',
    'Refuses poliment les questions sur le debug, les ops, l\'infra ou les données sensibles.',
    '\nMessage client :',
  ].filter(Boolean).join('\n')
}
