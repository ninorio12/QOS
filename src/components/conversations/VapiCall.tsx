'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { type Conversation } from './types'
import { SYSTEM_PROMPT_DEFAULT } from '@/lib/agent-config'

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error'

const STATUS_META: Record<CallStatus, { label: string; color: string }> = {
  idle:       { label: 'En attente',  color: '#9CA3AF' },
  connecting: { label: 'Connexion…',  color: '#EFE347' },
  active:     { label: 'En cours',    color: '#22c55e' },
  ended:      { label: 'Terminé',     color: '#3462EE' },
  error:      { label: 'Erreur',      color: '#EF4444' },
}

interface Props {
  conversation: Conversation
}

export default function VapiCall({ conversation }: Props) {
  const [status, setStatus]         = useState<CallStatus>('idle')
  const [duration, setDuration]     = useState(0)
  const [log, setLog]               = useState<string[]>([])
  const [isMuted, setMuted]         = useState(false)
  const [instructions, setInstr]    = useState(
    `Tu es Kai, assistant commercial BTP. Tu parles avec ${conversation.contact_name ?? 'un prospect'}. ${SYSTEM_PROMPT_DEFAULT}`
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef  = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog(prev => [`[${t}] ${msg}`, ...prev].slice(0, 50))
  }, [])

  // Init Vapi SDK once
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
    }).catch(() => addLog('SDK Vapi non disponible — vérifiez le package @vapi-ai/web'))

    return () => {
      vapiRef.current?.stop?.()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [addLog])

  // Reset instructions when conversation changes
  useEffect(() => {
    setInstr(`Tu es Kai, assistant commercial BTP. Tu parles avec ${conversation.contact_name ?? 'un prospect'}. ${SYSTEM_PROMPT_DEFAULT}`)
    setStatus('idle')
    setDuration(0)
    setLog([])
  }, [conversation.id, conversation.contact_name])

  async function startCall() {
    const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY
    if (!apiKey)           { addLog('NEXT_PUBLIC_VAPI_API_KEY manquante'); return }
    if (!vapiRef.current)  { addLog('SDK Vapi non initialisé'); return }

    setStatus('connecting')
    setDuration(0)
    setLog([])
    addLog(`Lancement appel avec ${conversation.contact_name ?? 'contact'}…`)

    try {
      await vapiRef.current.start({
        name: 'Kai',
        model: {
          provider: 'anthropic',
          model: 'claude-haiku-4-5-20251001',
          systemPrompt: instructions,
        },
        voice: { provider: '11labs', voiceId: 'rachel' },
        firstMessage: `Bonjour${conversation.contact_name ? ` ${conversation.contact_name.split(' ')[0]}` : ''} ! Je suis Kai, votre assistant Qorpo BTP. Comment puis-je vous aider aujourd'hui ?`,
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
    addLog("Appel raccroché")
  }

  function toggleMute() {
    if (!vapiRef.current) return
    const next = !isMuted
    setMuted(next)
    vapiRef.current.setMuted?.(next)
    addLog(next ? 'Micro coupé' : 'Micro réactivé')
  }

  const meta    = STATUS_META[status]
  const isBusy  = status === 'connecting' || status === 'active'
  const fmt     = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 py-5 gap-4">
      {/* Contact card */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Contact</p>
        <p className="text-sm font-semibold text-[#111111]">{conversation.contact_name ?? 'Contact inconnu'}</p>
        {conversation.contact_company && (
          <p className="text-xs text-[#6B7280]">{conversation.contact_company}</p>
        )}
        {conversation.contact_phone && (
          <p className="text-xs text-[#9CA3AF] mt-1 font-mono">{conversation.contact_phone}</p>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Instructions pour Kai</p>
        <textarea
          value={instructions}
          onChange={e => setInstr(e.target.value)}
          disabled={isBusy}
          rows={4}
          className="w-full text-xs text-[#374151] bg-[#F8F8F6] border border-[#E5E7EB] rounded-lg p-2.5 resize-none outline-none focus:border-[#3462EE] disabled:opacity-50 transition-colors"
        />
      </div>

      {/* Call controls */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: meta.color, boxShadow: isBusy ? `0 0 6px ${meta.color}` : 'none' }}
            />
            <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
            {status === 'active' && (
              <span className="text-xs text-[#9CA3AF] font-mono">{fmt(duration)}</span>
            )}
          </div>
          <div className="flex gap-2">
            {status === 'active' && (
              <button
                onClick={toggleMute}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                  isMuted
                    ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#111111] hover:text-[#111111]'
                }`}
              >
                {isMuted ? 'Micro coupé' : 'Couper micro'}
              </button>
            )}
            {isBusy ? (
              <button
                onClick={stopCall}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#EF4444] text-white hover:bg-[#dc2626] transition-colors"
              >
                Raccrocher
              </button>
            ) : (
              <button
                onClick={startCall}
                disabled={!process.env.NEXT_PUBLIC_VAPI_API_KEY}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Appeler
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-[#9CA3AF]">
          Appel web via Vapi — votre navigateur doit autoriser le microphone.
        </p>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Journal</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {log.map((entry, i) => (
              <p key={i} className="text-[11px] text-[#6B7280] font-mono">{entry}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
