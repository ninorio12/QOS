'use client'

import { type Pipeline, type ConversationSource } from './types'

export type InboxFilter =
  | 'all'
  | 'unassigned'
  | 'closed'
  | { type: 'pipeline_stage'; stageId: string }
  | { type: 'source'; source: ConversationSource }

interface Props {
  activeFilter: InboxFilter
  onFilterChange: (f: InboxFilter) => void
  totalUnread: number
  pipelines: Pipeline[]
}

function isActive(filter: InboxFilter, item: InboxFilter): boolean {
  if (typeof filter === 'string' && typeof item === 'string') return filter === item
  if (typeof filter === 'object' && typeof item === 'object') {
    if (filter.type !== item.type) return false
    if (filter.type === 'pipeline_stage' && item.type === 'pipeline_stage') {
      return filter.stageId === item.stageId
    }
    if (filter.type === 'source' && item.type === 'source') {
      return filter.source === item.source
    }
  }
  return false
}

function NavButton({
  label,
  filter,
  activeFilter,
  onFilterChange,
}: {
  label: string
  filter: InboxFilter
  activeFilter: InboxFilter
  onFilterChange: (f: InboxFilter) => void
}) {
  const active = isActive(activeFilter, filter)
  return (
    <button
      onClick={() => onFilterChange(filter)}
      aria-current={active ? 'page' : undefined}
      className={`
        w-full text-left text-sm px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#3462EE]/40 focus:ring-offset-1 focus:ring-offset-[#111111]
        ${active
          ? 'bg-[#E2FF8D] text-soren-text font-medium'
          : 'text-soren-subtle hover:text-white hover:bg-soren-card/5'
        }
      `}
    >
      {label}
    </button>
  )
}

export default function InboxNav({ activeFilter, onFilterChange, totalUnread, pipelines }: Props) {
  return (
    <div className="flex flex-col w-[200px] flex-shrink-0 bg-soren-sidebar h-full overflow-y-auto">
      {/* Title */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Conversations</span>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2FF8D] text-soren-text">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* Main filters */}
      <nav aria-label="Filtres principaux" className="px-2">
        <div className="flex flex-col gap-0.5 bg-soren-card/5 rounded-2xl p-1">
          <NavButton label="Toutes"         filter="all"        activeFilter={activeFilter} onFilterChange={onFilterChange} />
          <NavButton label="Non assignées"  filter="unassigned" activeFilter={activeFilter} onFilterChange={onFilterChange} />
          <NavButton label="Fermées"        filter="closed"     activeFilter={activeFilter} onFilterChange={onFilterChange} />
        </div>
      </nav>

      {/* Pipelines */}
      {pipelines.length > 0 && (
        <nav aria-label="Pipelines" className="mt-5 px-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-2">
            Pipelines
          </p>
          <div className="flex flex-col gap-0.5">
            {pipelines.map(pipeline => (
              <div key={pipeline.id}>
                <p className="text-[10px] text-[#3D4F6B] px-3 py-1 font-medium">{pipeline.name}</p>
                {pipeline.stages.map(stage => (
                  <NavButton
                    key={stage.id}
                    label={stage.name}
                    filter={{ type: 'pipeline_stage', stageId: stage.id }}
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                  />
                ))}
              </div>
            ))}
          </div>
        </nav>
      )}

      {/* Sources */}
      <nav aria-label="Sources" className="mt-5 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-2">
          Sources
        </p>
        <NavButton
          label="Meta Ads"
          filter={{ type: 'source', source: 'meta' }}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
      </nav>
    </div>
  )
}
