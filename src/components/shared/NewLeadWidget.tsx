'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { type Opportunity } from '@/components/pipeline/types'
import { type ContactPipelineInfo } from '@/app/contacts/page'

const NewContactModal = dynamic(() => import('@/components/contacts/NewContactModal'), { ssr: false })

interface Props {
  onAddOpp?:  (opp: Opportunity) => void
  onAdd?:     (c: import('@/lib/ghl').GHLContact) => void
  compact?:   boolean
  label?:     string
  mode?:      'leads' | 'clients'
}

export default function NewLeadWidget({ onAddOpp, onAdd, compact, label, mode }: Props) {
  const [open, setOpen] = useState(false)
  const text = label ?? (mode === 'clients' ? 'Nouveau client' : 'Nouveau lead')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#FF4D00] text-white hover:bg-[#e64500] transition-colors shadow-sm"
      >
        <Plus size={12} />
        {text}
      </button>

      {open && (
        <NewContactModal
          mode={mode}
          onClose={() => setOpen(false)}
          onAdd={c => { onAdd?.(c); setOpen(false) }}
          onAddOpp={opp => { onAddOpp?.(opp); setOpen(false) }}
        />
      )}
    </>
  )
}
