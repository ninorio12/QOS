async function ghlFetch(path: string) {
  const apiKey   = process.env.GHL_API_KEY!
  const baseUrl  = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization:    `Bearer ${apiKey}`,
      Version:          '2021-07-28',
      'Content-Type':   'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GHL ${res.status}: ${path}`)
  return res.json()
}

function ghlLocationId() {
  return process.env.GHL_LOCATION_ID!
}

export async function getContacts(limit = 100) {
  const data = await ghlFetch(`/contacts/?locationId=${ghlLocationId()}&limit=${limit}`)
  return { contacts: (data.contacts ?? []) as GHLContact[], total: (data.meta?.total ?? 0) as number }
}

export async function getOpportunities(limit = 50, pipelineId?: string) {
  let url = `/opportunities/search?location_id=${ghlLocationId()}&limit=${limit}`
  if (pipelineId) url += `&pipeline_id=${pipelineId}`
  const data = await ghlFetch(url)
  return (data.opportunities ?? []) as GHLOpportunity[]
}

export async function getPipelines() {
  const data = await ghlFetch(`/opportunities/pipelines?locationId=${ghlLocationId()}`)
  return (data.pipelines ?? []) as GHLPipeline[]
}

export async function getConversations(limit = 50) {
  const data = await ghlFetch(`/conversations/search?locationId=${ghlLocationId()}&limit=${limit}`)
  return (data.conversations ?? []) as GHLConversation[]
}

export async function getCalendars() {
  const data = await ghlFetch(`/calendars/?locationId=${ghlLocationId()}`)
  return (data.calendars ?? []) as GHLCalendar[]
}

export async function getCalendarEvents(calendarId: string, startMs: number, endMs: number) {
  const data = await ghlFetch(
    `/calendars/events?calendarId=${calendarId}&startTime=${startMs}&endTime=${endMs}`
  )
  return (data.events ?? []) as GHLCalendarEvent[]
}

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

export type GHLOpportunity = {
  id: string
  name: string
  monetaryValue: number
  pipelineId: string
  pipelineStageId: string
  status: 'open' | 'won' | 'lost' | 'abandoned'
  createdAt: string
  updatedAt: string
  contact: { id: string; name: string; email: string | null; phone: string | null } | null
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
}
