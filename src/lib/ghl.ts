import { unstable_cache } from 'next/cache'
import { env } from './env'

// ── Credentials GHL par organisation ─────────────────────────────────────────
export type GHLCreds = { apiKey: string; locationId: string }

function defaultCreds(): GHLCreds {
  return { apiKey: env.ghlApiKey(), locationId: env.ghlLocationId() }
}

// Fetch avec credentials explicites (pour les routes multi-tenant)
export async function ghlFetchWith(path: string, creds: GHLCreds) {
  const res = await fetch(`${env.ghlBaseUrl()}${path}`, {
    headers: {
      Authorization:    `Bearer ${creds.apiKey}`,
      Version:          '2021-07-28',
      'Content-Type':   'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL ${res.status}: ${path}`)
  return res.json()
}

// Fetch avec env vars (pour les fonctions cachées existantes)
async function ghlFetch(path: string) {
  return ghlFetchWith(path, defaultCreds())
}

export async function ghlMutate(path: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown) {
  const apiKey  = env.ghlApiKey()
  const baseUrl = env.ghlBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL ${method} ${res.status}: ${path} — ${await res.text()}`)
  return res.json()
}

function ghlLocationId() {
  return env.ghlLocationId()
}

// ── Version mutate avec credentials explicites ────────────────────────────────
export async function ghlMutateWith(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body: unknown,
  creds: GHLCreds
) {
  const res = await fetch(`${env.ghlBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${creds.apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL ${method} ${res.status}: ${path} — ${await res.text()}`)
  return res.json()
}

// ── Fonctions live (non cachées) pour le multi-tenant ─────────────────────────
// Usage : const contacts = await getContactsLive(100, ctx.ghlCreds())
export async function getContactsLive(limit = 100, creds?: GHLCreds) {
  const c = creds ?? defaultCreds()
  const data = await ghlFetchWith(`/contacts/?locationId=${c.locationId}&limit=${limit}`, c)
  return { contacts: (data.contacts ?? []) as GHLContact[], total: (data.meta?.total ?? 0) as number }
}

export async function getConversationsLive(limit = 100, creds?: GHLCreds) {
  const c = creds ?? defaultCreds()
  const data = await ghlFetchWith(`/conversations/?locationId=${c.locationId}&limit=${limit}`, c)
  return (data.conversations ?? []) as GHLConversation[]
}

export async function getOpportunitiesLive(limit = 50, pipelineId?: string, creds?: GHLCreds) {
  const c = creds ?? defaultCreds()
  let url = `/opportunities/search?location_id=${c.locationId}&limit=${limit}`
  if (pipelineId) url += `&pipeline_id=${pipelineId}`
  const data = await ghlFetchWith(url, c)
  return (data.opportunities ?? []) as GHLOpportunity[]
}

export async function getPipelinesLive(creds?: GHLCreds) {
  const c = creds ?? defaultCreds()
  const data = await ghlFetchWith(`/opportunities/pipelines?locationId=${c.locationId}`, c)
  return (data.pipelines ?? []) as GHLPipeline[]
}

export const getContacts = unstable_cache(
  async (limit = 100) => {
    const data = await ghlFetch(`/contacts/?locationId=${ghlLocationId()}&limit=${limit}`)
    return { contacts: (data.contacts ?? []) as GHLContact[], total: (data.meta?.total ?? 0) as number }
  },
  ['ghl-contacts'],
  { revalidate: 120, tags: ['ghl-contacts'] }
)

export const getOpportunities = unstable_cache(
  async (limit = 50, pipelineId?: string) => {
    let url = `/opportunities/search?location_id=${ghlLocationId()}&limit=${limit}`
    if (pipelineId) url += `&pipeline_id=${pipelineId}`
    const data = await ghlFetch(url)
    return (data.opportunities ?? []) as GHLOpportunity[]
  },
  ['ghl-opportunities'],
  { revalidate: 120, tags: ['ghl-opportunities'] }
)

export const getUsers = unstable_cache(
  async () => {
    const data = await ghlFetch(`/users/?locationId=${ghlLocationId()}`)
    return (data.users ?? []) as GHLUser[]
  },
  ['ghl-users'],
  { revalidate: 3600, tags: ['ghl-users'] }
)

export const getPipelines = unstable_cache(
  async () => {
    const data = await ghlFetch(`/opportunities/pipelines?locationId=${ghlLocationId()}`)
    return (data.pipelines ?? []) as GHLPipeline[]
  },
  ['ghl-pipelines'],
  { revalidate: 600, tags: ['ghl-pipelines'] }
)

export const getConversations = unstable_cache(
  async (limit = 50) => {
    const data = await ghlFetch(`/conversations/search?locationId=${ghlLocationId()}&limit=${limit}`)
    return (data.conversations ?? []) as GHLConversation[]
  },
  ['ghl-conversations'],
  { revalidate: 60, tags: ['ghl-conversations'] }
)

export async function sendGHLMessage(
  conversationId: string,
  message: string,
  type: 'WhatsApp' | 'SMS' | 'Email',
  subject?: string,
  contactId?: string,
) {
  const apiKey  = process.env.GHL_API_KEY!
  const baseUrl = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

  const payload: Record<string, string> = {
    type,
    conversationId,
    message,
  }
  if (subject)   payload.subject   = subject
  if (contactId) payload.contactId = contactId

  const res = await fetch(`${baseUrl}/conversations/messages`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      Version:        '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL sendMessage ${res.status}: ${await res.text()}`)
  return res.json()
}

export const getCalendars = unstable_cache(
  async () => {
    const data = await ghlFetch(`/calendars/?locationId=${ghlLocationId()}`)
    return (data.calendars ?? []) as GHLCalendar[]
  },
  ['ghl-calendars'],
  { revalidate: 300, tags: ['ghl-calendars'] }
)

export type GHLMessage = {
  id:          string
  body:        string
  direction:   'inbound' | 'outbound'
  dateAdded:   string
  source?:     string
  contentType?: string
}

export async function getConversationMessages(conversationId: string, limit = 40): Promise<GHLMessage[]> {
  try {
    const data = await ghlFetch(`/conversations/${conversationId}/messages?limit=${limit}`)
    return (data.messages ?? []) as GHLMessage[]
  } catch {
    return []
  }
}

export const getCalendarEvents = unstable_cache(
  async (calendarId: string, startMs: number, endMs: number) => {
    const data = await ghlFetch(
      `/calendars/events?calendarId=${calendarId}&startTime=${startMs}&endTime=${endMs}`
    )
    return (data.events ?? []) as GHLCalendarEvent[]
  },
  ['ghl-calendar-events'],
  { revalidate: 60, tags: ['ghl-calendar-events'] }
)

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
  // Extended GHL fields
  source?:        string | null
  assignedTo?:    string | null
  address1?:      string | null
  city?:          string | null
  state?:         string | null
  postalCode?:    string | null
  country?:       string | null
  website?:       string | null
  customFields?:  { id: string; value: string | null }[]
  dnd?:           boolean
  type?:          string | null
}

export type GHLUser = {
  id:        string
  name:      string
  firstName: string | null
  lastName:  string | null
  email:     string
}

export type GHLOpportunity = {
  id: string
  name: string
  monetaryValue: number
  pipelineId: string
  pipelineStageId: string
  assignedTo?: string | null
  status: 'open' | 'won' | 'lost' | 'abandoned'
  source?: string | null
  createdAt: string
  updatedAt: string
  contact: { id: string; name: string; email: string | null; phone: string | null; tags?: string[] } | null
}

export type GHLPipelineStage = {
  id: string
  name: string
  position: number
  stageWinProbability: number
}

export type GHLPipeline = {
  id: string
  name: string
  stages: GHLPipelineStage[]
}

export type GHLCalendar = {
  id: string
  name: string
  isActive: boolean
  slotDuration: number
  eventColor: string
}

export type GHLCalendarEvent = {
  id: string
  calendarId: string
  contactId: string | null
  title: string
  startTime: string // ISO or Unix ms
  endTime: string
  status: string
  notes: string | null
  contactName?: string
}

export type GHLConversation = {
  id: string
  contactId: string
  contactName: string | null
  fullName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  type: string
  unreadCount: number
  lastMessageDate: number | null  // Unix ms timestamp
  dateAdded: number               // Unix ms timestamp
  dateUpdated: number             // Unix ms timestamp
  assignedTo?: string | null
}

export type GHLWorkflowAction = {
  id:          string
  type:        string
  name?:       string
}

export type GHLWorkflowTrigger = {
  type:        string
  filters?:    Record<string, unknown>[]
}

export type GHLWorkflow = {
  id:          string
  name:        string
  status:      'published' | 'draft'
  createdAt:   string
  updatedAt:   string
  description?: string
  triggers?:   GHLWorkflowTrigger[]
  actions?:    GHLWorkflowAction[]
}

export const getWorkflows = unstable_cache(
  async () => {
    const data = await ghlFetch(`/workflows/?locationId=${ghlLocationId()}`)
    return (data.workflows ?? []) as GHLWorkflow[]
  },
  ['ghl-workflows'],
  { revalidate: 300, tags: ['ghl-workflows'] }
)

// ── Création contact + opportunité (flow acquisition) ────────────────────────

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
