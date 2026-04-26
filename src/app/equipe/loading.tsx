const AGENTS = [
  { color: '#3462EE', nameW: 40, roleW: 72 },
  { color: '#8B5CF6', nameW: 36, roleW: 64 },
  { color: '#F97316', nameW: 44, roleW: 80 },
]

export default function EquipeLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="h-7 w-24 bg-[#D9DDD6] rounded-xl mb-1" />
          <div className="h-3 w-52 bg-[#E5E7EB] rounded" />
        </div>
        <div className="h-9 w-32 bg-[#D9DDD6] rounded-full" />
      </div>

      {/* Agent cards — grid 3 colonnes */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="grid grid-cols-3 gap-4 h-full">
          {AGENTS.map((agent, i) => (
            <div key={i} className="bg-soren-card rounded-2xl border border-soren-border shadow-sm p-5 flex flex-col gap-4">
              {/* Agent header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex-shrink-0"
                  style={{ background: agent.color + '22' }}
                />
                <div>
                  <div className="h-3.5 rounded mb-1.5" style={{ width: agent.nameW, background: '#D9DDD6' }} />
                  <div className="h-2 rounded" style={{ width: agent.roleW, background: '#E5E7EB' }} />
                </div>
                {/* Status dot */}
                <div className="ml-auto w-2.5 h-2.5 rounded-full bg-[#D9DDD6]" />
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-soren-elevated rounded-xl p-1">
                {[40, 52, 44].map((w, j) => (
                  <div
                    key={j}
                    className={`h-6 rounded-lg flex-1 ${j === 0 ? 'bg-soren-card shadow-sm' : ''}`}
                  />
                ))}
              </div>

              {/* Content block */}
              <div className="flex-1 bg-[#F9F9F7] rounded-xl p-3 space-y-2">
                <div className="h-2 w-full bg-[#E5E7EB] rounded" />
                <div className="h-2 w-5/6 bg-[#E5E7EB] rounded" />
                <div className="h-2 w-4/6 bg-[#E5E7EB] rounded" />
                <div className="h-2 w-5/6 bg-[#E5E7EB] rounded" />
                <div className="h-2 w-3/4 bg-[#E5E7EB] rounded" />
              </div>

              {/* Action button */}
              <div className="h-9 w-full bg-soren-elevated rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
