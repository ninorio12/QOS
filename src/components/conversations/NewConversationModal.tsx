'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, MessageCircle, MessageSquare, Mail, Loader2 } from 'lucide-react'
import { getAvatarColor } from '@/components/contacts/types'
import type { Conversation } from './types'

type GHLContact = {
  id:      string
  name:    string
  company: string | null
  phone:   string | null
  email:   string | null
}

type Channel = 'WhatsApp' | 'SMS' | 'Email'

const CHANNELS: { id: Channel; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'WhatsApp', label: 'WhatsApp', color: '#22c55e',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    id: 'SMS', label: 'SMS', color: '#0EA5E9',
    icon: <MessageSquare size={14} color="#0EA5E9" />,
  },
  {
    id: 'Email', label: 'Email', color: '#F43F5E',
    icon: <Mail size={14} color="#F43F5E" />,
  },
]

export default function NewConversationModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void
  onCreated: (conv: Conversation) => void
}) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<GHLContact[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<GHLContact | null>(null)
  const [channel,  setChannel]  = useState<Channel>('WhatsApp')
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showList, setShowList] = useState(false)
  const searchRef  = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recherche GHL debouncée
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setShowList(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`)
        const data = await res.json() as { contacts: GHLContact[] }
        setResults(data.contacts ?? [])
        setShowList(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  function selectContact(c: GHLContact) {
    setSelected(c)
    setQuery(c.name)
    setShowList(false)
    setResults([])
  }

  function clearContact() {
    setSelected(null)
    setQuery('')
    setResults([])
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/conversations/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId:      selected.id,
          contactName:    selected.name,
          contactPhone:   selected.phone,
          contactEmail:   selected.email,
          contactCompany: selected.company,
          channel,
          message: message.trim() || undefined,
        }),
      })
      const data = await res.json() as { conversation?: Conversation; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erreur lors de la création')
        return
      }
      onCreated(data.conversation!)
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSending(false)
    }
  }

  const initials  = selected ? (selected.name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase() : ''
  const color     = selected ? getAvatarColor(initials) : '#9CA3AF'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-soren-card rounded-2xl w-full max-w-md shadow-2xl border border-soren-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
          <p className="text-sm font-semibold text-soren-text">Nouvelle conversation</p>
          <button onClick={onClose} className="text-soren-subtle hover:text-[#111] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

          {/* Recherche contact */}
          <div>
            <label className="block text-xs font-medium text-soren-muted mb-1.5">Contact</label>
            <div className="relative">
              {selected ? (
                /* Contact sélectionné */
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#F9F9F7] border border-soren-border rounded-xl">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: color + '22', color }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-soren-text truncate">{selected.name}</p>
                    {selected.company && <p className="text-xs text-soren-subtle truncate">{selected.company}</p>}
                  </div>
                  <button type="button" onClick={clearContact} className="text-soren-subtle hover:text-[#111] transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Champ de recherche */
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle" />
                  <input
                    ref={searchRef}
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Rechercher un contact GHL..."
                    className="w-full pl-9 pr-4 py-2.5 bg-[#F9F9F7] border border-soren-border rounded-xl text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors"
                  />
                  {loading && (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-soren-subtle animate-spin" />
                  )}
                </div>
              )}

              {/* Dropdown résultats */}
              {showList && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-soren-card border border-soren-border rounded-xl shadow-xl z-10 overflow-hidden max-h-52 overflow-y-auto">
                  {results.map(c => {
                    const ini = (c.name.split(' ').map(w => w[0]).join('').slice(0, 2) || '??').toUpperCase()
                    const col = getAvatarColor(ini)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectContact(c)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-soren-elevated transition-colors text-left border-b border-[#F3F4F6] last:border-0"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: col + '22', color: col }}
                        >
                          {ini}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-soren-text truncate">{c.name}</p>
                          <p className="text-xs text-soren-subtle truncate">
                            {c.company ?? c.phone ?? c.email ?? '—'}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {showList && results.length === 0 && !loading && query.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-soren-card border border-soren-border rounded-xl shadow-xl z-10 px-4 py-3 text-xs text-soren-subtle">
                  Aucun contact trouvé
                </div>
              )}
            </div>
          </div>

          {/* Canal */}
          <div>
            <label className="block text-xs font-medium text-soren-muted mb-1.5">Canal</label>
            <div className="flex gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                    channel === ch.id
                      ? 'border-current'
                      : 'border-soren-border text-soren-muted hover:border-[#D1D5DB]'
                  }`}
                  style={channel === ch.id ? { borderColor: ch.color, color: ch.color, background: ch.color + '10' } : {}}
                >
                  {ch.icon}
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message optionnel */}
          <div>
            <label className="block text-xs font-medium text-soren-muted mb-1.5">
              Premier message <span className="text-soren-subtle font-normal">(optionnel)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Bonjour, je vous contacte au sujet de..."
              className="w-full px-3 py-2.5 bg-[#F9F9F7] border border-soren-border rounded-xl text-sm text-soren-text placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-soren-border text-sm text-soren-muted hover:border-[#D1D5DB] hover:text-[#111] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!selected || sending}
              className="flex-1 py-2.5 rounded-xl bg-soren-sidebar text-white text-sm font-semibold hover:bg-[#222] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <><Loader2 size={13} className="animate-spin" /> Création...</>
              ) : (
                message.trim() ? 'Envoyer' : 'Ouvrir'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
