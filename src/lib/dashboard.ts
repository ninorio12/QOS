import { getContactsLive, getOpportunitiesLive, getPipelinesLive, getCalendars, getCalendarEvents, type GHLOpportunity, type GHLCreds } from './ghl'

// Strip emojis from stage names like "🔥 Qualifié" → "Qualifié"
function cleanStageName(name: string) {
  return name.replace(/^[^\w\d\s']+\s*/, '').trim()
}

const STAGE_COLORS: Record<string, string> = {
  'Nouveau Lead':    '#3D4F6B',
  '1er Contact IA':  '#4A91A8',
  'En Conversation': '#3462EE',
  'Qualifié':        '#FF4D00',
  'RDV Booké':       '#EFE347',
  'Non Qualifié':    '#8896AB',
  'Sans Réponse':    '#EC4899',
  'Perdu':           '#EF4444',
}

const CARD_COLORS = [
  { color: '#3462EE', textColor: 'white' },
  { color: '#EFE347', textColor: '#121721' },
  { color: '#4A91A8', textColor: 'white' },
  { color: '#1A2235', textColor: 'white' },
]

export type FunnelStage = {
  label: string
  count: number
  value: number
  color: string
  pct: number
}

export type RecentOpp = {
  id: string
  contactName: string
  value: number
  stage: string
  tag: string
  date: string
  color: string
  textColor: string
}

export type DashboardMetrics = {
  totalContacts: number
  pipelineValue: number
  activeDeals: number
  wonDeals: number
  totalDeals: number
}

export type FeaturedContact = {
  name: string
  email: string
  phone: string
  initials: string
}

export type WeeklyDay = {
  day: string
  leads: number
  booked: number
  rdv: number
}

export type MonthlyPoint = {
  month: string
  value: number
}

export type ClientTimelinePoint = {
  date: string
  value: number
}

export type MetierBreakdown = {
  label: string
  count: number
  pct: number
  color: string
}

export type Payment = {
  date: string
  client: string
  entreprise: string
  montant: number
  description: string
  statut: string
}

export type DashboardData = {
  metrics: DashboardMetrics
  funnel: FunnelStage[]
  recentOpps: RecentOpp[]
  featuredContact: FeaturedContact | null
  weeklyBreakdown: WeeklyDay[]
  monthlyPipeline: MonthlyPoint[]
  clientTimeline: ClientTimelinePoint[]
  metierBreakdown: MetierBreakdown[]
  payments: Payment[]
  wonCA: number
}

const METIER_COLORS = ['#FF4D00', '#3462EE', '#22c55e', '#EFE347', '#4A91A8', '#EC4899', '#8896AB']

const EMPTY_DATA: DashboardData = {
  metrics: { totalContacts: 0, pipelineValue: 0, activeDeals: 0, wonDeals: 0, totalDeals: 0 },
  funnel: [], recentOpps: [], featuredContact: null, weeklyBreakdown: [], monthlyPipeline: [],
  clientTimeline: [], metierBreakdown: [], payments: [], wonCA: 0,
}

export async function getDashboardData(creds?: GHLCreds): Promise<DashboardData> {
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)

  const [contactsResult, oppsResult, pipelinesResult, calendarsResult] = await Promise.allSettled([
    getContactsLive(10, creds),
    getOpportunitiesLive(100, undefined, creds),
    getPipelinesLive(creds),
    getCalendars(),
  ])

  const { contacts = [], total = 0 } = contactsResult.status === 'fulfilled' ? contactsResult.value : {}
  const rawOpportunities = oppsResult.status === 'fulfilled' ? (oppsResult.value ?? []) : []
  const pipelines        = pipelinesResult.status === 'fulfilled' ? (pipelinesResult.value ?? []) : []
  const calendars        = calendarsResult.status === 'fulfilled' ? (calendarsResult.value ?? []) : []

  if (contactsResult.status === 'rejected')  console.error('[Dashboard] getContactsLive failed',    contactsResult.reason)
  if (oppsResult.status === 'rejected')      console.error('[Dashboard] getOpportunitiesLive failed', oppsResult.reason)
  if (pipelinesResult.status === 'rejected') console.error('[Dashboard] getPipelinesLive failed',    pipelinesResult.reason)
  if (calendarsResult.status === 'rejected') console.error('[Dashboard] getCalendars failed',        calendarsResult.reason)

  const calendarEvents = calendars.length > 0
    ? (await Promise.allSettled(
        calendars.map(c => getCalendarEvents(c.id, sevenDaysAgo.getTime(), tomorrow.getTime()))
      )).flatMap(r => r.status === 'fulfilled' ? r.value : [])
    : []

  const opportunities = rawOpportunities

  // Use first pipeline (ACQUISITION)
  const pipeline = pipelines[0]
  const stages = pipeline?.stages ?? []

  // Build stage lookup by id
  const stageById: Record<string, { name: string; position: number; color: string }> = {}
  stages.forEach(s => {
    const clean = cleanStageName(s.name)
    stageById[s.id] = { name: clean, position: s.position, color: STAGE_COLORS[clean] ?? '#3D4F6B' }
  })

  // Accumulate per stage
  const stageCounts: Record<string, { count: number; value: number }> = {}
  stages.forEach(s => { stageCounts[s.id] = { count: 0, value: 0 } })

  const pipelineOpps = opportunities.filter(o => o.pipelineId === pipeline?.id)
  pipelineOpps.forEach(o => {
    if (stageCounts[o.pipelineStageId]) {
      stageCounts[o.pipelineStageId].count++
      stageCounts[o.pipelineStageId].value += o.monetaryValue ?? 0
    }
  })

  const maxCount = Math.max(...Object.values(stageCounts).map(s => s.count), 1)

  const HIDDEN = ['Non Qualifié', 'Sans Réponse', 'Perdu']
  const funnel: FunnelStage[] = stages
    .filter(s => !HIDDEN.includes(cleanStageName(s.name)))
    .sort((a, b) => a.position - b.position)
    .map(s => {
      const counts = stageCounts[s.id] ?? { count: 0, value: 0 }
      const clean = cleanStageName(s.name)
      return {
        label: clean,
        count: counts.count,
        value: counts.value,
        color: STAGE_COLORS[clean] ?? '#3D4F6B',
        pct: counts.count > 0 ? Math.max(Math.round((counts.count / maxCount) * 100), 12) : 4,
      }
    })

  const recentOpps: RecentOpp[] = [...opportunities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((o, i) => {
      const card = CARD_COLORS[i % CARD_COLORS.length]
      const stageName = stageById[o.pipelineStageId]?.name ?? 'Lead'
      return {
        id: o.id,
        contactName: o.contact?.name ?? o.name,
        value: o.monetaryValue ?? 0,
        stage: stageName,
        tag: stageName,
        date: new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        color: card.color,
        textColor: card.textColor,
      }
    })

  let featuredContact: FeaturedContact | null = null
  const properContact = contacts.find(c => {
    const fullName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
    return fullName.includes(' ') || (c.contactName && !c.contactName.includes('@'))
  }) ?? contacts[0]
  if (properContact) {
    const fullName = `${properContact.firstName ?? ''} ${properContact.lastName ?? ''}`.trim()
    const name = fullName.includes(' ') ? fullName : (properContact.contactName || properContact.email || '?')
    const parts = name.split(' ')
    const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
    featuredContact = { name, email: properContact.email ?? '', phone: properContact.phone ?? '', initials: initials.toUpperCase() }
  }

  const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const now = new Date()
  const weeklyBreakdown: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now)
    dayStart.setDate(now.getDate() - (6 - i))
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const created = opportunities.filter(o => { const d = new Date(o.createdAt); return d >= dayStart && d <= dayEnd })
    const won = opportunities.filter(o => { const d = new Date(o.updatedAt); return d >= dayStart && d <= dayEnd && o.status === 'won' })
    const rdv = calendarEvents.filter(e => {
      const ts = typeof e.startTime === 'string' && /^\d+$/.test(e.startTime) ? Number(e.startTime) : new Date(e.startTime).getTime()
      const d = new Date(ts)
      return d >= dayStart && d <= dayEnd
    })

    return { day: DAY_LABELS[dayStart.getDay()], leads: created.length, booked: won.length, rdv: rdv.length }
  })

  const MONTH_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const monthlyPipeline: MonthlyPoint[] = Array.from({ length: 6 }, (_, i) => {
    const ref = new Date()
    ref.setDate(1)
    ref.setMonth(ref.getMonth() - (5 - i))
    const year = ref.getFullYear()
    const month = ref.getMonth()
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
    const value = opportunities
      .filter(o => { const d = new Date(o.createdAt); return d >= monthStart && d <= monthEnd })
      .reduce((sum, o) => sum + (o.monetaryValue ?? 0), 0)
    return { month: MONTH_FR[month], value }
  })

  // ── Won opportunities data ──────────────────────────────────
  const wonOpps = opportunities.filter(o => o.status === 'won')
  const wonCA   = wonOpps.reduce((s, o) => s + (o.monetaryValue ?? 0), 0)

  // Client timeline — last 28 days grouped by day
  const clientTimeline: ClientTimelinePoint[] = Array.from({ length: 28 }, (_, i) => {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - (27 - i))
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)
    const dayValue = wonOpps
      .filter(o => { const d = new Date(o.updatedAt); return d >= dayStart && d <= dayEnd })
      .reduce((s, o) => s + (o.monetaryValue ?? 0), 0)
    return {
      date: dayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', ''),
      value: dayValue,
    }
  })

  // Metier breakdown — from contact tags
  const tagCounts: Record<string, number> = {}
  wonOpps.forEach(o => {
    const tag = o.contact?.tags?.[0] ?? 'Autre'
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
  })
  const totalMetier = wonOpps.length || 1
  const metierBreakdown: MetierBreakdown[] = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / totalMetier) * 100),
      color: METIER_COLORS[i % METIER_COLORS.length],
    }))

  // Payments list — won opportunities sorted by date desc
  const payments: Payment[] = [...wonOpps]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20)
    .map(o => ({
      date: new Date(o.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      client: o.contact?.name ?? '—',
      entreprise: o.contact?.tags?.[1] ?? o.contact?.tags?.[0] ?? '—',
      montant: o.monetaryValue ?? 0,
      description: o.name,
      statut: 'Payé',
    }))

  return {
    metrics: {
      totalContacts: total,
      pipelineValue: opportunities.reduce((s, o) => s + (o.monetaryValue ?? 0), 0),
      activeDeals: opportunities.filter(o => o.status === 'open').length,
      wonDeals: opportunities.filter(o => o.status === 'won').length,
      totalDeals: opportunities.length,
    },
    funnel,
    recentOpps,
    featuredContact,
    weeklyBreakdown,
    monthlyPipeline,
    clientTimeline,
    metierBreakdown,
    payments,
    wonCA,
  }
}
