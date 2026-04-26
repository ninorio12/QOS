export default function ConversationsLoading() {
  return (
    <div className="h-full flex overflow-hidden animate-pulse">
      {/* Left nav */}
      <div className="w-40 flex-shrink-0 border-r border-soren-border bg-soren-card p-3 flex flex-col gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-full bg-soren-border rounded-xl" />
        ))}
      </div>

      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-soren-border bg-soren-card flex flex-col">
        <div className="p-3 border-b border-soren-border">
          <div className="h-8 w-full bg-soren-border rounded-xl" />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border-b border-[#F3F4F6]">
              <div className="w-9 h-9 rounded-full bg-soren-border flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <div className="h-2.5 w-24 bg-soren-border rounded" />
                  <div className="h-2 w-10 bg-soren-border rounded" />
                </div>
                <div className="h-2 w-36 bg-soren-border rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col bg-soren-card">
        <div className="flex items-center gap-3 p-4 border-b border-soren-border">
          <div className="w-10 h-10 rounded-full bg-soren-border" />
          <div>
            <div className="h-3 w-32 bg-soren-border rounded mb-1.5" />
            <div className="h-2 w-20 bg-soren-border rounded" />
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          {[false, true, false, false, true].map((isMe, i) => (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`h-10 rounded-2xl ${isMe ? 'bg-soren-border' : 'bg-soren-border'}`}
                style={{ width: `${30 + (i * 7) % 30}%` }}
              />
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-soren-border">
          <div className="h-10 w-full bg-soren-border rounded-xl" />
        </div>
      </div>
    </div>
  )
}
