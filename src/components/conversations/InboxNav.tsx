'use client'

import { type LeadStage, LEAD_STAGE_LABEL } from './types'

export type InboxFilter =
  | 'all'
  | 'unassigned'
  | 'closed'
  | LeadStage

interface Props {
  activeFilter: InboxFilter
  onFilterChange: (f: InboxFilter) => void
  totalUnread: number
}

const MAIN_ITEMS: { id: InboxFilter; label: string }[] = [
  { id: 'all',        label: 'Toutes'        },
  { id: 'unassigned', label: 'Non assignées' },
  { id: 'closed',     label: 'Fermées'       },
]

const LIFECYCLE_ITEMS: { id: LeadStage; label: string }[] = (
  Object.entries(LEAD_STAGE_LABEL) as [LeadStage, string][]
).map(([id, label]) => ({ id, label }))

export default function InboxNav({ activeFilter, onFilterChange, totalUnread }: Props) {
  return (
    <div className="flex flex-col w-[200px] flex-shrink-0 bg-[#111111] h-full overflow-y-auto">
      {/* Title */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Conversations</span>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2FF8D] text-[#111111]">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* Main filters */}
      <nav aria-label="Filtres principaux" className="flex flex-col gap-0.5 px-2">
        {MAIN_ITEMS.map(item => {
          const isActive = activeFilter === item.id
          return (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`
                w-full text-left text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#E2FF8D] focus:ring-offset-1 focus:ring-offset-[#111111]
                ${isActive
                  ? 'bg-[#E2FF8D] text-[#111111] font-medium'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }
              `}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Lifecycle section */}
      <nav aria-label="Lifecycle" className="mt-5 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-2">
          Lifecycle
        </p>
        <div className="flex flex-col gap-0.5">
          {LIFECYCLE_ITEMS.map(item => {
            const isActive = activeFilter === item.id
            return (
              <button
                key={String(item.id)}
                onClick={() => onFilterChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  w-full text-left text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#E2FF8D] focus:ring-offset-1 focus:ring-offset-[#111111]
                  ${isActive
                    ? 'bg-[#E2FF8D] text-[#111111] font-medium'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
