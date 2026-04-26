const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)
const DAYS  = [0, 1, 2, 3, 4, 5, 6]

export default function CalendrierLoading() {
  return (
    <div className="h-full flex overflow-hidden animate-pulse">
      {/* Main calendar area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-soren-border bg-soren-card flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-soren-border rounded-lg" />
            <div className="h-5 w-36 bg-soren-border rounded" />
            <div className="h-8 w-8 bg-soren-border rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-soren-border rounded-lg" />
            <div className="h-8 w-20 bg-soren-border rounded-lg" />
            <div className="h-8 w-8 bg-soren-border rounded-lg" />
          </div>
        </div>

        {/* Day headers */}
        <div className="flex border-b border-soren-border bg-soren-card flex-shrink-0">
          <div className="w-14 flex-shrink-0" />
          {DAYS.map(d => (
            <div key={d} className="flex-1 flex flex-col items-center py-2 gap-1">
              <div className="h-2.5 w-6 bg-soren-border rounded" />
              <div className="h-7 w-7 bg-soren-border rounded-full" />
            </div>
          ))}
        </div>

        {/* Hour grid */}
        <div className="flex-1 overflow-hidden">
          {HOURS.map(h => (
            <div
              key={h}
              className="flex border-b border-[#F3F4F6]"
              style={{ height: 80 }}
            >
              <div className="w-14 flex-shrink-0 flex items-start pt-1 px-2">
                <div className="h-2 w-8 bg-soren-border rounded" />
              </div>
              <div className="flex-1 flex gap-px">
                {DAYS.map((_, i) => (
                  <div key={i} className="flex-1 border-l border-[#F3F4F6]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-64 flex-shrink-0 border-l border-soren-border bg-soren-card p-4 flex flex-col gap-4">
        <div className="h-10 w-full bg-soren-border rounded-xl" />
        <div>
          <div className="h-3 w-24 bg-soren-border rounded mb-3" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-6 w-6 bg-soren-border rounded-full mx-auto" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-soren-border" />
              <div className="h-2.5 flex-1 bg-soren-border rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
