export default function ParametresLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden animate-pulse">
      {/* Tab bar */}
      <div className="px-6 pt-5 pb-0 flex-shrink-0">
        <div className="flex gap-1 border-b border-soren-border">
          {[72, 84, 64].map((w, i) => (
            <div key={i} className="pb-3">
              <div className={`h-2.5 rounded ${i === 0 ? 'bg-soren-border' : 'bg-soren-border'}`} style={{ width: w }} />
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-hidden px-6 py-5">
        <div className="max-w-xl space-y-6">

          {/* Logo + company name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-soren-border flex-shrink-0" />
            <div className="flex-1">
              <div className="h-2.5 w-28 bg-soren-border rounded mb-2" />
              <div className="h-9 w-full bg-soren-elevated rounded-xl" />
            </div>
          </div>

          {/* Section label */}
          <div className="h-2 w-32 bg-soren-border rounded" />

          {/* 2-column grid fields */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="h-2.5 w-20 bg-soren-border rounded mb-2" />
                <div className="h-9 w-full bg-soren-elevated rounded-xl" />
              </div>
            ))}
          </div>

          {/* Full-width fields */}
          <div>
            <div className="h-2 w-24 bg-soren-border rounded mb-2" />
            <div className="h-9 w-full bg-soren-elevated rounded-xl" />
          </div>

          {/* Section label */}
          <div className="h-2 w-40 bg-soren-border rounded" />

          {/* Brand color + selects */}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-2.5 w-24 bg-soren-border rounded mb-2" />
                <div className="h-9 w-full bg-soren-elevated rounded-xl" />
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <div className="h-9 w-28 bg-soren-border rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
