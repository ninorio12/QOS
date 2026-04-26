const AGENTS = [
  { color: '#3462EE', nameW: 56, roleW: 80, skills: [48, 64, 40, 56] },
  { color: '#8B5CF6', nameW: 40, roleW: 96, skills: [56, 44, 72, 40] },
  { color: '#F97316', nameW: 48, roleW: 72, skills: [44, 60, 48] },
]

export default function KnowledgeLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="h-7 w-40 bg-[#D9DDD6] rounded-xl mb-1" />
          <div className="h-3 w-56 bg-[#E5E7EB] rounded" />
        </div>
        <div className="h-9 w-36 bg-[#D9DDD6] rounded-full" />
      </div>

      {/* Agent cards */}
      <div className="flex-1 px-6 pb-6 flex flex-col gap-3 overflow-hidden">
        {AGENTS.map((agent, i) => (
          <div key={i} className="bg-soren-card rounded-2xl border border-soren-border shadow-sm p-4 flex-shrink-0">
            {/* Agent header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex-shrink-0" style={{ background: agent.color + '22' }}>
                <div className="w-full h-full rounded-2xl" style={{ background: agent.color + '40' }} />
              </div>
              <div>
                <div className="h-3 rounded mb-1.5" style={{ width: agent.nameW, background: '#D9DDD6' }} />
                <div className="h-2 rounded" style={{ width: agent.roleW, background: '#E5E7EB' }} />
              </div>
              <div className="ml-auto flex gap-2">
                <div className="h-7 w-20 bg-soren-elevated rounded-xl" />
                <div className="h-7 w-16 bg-soren-elevated rounded-xl" />
              </div>
            </div>

            {/* Soul text skeleton */}
            <div className="bg-[#F9F9F7] rounded-xl p-3 mb-3">
              <div className="h-2 w-full bg-[#E5E7EB] rounded mb-1.5" />
              <div className="h-2 w-5/6 bg-[#E5E7EB] rounded mb-1.5" />
              <div className="h-2 w-4/5 bg-[#E5E7EB] rounded" />
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map((w, j) => (
                <div key={j} className="h-5 rounded-full bg-[#F3F4F6]" style={{ width: w }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
