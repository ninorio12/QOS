'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Phone, PhoneOff, Send, RotateCcw, Mic, MicOff, MessageSquare } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type CallStatus = 'idle' | 'connecting' | 'ringing' | 'active' | 'ended' | 'error'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

// ─── Section label ────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">{label}</p>
}

// ─── Call status badge ────────────────────────────────────────
const CALL_STATUS_META: Record<CallStatus, { label: string; color: string; bg: string; pulse: boolean }> = {
  idle:       { label: 'En attente',  color: '#3D4F6B', bg: '#3D4F6B20', pulse: false },
  connecting: { label: 'Connexion…',  color: '#EFE347', bg: '#EFE34720', pulse: true  },
  ringing:    { label: 'Sonnerie…',   color: '#4A91A8', bg: '#4A91A820', pulse: true  },
  active:     { label: 'En cours',    color: '#22c55e', bg: '#22c55e20', pulse: true  },
  ended:      { label: 'Terminé',     color: '#22c55e', bg: '#22c55e15', pulse: false },
  error:      { label: 'Erreur',      color: '#EF4444', bg: '#EF444420', pulse: false },
}

// ─── ① Vocal test ─────────────────────────────────────────────
function VocalTestSection() {
  const [phone, setPhone]       = useState(process.env.NEXT_PUBLIC_TEST_PHONE ?? '+33 6 00 00 00 00')
  const [callStatus, setStatus] = useState<CallStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [isMuted, setMuted]     = useState(false)
  const [callLog, setCallLog]   = useState<string[]>([])

  // Vapi instance stored in ref — browser-only, initialised lazily
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setCallLog(prev => [`[${time}] ${msg}`, ...prev])
  }, [])

  // Initialise Vapi once (browser-only)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
    if (!apiKey || vapiRef.current) return

    import('@vapi-ai/web').then(({ default: Vapi }) => {
      const vapi = new Vapi(apiKey)
      vapiRef.current = vapi

      vapi.on('call-start',   () => { setStatus('active'); addLog('Appel établi — Kai en ligne') })
      vapi.on('call-end',     () => {
        setStatus('ended')
        addLog('Appel terminé')
        if (timerRef.current) clearInterval(timerRef.current)
      })
      vapi.on('speech-start', () => addLog('Kai parle…'))
      vapi.on('speech-end',   () => addLog('Kai a fini de parler'))
      vapi.on('error',        (e: unknown) => {
        setStatus('error')
        addLog(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
        if (timerRef.current) clearInterval(timerRef.current)
      })
    }).catch(() => {
      addLog('SDK Vapi non disponible')
    })

    return () => {
      if (vapiRef.current) vapiRef.current.stop?.()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [addLog])

  async function startCall() {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
    if (!apiKey) { addLog('NEXT_PUBLIC_VAPI_API_KEY non définie'); return }
    if (!vapiRef.current) { addLog('SDK Vapi non initialisé'); return }

    setStatus('connecting')
    setDuration(0)
    setCallLog([])
    addLog('Connexion à Vapi…')

    try {
      setStatus('ringing')
      addLog("Lancement de l'appel test vers " + phone)

      await vapiRef.current.start({
        name: 'Kai',
        model: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
        voice: { provider: '11labs', voiceId: 'rachel' },
        firstMessage: `Bonjour ! Je suis Kai, l'assistant de l'équipe Qorpo BTP. Comment puis-je vous aider avec votre projet ?`,
        systemPrompt: `Tu es Kai, Customer Success Manager d'une agence BTP. Tu qualifies les leads entrants et organises les rendez-vous. Sois direct, chaleureux, et pose des questions sur le projet de construction ou rénovation de l'interlocuteur. Réponds en français.`,
      })

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch (err) {
      setStatus('error')
      addLog(`Échec : ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function stopCall() {
    vapiRef.current?.stop?.()
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('ended')
    addLog("Appel raccroché par l'utilisateur")
  }

  function toggleMute() {
    if (!vapiRef.current) return
    const next = !isMuted
    setMuted(next)
    vapiRef.current.setMuted?.(next)
    addLog(next ? 'Micro coupé' : 'Micro réactivé')
  }

  function reset() {
    setStatus('idle')
    setDuration(0)
    setCallLog([])
  }

  const meta = CALL_STATUS_META[callStatus]
  const isActive = callStatus === 'active'
  const isBusy   = callStatus === 'connecting' || callStatus === 'ringing' || callStatus === 'active'

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <div className="space-y-5">
      <SectionLabel label="Tester Kai Vocal" />

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
        {/* Description */}
        <p className="text-xs text-[#6B7280]">
          Kai prend en charge les appels sortants pour qualifier les leads BTP. Ce test lance un appel web via le SDK Vapi.
        </p>

        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.pulse ? 'animate-pulse' : ''}`}
              style={{ background: meta.color }} />
            <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
          </div>
          {isActive && (
            <span className="text-xs font-mono text-[#E2FF8D]">{formatDuration(duration)}</span>
          )}
        </div>

        {/* Phone input */}
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-1.5">
            Numéro de téléphone
          </label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={isBusy}
            placeholder="+33 6 00 00 00 00"
            className="w-full bg-[#EEF0EB] border border-[#E5E7EB] text-[#111111] text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#3462EE] placeholder-[#9CA3AF] transition-colors disabled:opacity-50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isBusy ? (
            <button
              onClick={startCall}
              className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Phone size={14} />
              Lancer l&apos;appel test
            </button>
          ) : (
            <>
              <button
                onClick={stopCall}
                className="flex items-center gap-2 bg-[#EF4444] hover:bg-[#dc2626] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <PhoneOff size={14} />
                Raccrocher
              </button>
              <button
                onClick={toggleMute}
                className={`flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${
                  isMuted
                    ? 'border-[#EF4444] text-[#EF4444] bg-[#EF444415]'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#3D4F6B] hover:text-[#111111]'
                }`}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                {isMuted ? 'Réactiver micro' : 'Couper micro'}
              </button>
            </>
          )}
          {(callStatus === 'ended' || callStatus === 'error') && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#111111] transition-colors ml-1">
              <RotateCcw size={12} />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Call log */}
      {callLog.length > 0 && (
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#E5E7EB]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">Log de l&apos;appel</p>
          </div>
          <div className="p-3 space-y-1 max-h-40 overflow-y-auto">
            {callLog.map((l, i) => (
              <p key={i} className="text-[11px] font-mono text-[#6B7280]">{l}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ② Messaging test ─────────────────────────────────────────
const KAI_SYSTEM_NOTE = 'Cette simulation utilise le même prompt que Kai en production'

function MessagingTestSection() {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [isStreaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setStreaming(true)

    // Placeholder streaming bubble
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, agent: 'kai' }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: full, streaming: true } : m
          )
        )
      }

      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { role: 'assistant', content: full, streaming: false } : m
        )
      )
    } catch (err) {
      setMessages(prev =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { role: 'assistant', content: `Erreur : ${err instanceof Error ? err.message : String(err)}`, streaming: false }
            : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionLabel label="Tester Kai Messaging" />
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#111111] transition-colors -mt-3"
          >
            <RotateCcw size={12} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Chat window */}
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl overflow-hidden flex flex-col" style={{ height: 380 }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center">
                <MessageSquare size={18} className="text-[#9CA3AF]" />
              </div>
              <p className="text-xs text-[#9CA3AF]">Envoyez un message pour tester Kai</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-[#4A91A8] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 self-end">
                    K
                  </div>
                )}

                <div className={`max-w-[72%] ${isUser ? '' : ''}`}>
                  {/* Badge above Kai messages */}
                  {!isUser && (
                    <p className="text-[9px] font-bold text-[#4A91A8] mb-1 ml-1 uppercase tracking-wide">
                      Kai — CSM
                    </p>
                  )}

                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-5 ${
                    isUser
                      ? 'bg-[#E2FF8D]/15 border border-[#E2FF8D]/20 text-[#E8F8A0] rounded-tr-sm'
                      : 'bg-white border border-[#E5E7EB] text-[#374151] rounded-tl-sm'
                  }`}>
                    {msg.content || (msg.streaming ? (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A91A8] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A91A8] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A91A8] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : '')}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#E5E7EB] p-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez un message à Kai… (Entrée pour envoyer)"
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-white border border-[#E5E7EB] text-[#111111] text-sm rounded-xl px-3 py-2.5 outline-none resize-none placeholder-[#9CA3AF] focus:border-[#3462EE] transition-colors disabled:opacity-50 leading-5"
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#E2FF8D] hover:bg-[#b5da2f] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={14} className="text-[#121721]" />
          </button>
        </div>
      </div>

      {/* Note */}
      <p className="text-[10px] text-[#9CA3AF] italic text-center">{KAI_SYSTEM_NOTE}</p>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────
export default function TestTab() {
  return (
    <div className="grid grid-cols-2 gap-8 max-w-5xl">
      <VocalTestSection />
      <MessagingTestSection />
    </div>
  )
}
