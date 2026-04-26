'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type Opportunity } from '@/components/pipeline/types'
import { type ContactPipelineInfo } from '@/app/contacts/page'

const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })

interface Props {
  onAddOpp?:     (opp: Opportunity) => void
  pipelineInfo?: ContactPipelineInfo
}

export default function NewLeadWidget({ onAddOpp, pipelineInfo }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-soren-sidebar hover:bg-[#2a2a2a] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition-colors flex-shrink-0"
      >
        <Plus size={14} />
        Nouveau Lead
      </button>

      {open && (
        <NewContactModal
          onClose={() => setOpen(false)}
          onAddOpp={opp => { onAddOpp?.(opp); setOpen(false) }}
          pipelineInfo={pipelineInfo}
        />
      )}
    </>
  )
}
