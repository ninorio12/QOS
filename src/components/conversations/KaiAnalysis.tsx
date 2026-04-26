'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { type Conversation, type Message } from './types'

interface Props {
  conversation: Conversation
  messages: Message[]
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error'

export default function KaiAnalysis({ conversation, messages }: Props) {
  const [state, setState] = useState<AnalysisState>('idle')
  const [summary, setSummary] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [streamingField, setStreamingField] = useState<'summary' | 'action' | null>(null)
  // Track the conversation ID that was last analyzed — resets on conversation change
  const analyzedConvId = useRef<string | null>(null)

  const analyze = useCallback(async () => {
    setState('loading')
    setSummary('')
    setNextAction('')

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => `${m.role === 'user' ? conversation.contact_name ?? 'Lead' : 'Kai'}: ${m.content}`)
      .join('\n\n')

    try {
      // NOTE: All three calls below use raw fetch intentionally — they consume
      // ReadableStream (SSE streaming). fetchJSON from @/lib/fetchJSON calls
      // res.json() which consumes the body and cannot be used for streaming responses.

      // ─── 1. Score + résumé ────────────────────────────────────
      setStreamingField('summary')
      const resAnalysis = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analysis',
          contactName: conversation.contact_name,
          contactCompany: conversation.contact_company,
          leadStage: conversation.lead_stage,
          history,
        }),
      })

      if (!resAnalysis.ok || !resAnalysis.body) throw new Error('Erreur analyse')

      const reader1 = resAnalysis.body.getReader()
      const dec = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader1.read()
        if (done) break
        fullText += dec.decode(value, { stream: true })
        setSummary(fullText)
      }
      fullText += dec.decode()
      setSummary(fullText.replace(/SCORE:\d+\n?/, '').trim())

      setSummary(fullText.replace(/SCORE:\d+\n?/, '').trim())

      // ─── 2. Prochaine action ──────────────────────────────────
      setStreamingField('action')
      const resAction = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'action',
          contactName: conversation.contact_name,
          contactCompany: conversation.contact_company,
          leadStage: conversation.lead_stage,
          history,
        }),
      })

      if (!resAction.ok || !resAction.body) throw new Error('Erreur action')

      const reader2 = resAction.body.getReader()
      let actionText = ''
      while (true) {
        const { done, value } = await reader2.read()
        if (done) break
        actionText += dec.decode(value, { stream: true })
        setNextAction(actionText)
      }
      actionText += dec.decode()
      setNextAction(actionText.trim())

      setStreamingField(null)
      setState('done')
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[KaiAnalysis]', err)
      setState('error')
      setStreamingField(null)
    }
  }, [conversation, messages])

  // Re-analyze whenever the conversation changes or messages first load
  useEffect(() => {
    if (messages.length === 0) return
    if (analyzedConvId.current === conversation.id) return
    analyzedConvId.current = conversation.id
    void analyze()
  }, [conversation.id, messages.length])

  return (
    <div className="flex flex-col overflow-y-auto px-5 py-5 gap-4">

      {state === 'error' && (
        <p className="text-xs text-red-500">Erreur lors de l'analyse. Vérifiez votre clé Anthropic.</p>
      )}

      {state === 'loading' && !summary && (
        <div className="flex items-center gap-2 text-[11px] text-soren-subtle">
          <Sparkles size={11} className="text-[#8B5CF6] animate-pulse" />
          Analyse en cours…
        </div>
      )}
    </div>
  )
}
