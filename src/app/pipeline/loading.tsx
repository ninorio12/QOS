export default function PipelineLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="h-8 w-32 bg-[#D9DDD6] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-[#D9DDD6] rounded-xl" />
          <div className="h-8 w-8 bg-[#D9DDD6] rounded-xl" />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 flex gap-3 px-6 pb-6 overflow-hidden">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex-1 min-w-[220px] flex flex-col bg-soren-card/50 rounded-2xl p-3 border border-soren-border"
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-24 bg-[#D9DDD6] rounded" />
              <div className="h-5 w-5 bg-[#E5E7EB] rounded-full" />
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 - (colIdx % 2) }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="bg-soren-card rounded-xl p-3 border border-soren-border shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#E5E7EB]" />
                    <div className="flex-1">
                      <div className="h-2.5 w-20 bg-[#D9DDD6] rounded mb-1" />
                      <div className="h-2 w-14 bg-[#E5E7EB] rounded" />
                    </div>
                  </div>
                  <div className="h-2 w-16 bg-[#E5E7EB] rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
