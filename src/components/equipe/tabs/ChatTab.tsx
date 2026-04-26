'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Wrench } from 'lucide-react'

interface ChatTabProps {
  agentId: string
  accentColor: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
}

export function ChatTab({ agentId, accentColor }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const msg = input.trim()
    if (!msg || loading) return

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`/api/agents/${agentId}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${err.error ?? 'inconnue'}` }])
        return
      }

      const data = await res.json() as { response: string; toolsUsed: string[] }
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   data.response || '(aucune réponse)',
        toolsUsed: data.toolsUsed,
      }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur réseau: ${e instanceof Error ? e.message : String(e)}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-white/20 text-sm">Envoie un message pour interagir avec l'agent.</p>
            <p className="text-white/10 text-xs mt-1">L'agent a accès aux données réelles du CRM.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-soren-card/10 text-white rounded-tr-md'
                : 'bg-black/40 border border-white/10 text-gray-200 rounded-tl-md'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.toolsUsed.map(t => (
                    <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-soren-card/5 border border-white/10 text-white/40">
                      <Wrench size={8} />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/40 border border-white/10 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-soren-card/30 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Message..."
          disabled={loading}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-40 transition-colors flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          <Send size={14} className="text-black" />
        </button>
      </div>
    </div>
  )
}
