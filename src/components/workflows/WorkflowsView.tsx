'use client'

import { Zap } from 'lucide-react'
import type { GHLWorkflow } from '@/lib/ghl'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ status }: { status: GHLWorkflow['status'] }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Actif
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-[#6B7280]">
      Brouillon
    </span>
  )
}

export default function WorkflowsView({ workflows }: { workflows: GHLWorkflow[] }) {
  return (
    <div className="min-h-screen bg-[#EEF0EB] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111111]">Workflows GHL</h1>
        <p className="text-[#6B7280] text-sm mt-1">Automatisations configurées dans GoHighLevel</p>
      </div>

      {/* Empty state */}
      {workflows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 flex flex-col items-center justify-center text-center">
          <Zap size={32} className="text-[#6B7280] mb-3" strokeWidth={1.5} />
          <p className="text-[#6B7280] text-sm">Aucun workflow configuré dans GHL</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4"
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-xl bg-[#EEF0EB] flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-[#3462EE]" strokeWidth={2} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[#111111] font-semibold text-sm truncate">{wf.name}</p>
                <p className="text-[#6B7280] text-xs mt-0.5">
                  Modifié le {formatDate(wf.updatedAt)}
                </p>
              </div>

              {/* Badge */}
              <StatusBadge status={wf.status} />
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="mt-6 text-xs text-[#6B7280] text-center">
        Les workflows se configurent directement dans GoHighLevel. Cette vue est en lecture seule.
      </p>
    </div>
  )
}
