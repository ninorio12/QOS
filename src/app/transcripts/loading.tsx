export default function Loading() {
  return (
    <div className="h-full flex flex-col p-5 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="h-8 w-36 bg-[#D9DDD6] rounded-xl" />
        <div className="h-9 w-28 bg-[#E5E7EB] rounded-xl" />
      </div>

      {/* Content blocks */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm h-24 p-4 flex flex-col justify-between">
          <div className="h-3 w-48 bg-[#E5E7EB] rounded" />
          <div className="h-2.5 w-64 bg-[#D9DDD6] rounded" />
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6]">
                <div className="w-8 h-8 rounded-xl bg-[#E5E7EB] flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-2.5 w-40 bg-[#D9DDD6] rounded mb-1.5" />
                  <div className="h-2 w-24 bg-[#E5E7EB] rounded" />
                </div>
                <div className="h-2.5 w-16 bg-[#E5E7EB] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
