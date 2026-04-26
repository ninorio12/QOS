export default function TranscriptsLoading() {
  return (
    <div className="h-full flex overflow-hidden animate-pulse">

      {/* Left: transcript list */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-soren-border bg-soren-card">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <div className="h-7 w-32 bg-[#D9DDD6] rounded-xl mb-3" />
          <div className="h-8 w-full bg-soren-elevated rounded-xl" />
        </div>

        {/* Canal pills */}
        <div className="flex gap-1.5 px-5 pb-3 flex-shrink-0">
          {[48, 64, 60].map((w, i) => (
            <div key={i} className="h-6 rounded-full bg-soren-elevated" style={{ width: w }} />
          ))}
        </div>

        {/* Transcript items */}
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-[#F3F4F6]">
              <div className="w-9 h-9 rounded-full bg-[#D9DDD6] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="h-2.5 w-24 bg-[#D9DDD6] rounded" />
                  <div className="h-2 w-10 bg-[#E5E7EB] rounded" />
                </div>
                <div className="h-2 w-full bg-[#E5E7EB] rounded mb-1" />
                <div className="h-2 w-3/4 bg-[#E5E7EB] rounded" />
                {/* Canal badge */}
                <div className="flex items-center gap-1 mt-2">
                  <div className="h-4 w-16 bg-[#E5E7EB] rounded-full" />
                  <div className="h-3 w-12 bg-[#E5E7EB] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: message thread */}
      <div className="flex-1 flex flex-col bg-soren-app">
        {/* Thread header */}
        <div className="px-6 py-4 bg-soren-card border-b border-soren-border flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#D9DDD6]" />
          <div>
            <div className="h-3 w-36 bg-[#D9DDD6] rounded mb-1.5" />
            <div className="h-2 w-24 bg-[#E5E7EB] rounded" />
          </div>
          <div className="ml-auto flex gap-2">
            <div className="h-6 w-16 bg-[#E5E7EB] rounded-full" />
            <div className="h-6 w-12 bg-[#E5E7EB] rounded-full" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 px-6 py-4 flex flex-col gap-3 overflow-hidden">
          {[
            { me: false, w: '55%' }, { me: true,  w: '42%' },
            { me: false, w: '68%' }, { me: false, w: '38%' },
            { me: true,  w: '50%' }, { me: false, w: '45%' },
          ].map((msg, i) => (
            <div key={i} className={`flex ${msg.me ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${msg.me ? 'bg-[#D9DDD6]' : 'bg-soren-card border border-soren-border'}`}
                style={{ width: msg.w }}
              >
                <div className={`h-2.5 rounded mb-1.5 ${msg.me ? 'bg-[#C4C8C0]' : 'bg-[#E5E7EB]'}`} />
                <div className={`h-2 rounded w-3/4 ${msg.me ? 'bg-[#C4C8C0]' : 'bg-[#E5E7EB]'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
