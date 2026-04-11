export default function DevisLoading() {
  return (
    <div className="h-full flex flex-col p-6 gap-4 animate-pulse bg-[#EEF0EB]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="h-8 w-32 bg-white rounded-xl shadow-sm" />
        <div className="h-9 w-36 bg-white rounded-xl shadow-sm" />
      </div>
      <div className="grid grid-cols-3 gap-4 flex-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E7EB] flex flex-col gap-3">
            <div className="h-3 w-24 bg-[#E5E7EB] rounded" />
            <div className="h-6 w-32 bg-[#D9DDD6] rounded-lg" />
            <div className="h-3 w-16 bg-[#E5E7EB] rounded" />
            <div className="mt-auto h-8 w-full bg-[#E5E7EB] rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
