'use client'

import { useMemo, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Hash,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Zap,
} from 'lucide-react'

type ChannelId = 'general' | 'agents' | 'approvals' | 'clients'
type MessageKind = 'human' | 'agent' | 'system'

type Channel = {
  id: ChannelId
  name: string
  description: string
  unread: number
  accent: string
}

type ThreadMessage = {
  id: string
  author: string
  role: string
  body: string
  time: string
  kind: MessageKind
}

const channels: Channel[] = [
  {
    id: 'general',
    name: 'général',
    description: 'Décisions internes, contexte projet, priorités du jour',
    unread: 3,
    accent: '#4A91A8',
  },
  {
    id: 'agents',
    name: 'agents-live',
    description: 'Runs, statuts et messages courts des agents IA',
    unread: 5,
    accent: '#8B5CF6',
  },
  {
    id: 'approvals',
    name: 'validations',
    description: 'Actions sensibles à approuver avant exécution',
    unread: 1,
    accent: '#F59E0B',
  },
  {
    id: 'clients',
    name: 'signaux-clients',
    description: 'Messages entrants reliés aux contacts et opportunités',
    unread: 0,
    accent: '#1A5C38',
  },
]

const messagesByChannel: Record<ChannelId, ThreadMessage[]> = {
  general: [
    {
      id: 'm1',
      author: 'Thomas',
      role: 'Founder',
      body: 'On garde le SaaS cohérent : sidebar, header, mêmes cards, même logique que Pipeline.',
      time: '09:41',
      kind: 'human',
    },
    {
      id: 'm2',
      author: 'VividFlow',
      role: 'Orchestrateur',
      body: 'Reçu. Le module Communication devient le point central interne : messages, décisions, tâches, approvals et contexte agent.',
      time: '09:42',
      kind: 'agent',
    },
    {
      id: 'm3',
      author: 'Système',
      role: 'Routing',
      body: 'Décision enregistrée : ne jamais sortir du design système existant sans validation.',
      time: '09:43',
      kind: 'system',
    },
  ],
  agents: [
    {
      id: 'a1',
      author: 'VividFlow',
      role: 'COO Agent',
      body: 'Heartbeat terminé. 4 conversations à qualifier, 1 relance à valider, 2 tâches créées.',
      time: 'Live',
      kind: 'agent',
    },
    {
      id: 'a2',
      author: 'Kai',
      role: 'CSM Agent',
      body: 'Signal chaud détecté dans Conversations : demande de devis avec budget explicite.',
      time: 'Live',
      kind: 'agent',
    },
  ],
  approvals: [
    {
      id: 'v1',
      author: 'Policy Guard',
      role: 'Validation',
      body: 'Message client préparé. Envoi bloqué tant qu’un humain ne valide pas le contenu.',
      time: 'À valider',
      kind: 'system',
    },
  ],
  clients: [
    {
      id: 'c1',
      author: 'WhatsApp',
      role: 'Canal',
      body: 'Nouveau message entrant lié au contact “Martin Dupont”. Proposition : créer opportunité Pipeline.',
      time: '08:59',
      kind: 'system',
    },
  ],
}

function ChannelButton({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
        active
          ? 'bg-soren-card border-[#C8CBD0] shadow-sm'
          : 'bg-transparent border-transparent hover:bg-soren-card/70 hover:border-soren-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: channel.accent }} />
          <span className="text-xs font-bold text-soren-text truncate">#{channel.name}</span>
        </div>
        {channel.unread > 0 && (
          <span className="text-[9px] font-bold bg-soren-sidebar text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {channel.unread}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-soren-subtle line-clamp-2">{channel.description}</p>
    </button>
  )
}

function MessageBubble({ message }: { message: ThreadMessage }) {
  const isHuman = message.kind === 'human'
  const isAgent = message.kind === 'agent'

  return (
    <div className={`flex gap-2.5 ${isHuman ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-soren-border"
        style={{ background: isHuman ? '#111111' : isAgent ? '#4A91A815' : '#F5F5F0' }}
      >
        {isHuman ? <User size={14} className="text-white" /> : isAgent ? <Bot size={14} className="text-[#4A91A8]" /> : <Sparkles size={14} className="text-soren-subtle" />}
      </div>
      <div className={`max-w-[72%] ${isHuman ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[11px] font-bold text-soren-text">{message.author}</span>
          <span className="text-[10px] text-soren-subtle">{message.role}</span>
          <span className="text-[10px] text-[#C8CBD0]">{message.time}</span>
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2.5 border text-[13px] leading-relaxed shadow-sm ${
            isHuman
              ? 'bg-soren-sidebar text-white border-soren-sidebar rounded-tr-md'
              : 'bg-soren-card text-soren-muted border-soren-border rounded-tl-md'
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}

function ContextPanel({ channel }: { channel: Channel }) {
  const actions = [
    { label: 'Créer une tâche', icon: CheckCircle2, color: '#22c55e' },
    { label: 'Lier à un contact', icon: Users, color: '#4A91A8' },
    { label: 'Demander validation', icon: ShieldCheck, color: '#F59E0B' },
    { label: 'Ajouter à la mémoire', icon: Sparkles, color: '#8B5CF6' },
  ]

  return (
    <aside className="w-[300px] flex-shrink-0 bg-soren-card border-l border-soren-border flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-soren-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-soren-subtle">Contexte</p>
        <h2 className="text-sm font-black text-soren-text mt-1">#{channel.name}</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="rounded-2xl bg-soren-elevated p-3 border border-soren-border/60">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} className="text-[#4A91A8]" />
            <p className="text-xs font-bold text-soren-text">Suggestion IA</p>
          </div>
          <p className="text-[11px] leading-relaxed text-soren-muted">
            Résumer ce thread, extraire les décisions et créer les actions associées dans Tâches.
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-soren-subtle mb-2">Actions rapides</p>
          <div className="space-y-2">
            {actions.map(action => {
              const Icon = action.icon
              return (
                <button key={action.label} className="w-full flex items-center justify-between rounded-xl bg-soren-elevated hover:bg-[#EBEDE8] border border-transparent hover:border-soren-border px-3 py-2 transition-colors">
                  <span className="flex items-center gap-2 text-xs font-semibold text-soren-text">
                    <Icon size={13} style={{ color: action.color }} />
                    {action.label}
                  </span>
                  <ChevronRight size={13} className="text-soren-subtle" />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-soren-subtle mb-2">Liens CRM</p>
          <div className="rounded-xl border border-soren-border bg-white px-3 py-2">
            <p className="text-xs font-semibold text-soren-text">Pipeline principal</p>
            <p className="text-[11px] text-soren-subtle mt-0.5">2 opportunités liées</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function CommunicationView() {
  const [selectedId, setSelectedId] = useState<ChannelId>('general')
  const [draft, setDraft] = useState('')
  const selected = useMemo(() => channels.find(c => c.id === selectedId) ?? channels[0], [selectedId])
  const messages = messagesByChannel[selected.id]

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-soren-app" style={{ animation: 'fadeSlideUp 400ms ease-out 0ms both' }}>
      <aside className="w-[300px] flex-shrink-0 bg-[#F5F5F0] border-r border-soren-border flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-soren-border bg-soren-app/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-black text-soren-text leading-tight">Communication</h1>
              <p className="text-xs text-soren-muted mt-0.5">Inbox interne façon WhatsApp, reliée au CRM.</p>
            </div>
            <button className="w-8 h-8 rounded-xl bg-soren-sidebar text-white flex items-center justify-center hover:bg-[#2a2a2a] transition-colors">
              <Plus size={15} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-soren-subtle" />
            <input
              placeholder="Rechercher un canal…"
              className="w-full h-9 rounded-xl bg-soren-card border border-soren-border pl-8 pr-3 text-xs text-soren-text outline-none focus:ring-2 focus:ring-[#4A91A8]/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {channels.map(channel => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              active={channel.id === selected.id}
              onClick={() => setSelectedId(channel.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col bg-soren-app">
        <div className="h-14 px-5 border-b border-soren-border bg-soren-app/95 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-soren-card border border-soren-border flex items-center justify-center">
              <Hash size={15} style={{ color: selected.accent }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-soren-text truncate">#{selected.name}</h2>
              <p className="text-[11px] text-soren-subtle truncate">{selected.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-[#22c55e]/10 text-[#16a34a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" /> Live
            </span>
            <button className="h-8 px-3 rounded-xl bg-soren-card border border-soren-border text-xs font-semibold text-soren-text hover:bg-soren-elevated transition-colors">
              Résumer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="mx-auto max-w-xl rounded-2xl bg-[#4A91A8]/10 border border-[#4A91A8]/15 px-4 py-2.5 text-center">
            <p className="text-[11px] leading-relaxed text-[#4A91A8] font-semibold">
              Les messages importants peuvent devenir des tâches, approvals, notes mémoire ou opportunités Pipeline.
            </p>
          </div>
          {messages.map(message => <MessageBubble key={message.id} message={message} />)}
        </div>

        <div className="px-5 py-3 border-t border-soren-border bg-soren-app flex-shrink-0">
          <div className="flex items-end gap-2 bg-soren-card border border-soren-border rounded-2xl px-2 py-2 shadow-sm">
            <button className="w-9 h-9 rounded-xl bg-soren-elevated flex items-center justify-center text-soren-subtle hover:text-soren-text transition-colors">
              <Paperclip size={15} />
            </button>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={1}
              placeholder="Écrire un message interne…"
              className="flex-1 resize-none bg-transparent py-2 text-sm text-soren-text placeholder-soren-subtle outline-none max-h-28"
            />
            <button
              disabled={!draft.trim()}
              className="w-9 h-9 rounded-xl bg-soren-sidebar disabled:opacity-30 text-white flex items-center justify-center hover:bg-[#2a2a2a] transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </section>

      <ContextPanel channel={selected} />
    </div>
  )
}
