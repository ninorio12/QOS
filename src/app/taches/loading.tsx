const COLS = [
  { w: 72, cards: 3 },
  { w: 80, cards: 2 },
  { w: 56, cards: 1 },
  { w: 64, cards: 4 },
  { w: 60, cards: 2 },
]

export default function TachesLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="h-7 w-20 bg-[#D9DDD6] rounded-xl" />
        <div className="h-9 w-32 bg-[#D9DDD6] rounded-full" />
      </div>

      {/* Kanban 5 colonnes */}
      <div className="flex-1 flex gap-3 px-6 pb-6 overflow-hidden">
        {COLS.map((col, colIdx) => (
          <div key={colIdx} className="flex-1 min-w-[180px] flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1 mb-1">
              <div className="w-5 h-5 rounded-lg bg-[#E5E7EB] flex-shrink-0" />
              <div className="h-2.5 bg-[#D9DDD6] rounded" style={{ width: col.w }} />
              <div className="h-4 w-5 bg-[#E5E7EB] rounded-full ml-auto" />
            </div>

            {/* Task cards */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: col.cards }).map((_, cardIdx) => (
                <div key={cardIdx} className="bg-soren-card rounded-xl border border-soren-border shadow-sm px-3 py-2.5">
                  <div className="h-2.5 bg-[#D9DDD6] rounded mb-2" style={{ width: `${60 + (cardIdx * 19) % 50}%` }} />
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-12 bg-[#E5E7EB] rounded-full" />
                    <div className="h-2 w-16 bg-[#E5E7EB] rounded ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
