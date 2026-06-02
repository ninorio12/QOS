import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MOCK_LOGS = (() => {
  const now = new Date()
  const t = (offsetMin: number) => new Date(now.getTime() - offsetMin * 60_000).toISOString()
  return [
    { id: 'log-1',  agent: 'kai',      level: 'success', message: 'Devis généré et envoyé',            detail: 'Devis #VF-2024-089 envoyé à M. Dubois — 8 500 CHF',                  created_at: t(3)  },
    { id: 'log-2',  agent: 'mia',      level: 'info',    message: 'Nouveau message WhatsApp reçu',     detail: 'Contact: Mme Favre — "Pouvez-vous passer demain matin ?"',           created_at: t(7)  },
    { id: 'log-3',  agent: 'vividflow', level: 'info',   message: 'Qualification lead terminée',       detail: 'Lead qualifié — Rénovation façade, budget estimé 15 000 CHF',        created_at: t(12) },
    { id: 'log-4',  agent: 'kai',      level: 'success', message: 'RDV confirmé dans GHL',             detail: 'RDV planifié le 03/06 à 10h30 avec M. & Mme Rochat',                 created_at: t(25) },
    { id: 'log-5',  agent: 'mia',      level: 'info',    message: 'Relance automatique envoyée',       detail: 'SMS de relance J+3 envoyé à 4 prospects',                            created_at: t(40) },
    { id: 'log-6',  agent: 'vividflow', level: 'error',  message: 'Échec envoi email',                 detail: 'SMTP timeout — devis #VF-2024-088 non envoyé, retry planifié',       created_at: t(55) },
    { id: 'log-7',  agent: 'kai',      level: 'info',    message: 'Analyse chantier terminée',         detail: 'Photos analysées — surface estimée 340m², rapport généré',           created_at: t(80) },
    { id: 'log-8',  agent: 'mia',      level: 'success', message: 'Paiement reçu',                    detail: 'Acompte 30% reçu — chantier Rue du Lac, 4 500 CHF',                  created_at: t(120) },
    { id: 'log-9',  agent: 'vividflow', level: 'info',   message: 'Synchronisation GHL terminée',     detail: '12 contacts mis à jour, 2 nouveaux leads importés',                   created_at: t(180) },
    { id: 'log-10', agent: 'kai',      level: 'success', message: 'Rapport hebdomadaire généré',       detail: 'KPIs semaine 22 : 3 devis envoyés, 1 signé, CA estimé 23 000 CHF',   created_at: t(240) },
  ]
})()

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { searchParams } = req.nextUrl
    const agent  = searchParams.get('agent')
    const level  = searchParams.get('level')
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200)
    let logs = MOCK_LOGS
    if (agent) logs = logs.filter(l => l.agent === agent)
    if (level) logs = logs.filter(l => l.level === level)
    return NextResponse.json({ logs: logs.slice(0, limit) })
  }
  const { searchParams } = req.nextUrl

  const agent  = searchParams.get('agent')
  const level  = searchParams.get('level')
  const taskId = searchParams.get('taskId')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200)

  let query = supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (agent)  query = query.eq('agent',   agent)
  if (level)  query = query.eq('level',   level)
  if (taskId) query = query.eq('task_id', taskId)

  const { data, error } = await query

  if (error) return NextResponse.json({ logs: [] })
  return NextResponse.json({ logs: data ?? [] })
}
