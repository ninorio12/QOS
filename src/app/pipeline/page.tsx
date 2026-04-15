import Link from 'next/link'
import { GitMerge, Settings } from 'lucide-react'
import KanbanBoard from '@/components/pipeline/KanbanBoard'
import { getOpportunities, getPipelines, getUsers } from '@/lib/ghl'
import { stageColor, type GHLPipelineData, type Opportunity } from '@/components/pipeline/types'

export const revalidate = 300

// ─── Empty state ──────────────────────────────────────────────
function PipelineEmpty({ error }: { error?: string }) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-3xl font-black text-[#111111] leading-tight">Pipeline</h1>
        <p className="text-sm text-[#6B7280] mt-1">Aucun pipeline disponible</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-[300px]">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <GitMerge size={20} className="text-[#9CA3AF]" />
          </div>
          <p className="text-sm font-semibold text-[#111111] mb-1.5">Connexion CRM échouée</p>
          <p className="text-xs text-[#9CA3AF] leading-relaxed mb-5">
            Vérifiez la connexion dans Paramètres → Intégrations
          </p>
          <Link
            href="/parametres"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] bg-white border border-[#E5E7EB] hover:bg-[#F5F5F0] px-4 py-2 rounded-full transition-colors shadow-sm"
          >
            <Settings size={12} /> Paramètres → Intégrations
          </Link>
          {error && (
            <pre className="text-[10px] text-[#EF4444] mt-4 font-mono break-all whitespace-pre-wrap leading-relaxed bg-[#FEF2F2] rounded-xl px-3 py-2 text-left">
              {error}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default async function PipelinePage() {
  let pipelines:     GHLPipelineData[] = []
  let opportunities: Opportunity[]     = []
  let fetchError:    string | null     = null

  try {
    const [rawPipelines, rawOpps, rawUsers] = await Promise.all([
      getPipelines(),
      getOpportunities(100),
      getUsers().catch(() => []),
    ])

    const userInitialsMap = new Map(rawUsers.map(u => {
      const name = u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
      const ini  = name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
      return [u.id, ini || '?']
    }))

    pipelines = rawPipelines.map(p => ({
      id:     p.id,
      name:   p.name,
      stages: p.stages
        .sort((a, b) => a.position - b.position)
        .map(s => {
          const cleanName = s.name.replace(/^[^\w\d\s'"«»-]+\s*/, '').trim()
          return {
            id:       s.id,
            name:     cleanName,
            color:    stageColor(s.name),
            position: s.position,
          }
        }),
    }))

    opportunities = rawOpps.map(opp => {
      const contactName = opp.contact?.name ?? opp.name
      const initials    = opp.assignedTo
        ? (userInitialsMap.get(opp.assignedTo) ?? '?')
        : contactName.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
      const rawSource   = (opp as Record<string, unknown> & { attributions?: { utmSessionSource?: string }[] })
        .attributions?.[0]?.utmSessionSource
      return {
        id:         opp.id,
        name:       contactName,
        company:    ((opp.contact as Record<string, unknown> | null)?.companyName as string | undefined) ?? '',
        value:      opp.monetaryValue ?? 0,
        source:     rawSource && rawSource !== 'CRM UI' ? rawSource : '',
        createdAt:  opp.createdAt.split('T')[0],
        initials,
        stageId:    opp.pipelineStageId,
        pipelineId: opp.pipelineId,
        email:      (opp.contact?.email ?? ''),
        phone:      (opp.contact?.phone ?? ''),
        contactId:  (opp.contact?.id ?? ''),
        tags:       (opp.contact?.tags ?? []).filter(t => !['ia', 'kai', 'soren', 'mia', 'auto', 'ia active', 'auto ia active'].includes(t.toLowerCase())),
        status:     'open' as const,
      }
    })
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err)
  }

  if (pipelines.length === 0) {
    return <PipelineEmpty error={fetchError ?? undefined} />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <KanbanBoard initialPipelines={pipelines} initialOpportunities={opportunities} />
    </div>
  )
}
