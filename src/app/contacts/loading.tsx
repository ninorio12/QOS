export default function ContactsLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="h-8 w-28 bg-[#D9DDD6] rounded-xl" />
        <div className="flex gap-2">
          <div className="h-9 w-56 bg-[#E5E7EB] rounded-xl" />
          <div className="h-9 w-24 bg-[#D9DDD6] rounded-xl" />
          <div className="h-9 w-9 bg-[#E5E7EB] rounded-xl" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 mx-6 bg-soren-card rounded-2xl border border-soren-border shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center px-4 py-3 border-b border-soren-border gap-4">
          {[120, 100, 80, 100, 80, 70].map((w, i) => (
            <div key={i} className="h-2.5 bg-[#E5E7EB] rounded" style={{ width: w }} />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-3 border-b border-[#F3F4F6] gap-4"
          >
            <div className="flex items-center gap-2.5" style={{ width: 120 }}>
              <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex-shrink-0" />
              <div className="h-2.5 flex-1 bg-[#D9DDD6] rounded" />
            </div>
            <div className="h-2.5 bg-[#E5E7EB] rounded" style={{ width: 100 }} />
            <div className="h-2.5 bg-[#E5E7EB] rounded" style={{ width: 80 }} />
            <div className="h-5 w-24 bg-[#E5E7EB] rounded-full" />
            <div className="h-2.5 bg-[#E5E7EB] rounded ml-auto" style={{ width: 70 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
