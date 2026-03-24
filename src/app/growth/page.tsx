import { createClient } from '@/lib/supabase/server'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  color?: string
}

function MetricCard({ label, value, sub, color = '#3B82F6' }: MetricCardProps) {
  return (
    <div className="bg-[#1C2333] rounded-xl p-5 border border-white/5">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

interface FunnelStep {
  label: string
  count: number
  color: string
}

function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.count || 1
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-32 shrink-0">{step.label}</span>
          <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
              style={{
                width: `${Math.max((step.count / max) * 100, 4)}%`,
                backgroundColor: step.color,
              }}
            >
              <span className="text-xs font-bold text-white">{step.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function GrowthPage() {
  const supabase = await createClient()

  // Récupérer les données
  const [{ data: leads }, { data: contacts }, { data: conversations }, { data: messages }] =
    await Promise.all([
      supabase.from('leads').select('id, status, created_at, source'),
      supabase.from('contacts').select('id, created_at'),
      supabase.from('conversations').select('id, channel, created_at'),
      supabase.from('messages').select('id, role, created_at'),
    ])

  const totalLeads      = leads?.length ?? 0
  const qualifiedLeads  = leads?.filter(l => l.status === 'qualifie' || l.status === 'rdv').length ?? 0
  const rdvLeads        = leads?.filter(l => l.status === 'rdv').length ?? 0
  const newLeads        = leads?.filter(l => l.status === 'new').length ?? 0
  const totalContacts   = contacts?.length ?? 0
  const totalConversations = conversations?.length ?? 0
  const whatsappConvs   = conversations?.filter(c => c.channel === 'whatsapp').length ?? 0
  const aiMessages      = messages?.filter(m => m.role === 'assistant').length ?? 0

  // Métriques ROI (coûts simulés — à brancher sur Meta Ads API)
  const budgetMeta      = 500 // € / mois simulé
  const coutParLead     = totalLeads > 0 ? (budgetMeta / totalLeads).toFixed(0) : '—'
  const coutParRdv      = rdvLeads > 0 ? (budgetMeta / rdvLeads).toFixed(0) : '—'
  const txQualif        = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0'
  const txRdv           = qualifiedLeads > 0 ? ((rdvLeads / qualifiedLeads) * 100).toFixed(1) : '0'

  // CA projection 30j (panier moyen simulé 8 000€, taux closing 25%)
  const panierMoyen = 8000
  const tauxClosing = 0.25
  const caProjection = Math.round(rdvLeads * tauxClosing * panierMoyen)

  // Sources de leads
  const sourceMap: Record<string, number> = {}
  leads?.forEach(l => {
    const src = l.source ?? 'unknown'
    sourceMap[src] = (sourceMap[src] ?? 0) + 1
  })

  // Données 30 derniers jours pour mini graphe
  const now = Date.now()
  const day = 86400000
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now - (29 - i) * day)
    const dateStr = date.toISOString().slice(0, 10)
    const count = leads?.filter(l => l.created_at?.startsWith(dateStr)).length ?? 0
    return { date: dateStr, count }
  })

  const maxDay = Math.max(...last30.map(d => d.count), 1)

  const funnelSteps: FunnelStep[] = [
    { label: 'Leads entrants', count: totalLeads, color: '#3B82F6' },
    { label: 'Contactés IA', count: leads?.filter(l => l.status !== 'new').length ?? 0, color: '#8B5CF6' },
    { label: 'Qualifiés', count: qualifiedLeads, color: '#C8F135' },
    { label: 'RDV bookés', count: rdvLeads, color: '#10B981' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Growth & ROI</h1>
        <p className="text-gray-400 text-sm mt-1">Performance de l'acquisition et retour sur investissement</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Coût / Lead" value={coutParLead === '—' ? '—' : `${coutParLead}€`} sub={`Budget Meta: ${budgetMeta}€`} color="#3B82F6" />
        <MetricCard label="Coût / RDV" value={coutParRdv === '—' ? '—' : `${coutParRdv}€`} sub={`${rdvLeads} RDV générés`} color="#8B5CF6" />
        <MetricCard label="Taux qualification" value={`${txQualif}%`} sub={`${qualifiedLeads}/${totalLeads} leads`} color="#C8F135" />
        <MetricCard label="CA projeté 30j" value={`${caProjection.toLocaleString('fr-FR')}€`} sub={`Panier ~${panierMoyen.toLocaleString('fr-FR')}€ × closing ${(tauxClosing * 100).toFixed(0)}%`} color="#10B981" />
      </div>

      {/* Funnel + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel de conversion */}
        <div className="bg-[#1C2333] rounded-xl p-5 border border-white/5">
          <h2 className="text-sm font-semibold text-white mb-4">Funnel de conversion</h2>
          <FunnelBar steps={funnelSteps} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Lead → Qualifié</p>
              <p className="text-lg font-bold text-[#C8F135]">{txQualif}%</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Qualifié → RDV</p>
              <p className="text-lg font-bold text-[#10B981]">{txRdv}%</p>
            </div>
          </div>
        </div>

        {/* Sources de leads */}
        <div className="bg-[#1C2333] rounded-xl p-5 border border-white/5">
          <h2 className="text-sm font-semibold text-white mb-4">Sources de leads</h2>
          <div className="space-y-3">
            {Object.entries(sourceMap).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Aucun lead encore</p>
            ) : (
              Object.entries(sourceMap)
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => {
                  const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : '0'
                  const sourceLabel: Record<string, string> = {
                    meta_ads: 'Meta Ads',
                    whatsapp: 'WhatsApp',
                    email: 'Email',
                    phone: 'Téléphone',
                    referral: 'Référence',
                    website: 'Site web',
                    other: 'Autre',
                  }
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-24 shrink-0">
                        {sourceLabel[source] ?? source}
                      </span>
                      <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(Number(pct), 4)}%` }}
                        >
                          <span className="text-[10px] font-bold text-white">{count}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>

      {/* Volume leads 30 jours */}
      <div className="bg-[#1C2333] rounded-xl p-5 border border-white/5">
        <h2 className="text-sm font-semibold text-white mb-4">Volume de leads — 30 derniers jours</h2>
        <div className="flex items-end gap-1 h-24">
          {last30.map((d) => (
            <div
              key={d.date}
              className="flex-1 rounded-sm bg-blue-500/20 hover:bg-blue-500/40 transition-colors relative group"
              style={{ height: `${Math.max((d.count / maxDay) * 100, d.count > 0 ? 10 : 4)}%` }}
            >
              {d.count > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {d.date.slice(5)}: {d.count}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-600">
          <span>J-30</span>
          <span>Aujourd&apos;hui</span>
        </div>
      </div>

      {/* Activité IA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Contacts totaux" value={String(totalContacts)} color="#3B82F6" />
        <MetricCard label="Conversations" value={String(totalConversations)} sub={`dont ${whatsappConvs} WhatsApp`} color="#8B5CF6" />
        <MetricCard label="Messages IA" value={String(aiMessages)} sub="réponses Claude générées" color="#C8F135" />
        <MetricCard label="Leads nouveaux" value={String(newLeads)} sub="en attente de traitement" color="#F59E0B" />
      </div>

      {/* Note budgétaire */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        <span className="font-semibold">Note :</span> Les coûts Meta Ads sont actuellement simulés (budget fixé à {budgetMeta}€/mois).
        Connectez l&apos;API Meta Marketing pour des données temps réel.
      </div>
    </div>
  )
}
