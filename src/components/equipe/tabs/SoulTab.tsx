'use client'
import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'

interface SoulTabProps {
  agentId: string
  onLoad?: (content: string) => void
}

export function SoulTab({ agentId, onLoad }: SoulTabProps) {
  const [original, setOriginal] = useState('')
  const [content,  setContent]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const isDirty = content !== original

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/openclaw/agents/${agentId}/soul`)
      .then(r => r.json())
      .then((data: { content?: string; error?: string }) => {
        if (data.error) { setError(data.error); return }
        setOriginal(data.content ?? '')
        setContent(data.content ?? '')
        onLoad?.(data.content ?? '')
      })
      .catch(() => setError('Gateway inaccessible'))
      .finally(() => setLoading(false))
  }, [agentId])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/openclaw/agents/${agentId}/soul`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Erreur gateway')
      setOriginal(content)
      setToast('SOUL.md mis à jour ✓')
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-64 bg-white/5 rounded-xl" />
  }

  if (error) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {toast && (
        <div className="px-3 py-2 rounded-lg bg-green-900/40 border border-green-500/30 text-green-400 text-sm">
          {toast}
        </div>
      )}

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="w-full min-h-[320px] bg-black/40 border border-white/10 rounded-xl p-3 font-mono text-xs text-gray-200 resize-y focus:outline-none focus:border-white/30 leading-relaxed"
        spellCheck={false}
      />

      <button
        onClick={handleSave}
        disabled={!isDirty || saving}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          enabled:bg-[#3462EE] enabled:text-white enabled:hover:bg-[#2450CC]"
      >
        <Save size={14} />
        {saving ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  )
}
