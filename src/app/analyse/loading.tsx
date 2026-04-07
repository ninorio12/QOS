export default function AnalyseLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="h-8 w-24 bg-[#D9DDD6] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-[#E5E7EB] rounded-xl" />
          <div className="h-9 w-28 bg-[#E5E7EB] rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-sm">
            <div className="h-2.5 w-20 bg-[#E5E7EB] rounded mb-3" />
            <div className="h-7 w-14 bg-[#D9DDD6] rounded-lg" />
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-sm flex flex-col">
            <div className="h-3 w-32 bg-[#E5E7EB] rounded mb-4" />
            <div className="flex-1 flex items-end gap-2 pb-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <div
                  key={j}
                  className="flex-1 bg-[#E5E7EB] rounded-t"
                  style={{ height: `${20 + (j * 11) % 60}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
