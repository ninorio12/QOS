'use client'

import { useState, useCallback } from 'react'
import { type Conversation, type Message } from './types'

interface Props {
  conversation: Conversation
  messages: Message[]
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error'

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6B7280]">Score de conversion</span>
        <span className="text-sm font-semibold text-[#111111]">{score}%</span>
      </div>
      <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3462EE] rounded-full transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

export default function KaiAnalysis({ conversation, messages }: Props) {
  const [state, setState] = useState<AnalysisState>('idle')
  const [summary, setSummary] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [suggestion, setSuggestion] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [streamingField, setStreamingField] = useState<'summary' | 'suggestion' | 'action' | null>(null)
  const [copiedSuggestion, setCopiedSuggestion] = useState(false)

  const analyze = useCallback(async () => {
    setState('loading')
    setSummary('')
    setSuggestion('')
    setNextAction('')
    setScore(null)

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => `${m.role === 'user' ? conversation.contact_name ?? 'Lead' : 'Kai'}: ${m.content}`)
      .join('\n\n')

    try {
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

      // Parse score from response — format attendu: "SCORE:72\n..."
      const scoreMatch = fullText.match(/SCORE:(\d+)/)
      if (scoreMatch) {
        setScore(parseInt(scoreMatch[1], 10))
        setSummary(fullText.replace(/SCORE:\d+\n?/, '').trim())
      } else {
        setScore(65) // fallback
      }

      // ─── 2. Message suggéré ───────────────────────────────────
      setStreamingField('suggestion')
      const resSugg = await fetch('/api/kai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suggestion',
          contactName: conversation.contact_name,
          contactCompany: conversation.contact_company,
          leadStage: conversation.lead_stage,
          history,
        }),
      })

      if (!resSugg.ok || !resSugg.body) throw new Error('Erreur suggestion')

      const reader2 = resSugg.body.getReader()
      let suggText = ''
      while (true) {
        const { done, value } = await reader2.read()
        if (done) break
        suggText += dec.decode(value, { stream: true })
        setSuggestion(suggText)
      }
      suggText += dec.decode()

      // ─── 3. Prochaine action ──────────────────────────────────
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

      const reader3 = resAction.body.getReader()
      let actionText = ''
      while (true) {
        const { done, value } = await reader3.read()
        if (done) break
        actionText += dec.decode(value, { stream: true })
        setNextAction(actionText)
      }
      actionText += dec.decode()

      setStreamingField(null)
      setState('done')
    } catch (err) {
      console.error('[KaiAnalysis]', err)
      setState('error')
      setStreamingField(null)
    }
  }, [conversation, messages])

  async function copySuggestion() {
    await navigator.clipboard.writeText(suggestion)
    setCopiedSuggestion(true)
    setTimeout(() => setCopiedSuggestion(false), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 py-5 gap-4">
      {/* Header card */}
      <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-[#111111]">Analyse Kai</p>
            <p className="text-xs text-[#6B7280]">
              {conversation.contact_name ?? 'Contact'} · {conversation.contact_company ?? ''}
            </p>
          </div>
          <button
            onClick={analyze}
            disabled={state === 'loading'}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {state === 'loading' ? 'Analyse...' : state === 'done' ? 'Réanalyser' : 'Analyser'}
          </button>
        </div>

        {score !== null && <ScoreBar score={score} />}

        {state === 'idle' && (
          <p className="text-xs text-[#9CA3AF] mt-2">
            Cliquez sur Analyser pour que Kai évalue ce lead.
          </p>
        )}

        {state === 'error' && (
          <p className="text-xs text-red-500 mt-2">
            Erreur lors de l'analyse. Vérifiez votre clé Anthropic.
          </p>
        )}
      </div>

      {/* Summary */}
      {(summary || streamingField === 'summary') && (
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Résumé du lead</p>
          <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
            {summary}
            {streamingField === 'summary' && (
              <span className="inline-block w-0.5 h-3.5 bg-[#3462EE] ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}

      {/* Suggested message */}
      {(suggestion || streamingField === 'suggestion') && (
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Message suggéré</p>
          <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap mb-3">
            {suggestion}
            {streamingField === 'suggestion' && (
              <span className="inline-block w-0.5 h-3.5 bg-[#3462EE] ml-0.5 animate-pulse align-middle" />
            )}
          </p>
          {state === 'done' && (
            <div className="flex gap-2">
              <button
                onClick={copySuggestion}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#111111] hover:text-[#111111] transition-colors"
              >
                {copiedSuggestion ? 'Copié !' : 'Copier'}
              </button>
              <button
                onClick={analyze}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#111111] hover:text-[#111111] transition-colors"
              >
                Regénérer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Next action */}
      {(nextAction || streamingField === 'action') && (
        <div className="bg-white rounded-xl p-4 border border-[#E5E7EB]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Prochaine action</p>
          <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
            {nextAction}
            {streamingField === 'action' && (
              <span className="inline-block w-0.5 h-3.5 bg-[#3462EE] ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}
    </div>
  )
}
