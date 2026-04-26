export default function DashboardLoading() {
  return (
    <div className="h-full flex flex-col p-5 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="h-8 w-40 bg-[#D9DDD6] rounded-xl" />
        <div className="h-8 w-28 bg-[#D9DDD6] rounded-xl" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-soren-card rounded-2xl p-4 shadow-sm border border-soren-border">
            <div className="h-3 w-20 bg-[#E5E7EB] rounded mb-3" />
            <div className="h-8 w-16 bg-[#D9DDD6] rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main content row */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Weekly chart */}
        <div className="flex-1 bg-soren-card rounded-2xl p-4 shadow-sm border border-soren-border">
          <div className="h-3 w-32 bg-[#E5E7EB] rounded mb-4" />
          <div className="h-full flex items-end gap-2 pb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#E5E7EB] rounded-t-lg"
                  style={{ height: `${40 + (i * 13) % 40}%` }}
                />
                <div className="h-2 w-6 bg-[#E5E7EB] rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="w-56 bg-soren-card rounded-2xl p-4 shadow-sm border border-soren-border flex flex-col gap-2">
          <div className="h-3 w-24 bg-[#E5E7EB] rounded mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 bg-[#E5E7EB] rounded" style={{ width: `${80 - i * 15}%` }} />
              <div className="h-2 w-6 bg-[#D9DDD6] rounded ml-auto" />
            </div>
          ))}
        </div>

        {/* Recent opps */}
        <div className="w-72 bg-soren-card rounded-2xl p-4 shadow-sm border border-soren-border flex flex-col gap-3">
          <div className="h-3 w-28 bg-[#E5E7EB] rounded mb-1" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex-shrink-0" />
              <div className="flex-1">
                <div className="h-2.5 w-24 bg-[#D9DDD6] rounded mb-1.5" />
                <div className="h-2 w-16 bg-[#E5E7EB] rounded" />
              </div>
              <div className="h-2.5 w-12 bg-[#E5E7EB] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
