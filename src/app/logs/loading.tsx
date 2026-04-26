const LEVEL_COLORS = ['#3462EE', '#22c55e', '#EAB308', '#EF4444', '#3462EE', '#22c55e', '#EAB308', '#3462EE']

export default function LogsLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="h-7 w-16 bg-[#D9DDD6] rounded-xl mb-1" />
          <div className="h-3 w-48 bg-[#E5E7EB] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-[#E5E7EB] rounded-full" />
          <div className="h-8 w-8 bg-[#E5E7EB] rounded-full" />
        </div>
      </div>

      {/* Agent + level filters */}
      <div className="flex items-center gap-2 px-6 pb-3 flex-shrink-0">
        {[48, 40, 40, 36, 48].map((w, i) => (
          <div key={i} className="h-6 rounded-full bg-soren-card border border-soren-border shadow-sm" style={{ width: w }} />
        ))}
        <div className="w-px h-4 bg-[#E5E7EB] mx-1" />
        {[44, 44, 56, 44].map((w, i) => (
          <div key={i} className="h-6 rounded-full bg-soren-card border border-soren-border shadow-sm" style={{ width: w }} />
        ))}
      </div>

      {/* Log list */}
      <div className="flex-1 mx-6 mb-6 bg-soren-card rounded-2xl border border-soren-border shadow-sm overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F3F4F6] last:border-0 relative">
            {/* Accent bar */}
            <div
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
              style={{ background: LEVEL_COLORS[i % LEVEL_COLORS.length] + '60' }}
            />
            {/* Time */}
            <div className="h-2 w-14 bg-[#E5E7EB] rounded flex-shrink-0" />
            {/* Agent badge */}
            <div className="h-5 w-10 bg-[#E5E7EB] rounded-full flex-shrink-0" />
            {/* Message */}
            <div className="flex-1 h-2.5 bg-[#D9DDD6] rounded" style={{ maxWidth: `${50 + (i * 11) % 35}%` }} />
            {/* Level badge */}
            <div className="h-5 w-14 rounded-full flex-shrink-0" style={{ background: LEVEL_COLORS[i % LEVEL_COLORS.length] + '18' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
