export default function DevisLoading() {
  return (
    <div className="flex flex-col h-full bg-soren-app animate-pulse">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0 gap-4">
        <div className="flex-shrink-0">
          <div className="h-7 w-20 bg-soren-card rounded-xl shadow-sm" />
          <div className="h-3 w-32 bg-soren-border rounded mt-1.5" />
        </div>
        <div className="flex-1 max-w-xs h-9 bg-soren-card rounded-full shadow-sm" />
        <div className="h-9 w-36 bg-soren-card rounded-full shadow-sm flex-shrink-0" />
      </div>

      {/* KPI row */}
      <div className="flex gap-3 px-6 mb-3 flex-shrink-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-soren-card rounded-2xl px-4 py-2.5 flex flex-col shadow-sm flex-1">
            <div className="h-2.5 w-16 bg-soren-border rounded mb-2" />
            <div className="h-5 w-20 bg-soren-border rounded-lg" />
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-6 mb-4 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-7 rounded-full flex-shrink-0 ${i === 0 ? 'w-16 bg-soren-border' : 'w-20 bg-soren-card shadow-sm'}`}
          />
        ))}
      </div>

      {/* Horizontal cards */}
      <div className="flex-1 overflow-hidden px-6 pb-4">
        <div className="flex flex-row gap-5 h-full items-center">

          {/* Ghost "+" card */}
          <div className="rounded-3xl border-2 border-dashed border-[#d1d5db] flex-shrink-0" style={{ width: 220 }}>
            <div className="h-[180px] flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#d1d5db]" />
            </div>
            <div className="p-3.5">
              <div className="h-2.5 w-1/3 bg-soren-border rounded-full mb-2" />
              <div className="h-3 w-3/4 bg-soren-border rounded-full mb-1.5" />
              <div className="h-2.5 w-1/2 bg-soren-border rounded-full mb-3" />
              <div className="flex items-center justify-between">
                <div className="h-4 w-1/3 bg-soren-border rounded-full" />
                <div className="h-5 w-1/4 bg-soren-border rounded-full" />
              </div>
            </div>
          </div>

          {/* Real cards x4 */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-soren-card rounded-3xl overflow-hidden shadow-sm flex-shrink-0" style={{ width: 260 }}>
              <div className="h-[180px] bg-soren-border" />
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-2.5 w-12 bg-soren-border rounded" />
                  <div className="h-2.5 w-12 bg-soren-border rounded" />
                </div>
                <div className="h-3 w-3/4 bg-soren-border rounded mb-1" />
                <div className="h-2.5 w-1/2 bg-soren-border rounded mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 bg-soren-border rounded" />
                  <div className="h-5 w-14 bg-soren-border rounded-full" />
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}
