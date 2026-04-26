export default function BudgetLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-end justify-between flex-shrink-0">
        <div>
          <div className="h-7 w-20 bg-[#D9DDD6] rounded-xl mb-1.5" />
          <div className="h-3 w-64 bg-[#E5E7EB] rounded" />
        </div>
        <div className="flex gap-1 bg-soren-card rounded-xl shadow-sm p-1">
          {[48, 56, 64].map((w, i) => (
            <div key={i} className="h-7 rounded-lg bg-[#E5E7EB]" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="flex gap-3 px-6 mb-4 flex-shrink-0">
        {[
          { w: 'w-24', v: 'w-16' },
          { w: 'w-28', v: 'w-12' },
          { w: 'w-20', v: 'w-20' },
        ].map((s, i) => (
          <div key={i} className="flex-1 bg-soren-card rounded-2xl border border-soren-border shadow-sm px-4 py-3.5">
            <div className={`h-2.5 ${s.w} bg-[#E5E7EB] rounded mb-2.5`} />
            <div className={`h-6 ${s.v} bg-[#D9DDD6] rounded-lg`} />
          </div>
        ))}
      </div>

      {/* Service list */}
      <div className="flex-1 px-6 pb-6 overflow-hidden">
        <div className="bg-soren-card rounded-2xl border border-soren-border shadow-sm overflow-hidden h-full">
          {/* Section label */}
          <div className="px-4 pt-4 pb-2">
            <div className="h-2.5 w-24 bg-[#E5E7EB] rounded" />
          </div>
          <div className="flex flex-col">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F4F6] last:border-0">
                {/* Icon box */}
                <div className="w-9 h-9 rounded-xl bg-[#E5E7EB] flex-shrink-0" />
                {/* Text */}
                <div className="flex-1">
                  <div className="h-2.5 bg-[#D9DDD6] rounded mb-1.5" style={{ width: `${100 + (i * 23) % 80}px` }} />
                  <div className="h-2 bg-[#E5E7EB] rounded" style={{ width: `${60 + (i * 17) % 60}px` }} />
                </div>
                {/* Cost */}
                <div className="h-3.5 w-14 bg-[#D9DDD6] rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
