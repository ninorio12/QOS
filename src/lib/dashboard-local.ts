import { createAdminClient } from '@/lib/supabase/admin'
import type { DashboardData, FunnelStage, RecentOpp, WeeklyDay, MonthlyPoint } from './dashboard'

const STAGE_LABELS: Record<string, string> = {
  'stage-nouveau':     'Nouveau lead',
  'stage-qualif':      'Qualification',
  'stage-proposition': 'Proposition',
  'stage-negociation': 'Négociation',
  'stage-gagne':       'Gagné',
}
const STAGE_COLORS: Record<string, string> = {
  'stage-nouveau':     '#3B82F6',
  'stage-qualif':      '#F97316',
  'stage-proposition': '#6366F1',
  'stage-negociation': '#1D4ED8',
  'stage-gagne':       '#22C55E',
}
const CARD_COLORS = [
  { color: '#3462EE', textColor: 'white' },
  { color: '#EFE347', textColor: '#121721' },
  { color: '#4A91A8', textColor: 'white' },
  { color: '#1A2235', textColor: 'white' },
]
const MONTH_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const DAY_FR   = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export async function getLocalDashboardData(): Promise<DashboardData> {
  const admin = createAdminClient()

  const [{ data: opps }, { data: devisList }] = await Promise.all([
    admin.from('local_opportunities').select('*').order('created_at', { ascending: false }),
    admin.from('devis').select('montant_ht, statut, created_at').order('created_at', { ascending: false }),
  ])

  const leads = opps ?? []
  const devis = devisList ?? []

  // ── Funnel ─────────────────────────────────────────────
  const stageOrder = ['stage-nouveau', 'stage-qualif', 'stage-proposition', 'stage-negociation', 'stage-gagne']
  const stageCounts: Record<string, { count: number; value: number }> = {}
  stageOrder.forEach(s => { stageCounts[s] = { count: 0, value: 0 } })
  leads.forEach((l: Record<string, unknown>) => {
    const sid = l.stage_id as string
    if (stageCounts[sid]) {
      stageCounts[sid].count++
      stageCounts[sid].value += Number(l.value ?? 0)
    }
  })
  const maxCount = Math.max(...Object.values(stageCounts).map(s => s.count), 1)
  const funnel: FunnelStage[] = stageOrder.map(sid => ({
    label: STAGE_LABELS[sid] ?? sid,
    count: stageCounts[sid].count,
    value: stageCounts[sid].value,
    color: STAGE_COLORS[sid] ?? '#3B82F6',
    pct:   stageCounts[sid].count > 0 ? Math.max(Math.round((stageCounts[sid].count / maxCount) * 100), 12) : 4,
  }))

  // ── Recent opps ────────────────────────────────────────
  const recentOpps: RecentOpp[] = leads.slice(0, 4).map((l: Record<string, unknown>, i) => {
    const card = CARD_COLORS[i % CARD_COLORS.length]
    const stage = STAGE_LABELS[l.stage_id as string] ?? 'Lead'
    return {
      id:          l.id as string,
      contactName: l.name as string,
      value:       Number(l.value ?? 0),
      stage,
      tag:         stage,
      date:        new Date(l.created_at as string).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      color:       card.color,
      textColor:   card.textColor,
    }
  })

  // ── Featured contact ────────────────────────────────────
  const first = leads[0]
  const featuredContact = first ? (() => {
    const name = first.name as string
    const parts = name.trim().split(' ')
    return {
      name,
      email:    (first.email as string) ?? '',
      phone:    (first.phone as string) ?? '',
      initials: ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase(),
    }
  })() : null

  // ── Weekly breakdown (leads added per day) ──────────────
  const now = new Date()
  const weeklyBreakdown: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now); dayStart.setDate(now.getDate() - (6 - i)); dayStart.setHours(0,0,0,0)
    const dayEnd   = new Date(dayStart); dayEnd.setHours(23,59,59,999)
    const created  = leads.filter((l: Record<string, unknown>) => { const d = new Date(l.created_at as string); return d >= dayStart && d <= dayEnd })
    const won      = leads.filter((l: Record<string, unknown>) => l.stage_id === 'stage-gagne' && (() => { const d = new Date(l.created_at as string); return d >= dayStart && d <= dayEnd })())
    return { day: DAY_FR[dayStart.getDay()], leads: created.length, booked: won.length, rdv: 0 }
  })

  // ── Monthly pipeline (devis value per month) ─────────────
  const monthlyPipeline: MonthlyPoint[] = Array.from({ length: 6 }, (_, i) => {
    const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() - (5 - i))
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1)
    const monthEnd   = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
    const value = devis
      .filter((d: Record<string, unknown>) => { const dt = new Date(d.created_at as string); return dt >= monthStart && dt <= monthEnd })
      .reduce((s: number, d: Record<string, unknown>) => s + Number(d.montant_ht ?? 0), 0)
    return { month: MONTH_FR[ref.getMonth()], value }
  })

  // ── Metrics ─────────────────────────────────────────────
  const activeDeals = leads.filter((l: Record<string, unknown>) => l.stage_id !== 'stage-gagne').length
  const wonDeals    = leads.filter((l: Record<string, unknown>) => l.stage_id === 'stage-gagne').length
  const totalValue  = leads.reduce((s: number, l: Record<string, unknown>) => s + Number(l.value ?? 0), 0)

  return {
    metrics: {
      totalContacts: leads.length + devis.length,
      pipelineValue: totalValue,
      activeDeals,
      wonDeals,
      totalDeals:   leads.length,
    },
    funnel,
    recentOpps,
    featuredContact,
    weeklyBreakdown,
    monthlyPipeline,
  }
}
