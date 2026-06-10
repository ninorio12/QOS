'use client'
import { useState } from 'react'
import { Play, Upload } from 'lucide-react'

interface PromptLabTabProps {
  agentId:     string
  currentSoul: string  // passed from SoulTab's loaded content
}

export function PromptLabTab({ agentId, currentSoul }: PromptLabTabProps) {
  const [labSoul,    setLabSoul]    = useState(currentSoul)
  const [testMsg,    setTestMsg]    = useState('')
  const [response,   setResponse]   = useState('')
  const [testing,    setTesting]    = useState(false)
  const [tested,     setTested]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)

  async function handleTest() {
    if (!testMsg.trim()) return
    setTesting(true)
    setResponse('')
    setTested(false)

    try {
      const res = await fetch('/api/test-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          agent:        agentId,
          systemPrompt: labSoul,
          messages:     [{ role: 'user', content: testMsg }],
        }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setResponse(full)
      }

      setTested(true)
    } catch (e) {
      setResponse(e instanceof Error ? `Erreur: ${e.message}` : 'Erreur inconnue')
    } finally {
      setTesting(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    try {
      const res = await fetch(`/api/openclaw/agents/${agentId}/soul`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: labSoul }),
      })
      if (!res.ok) throw new Error('Erreur gateway')
      setToast('SOUL.md publié et actif ✓')
      setTested(false)
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="px-3 py-2 rounded-lg bg-green-900/40 border border-green-500/30 text-green-400 text-sm">
          {toast}
        </div>
      )}

      {/* SOUL.md temp editor */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">SOUL.md à tester</label>
        <textarea
          value={labSoul}
          onChange={e => { setLabSoul(e.target.value); setTested(false) }}
          className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 resize-y focus:outline-none focus:border-white/30"
          spellCheck={false}
        />
      </div>

      {/* Test message */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Message de test</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={testMsg}
            onChange={e => { setTestMsg(e.target.value); setTested(false) }}
            onKeyDown={e => e.key === 'Enter' && handleTest()}
            placeholder="Ex: Nouveau lead façade 35kCHF, pas de réponse depuis 3h"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleTest}
            disabled={!testMsg.trim() || testing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-[#3462EE] text-white
              disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2450CC] transition-colors"
          >
            <Play size={13} />
            {testing ? '…' : 'Tester'}
          </button>
        </div>
      </div>

      {/* Response */}
      {response && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 min-h-[80px] whitespace-pre-wrap leading-relaxed">
          {response}
          {testing && <span className="animate-pulse ml-1">▋</span>}
        </div>
      )}

      {/* Publish */}
      <button
        onClick={handlePublish}
        disabled={!tested || publishing}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          enabled:bg-[#FF4D00] enabled:text-black enabled:hover:bg-[#b8e120]"
      >
        <Upload size={14} />
        {publishing ? 'Publication…' : 'Publier ce SOUL.md'}
      </button>
      {!tested && !response && (
        <p className="text-xs text-gray-500 text-center -mt-2">
          Testez d'abord pour activer le bouton Publier
        </p>
      )}
    </div>
  )
}
