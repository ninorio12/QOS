# Conversations Module — Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le module `/conversations` en 3 panneaux (Nav + Liste + Thread), ajouter un onglet Kai IA (analyse lead + message suggéré) et un onglet Vocal (appel Vapi via SDK navigateur).

**Architecture:** 3 composants panneaux indépendants (`InboxNav`, `ConversationList`, thread `MessageThread` amélioré) orchestrés par `ConversationsView`. L'onglet Kai IA appelle `/api/kai-analysis` en streaming. L'onglet Vocal réutilise le pattern `@vapi-ai/web` existant dans `TestTab.tsx`.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Supabase Realtime, Anthropic SDK (streaming), `@vapi-ai/web` (SDK navigateur Vapi)

---

## Fichiers concernés

| Action | Fichier | Rôle |
|---|---|---|
| Modifier | `src/components/conversations/types.ts` | Ajouter `lead_stage` |
| Modifier | `src/components/conversations/ConversationsView.tsx` | Layout 3 panneaux |
| Modifier | `src/components/conversations/MessageThread.tsx` | Tabs + bubbles redesign |
| Créer | `src/components/conversations/InboxNav.tsx` | Panneau gauche sombre |
| Créer | `src/components/conversations/ConversationList.tsx` | Panneau milieu |
| Créer | `src/components/conversations/KaiAnalysis.tsx` | Onglet Kai IA |
| Créer | `src/components/conversations/VapiCall.tsx` | Onglet Vocal |
| Créer | `src/app/api/kai-analysis/route.ts` | Streaming Claude analyse lead |

---

## Task 1: Mettre à jour types.ts

**Files:**
- Modify: `src/components/conversations/types.ts`

- [ ] **Step 1: Ajouter `lead_stage` au type `Conversation`**

Remplacer le type existant par :

```typescript
export type Channel = 'email' | 'phone' | 'sms' | 'whatsapp' | 'meeting' | 'note'

export type LeadStage = 'hot' | 'vip' | 'new' | 'payments' | 'client' | 'cold' | null

export type Conversation = {
  id: string
  user_id: string
  lead_id: string | null
  contact_id: string | null
  channel: Channel
  subject: string | null
  summary: string | null
  created_at: string
  updated_at: string
  // joined fields
  contact_name?: string
  contact_company?: string
  contact_phone?: string | null
  last_message?: string
  last_message_at?: string
  unread?: number
  lead_stage?: LeadStage
}

export type Message = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export const CHANNEL_META: Record<Channel, { label: string; color: string; bg: string }> = {
  email:    { label: 'Email',    color: '#4A91A8', bg: '#4A91A8' + '18' },
  phone:    { label: 'Appel',   color: '#6B7280', bg: '#6B7280' + '18' },
  sms:      { label: 'SMS',     color: '#8896AB', bg: '#8896AB' + '18' },
  whatsapp: { label: 'WhatsApp',color: '#22c55e', bg: '#22c55e' + '18' },
  meeting:  { label: 'Réunion', color: '#3462EE', bg: '#3462EE' + '18' },
  note:     { label: 'Note',    color: '#6B7280', bg: '#6B7280' + '18' },
}

export const LEAD_STAGE_LABEL: Record<NonNullable<LeadStage>, string> = {
  hot:      'Hot Lead',
  vip:      'VIP Lead',
  new:      'Nouveau Lead',
  payments: 'Paiements',
  client:   'Client',
  cold:     'Cold Lead',
}

// AI mock responses
export const AI_RESPONSES = [
  "Bonjour, j'ai bien analysé votre dossier. Ce projet de rénovation présente un potentiel intéressant. Je recommande d'envoyer un devis détaillé sous 48h pour maintenir l'intérêt du prospect.",
  "Suite à notre échange, j'ai identifié 3 points clés à aborder lors du prochain contact : le budget global, le calendrier des travaux, et les garanties décennales.",
  "J'ai préparé un résumé de cette conversation. Points importants : le client souhaite démarrer en avril, budget estimé à 150k€, et a demandé des références similaires.",
  "Relance recommandée : il s'est écoulé 3 jours depuis le dernier contact. Je suggère un email de suivi avec la documentation technique demandée.",
  "Analyse du profil : ce contact a un fort potentiel de conversion. Son entreprise a réalisé 3 projets similaires ces 2 dernières années. Taux de succès estimé : 72%.",
]

export function getMockAiResponse(): string {
  return AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)]
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', user_id: 'u1', lead_id: 'l1', contact_id: null,
    channel: 'email', subject: 'Devis Résidence Les Chênes',
    summary: 'Discussion sur le lot gros œuvre',
    created_at: '2025-03-22T09:00:00Z', updated_at: '2025-03-22T14:30:00Z',
    contact_name: 'Thomas Mercier', contact_company: 'Bouygues Immobilier',
    last_message: "Pouvez-vous me confirmer le délai de livraison du devis ?",
    last_message_at: '2025-03-22T14:30:00Z', unread: 2, lead_stage: 'hot',
  },
  {
    id: 'c2', user_id: 'u1', lead_id: 'l2', contact_id: null,
    channel: 'whatsapp', subject: 'Lot technique Vinci',
    summary: 'Négociation en cours',
    created_at: '2025-03-21T11:00:00Z', updated_at: '2025-03-21T16:00:00Z',
    contact_name: 'Sophie Laurent', contact_company: 'Vinci Construction',
    last_message: "OK pour le RDV vendredi à 14h sur le chantier.",
    last_message_at: '2025-03-21T16:00:00Z', unread: 0, lead_stage: 'vip',
  },
  {
    id: 'c3', user_id: 'u1', lead_id: null, contact_id: null,
    channel: 'phone', subject: 'Premier contact — Moreau BTP',
    summary: null,
    created_at: '2025-03-20T10:30:00Z', updated_at: '2025-03-20T10:45:00Z',
    contact_name: 'Pierre Moreau', contact_company: 'Moreau BTP',
    last_message: "Rappeler lundi pour discuter du projet.",
    last_message_at: '2025-03-20T10:45:00Z', unread: 0, lead_stage: 'new',
  },
  {
    id: 'c4', user_id: 'u1', lead_id: 'l3', contact_id: null,
    channel: 'meeting', subject: 'Réunion chantier Haussmann',
    summary: 'Compte-rendu de réunion',
    created_at: '2025-03-19T14:00:00Z', updated_at: '2025-03-19T15:30:00Z',
    contact_name: 'Claire Fontaine', contact_company: 'Fontaine & Fils',
    last_message: "CR réunion : validation des plans, démarrage semaine 14.",
    last_message_at: '2025-03-19T15:30:00Z', unread: 0, lead_stage: 'client',
  },
  {
    id: 'c5', user_id: 'u1', lead_id: null, contact_id: null,
    channel: 'email', subject: 'Relance — Girard Immobilier',
    summary: null,
    created_at: '2025-03-18T08:00:00Z', updated_at: '2025-03-18T08:00:00Z',
    contact_name: 'Lucas Girard', contact_company: 'Girard Immobilier',
    last_message: "Suite à notre échange du 15 mars, je reviens vers vous...",
    last_message_at: '2025-03-18T08:00:00Z', unread: 1, lead_stage: 'cold',
  },
  {
    id: 'c6', user_id: 'u1', lead_id: 'l4', contact_id: null,
    channel: 'note', subject: 'Notes — Petit & Associés',
    summary: null,
    created_at: '2025-03-17T16:00:00Z', updated_at: '2025-03-17T16:00:00Z',
    contact_name: 'Emma Petit', contact_company: 'Petit & Associés',
    last_message: "Client intéressé par lot électricité. Budget : 45k€.",
    last_message_at: '2025-03-17T16:00:00Z', unread: 0, lead_stage: 'payments',
  },
]

export const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversation_id: 'c1', role: 'assistant', content: "Bonjour Thomas,\n\nSuite à notre appel de la semaine dernière, je vous transmets notre offre pour le lot gros œuvre de la Résidence Les Chênes.\n\nNous proposons une intervention complète comprenant fondations, élévation des murs et dalle béton pour un montant estimé à **87 000 € HT**.\n\nCordialement,\nÉquipe Qorpo", created_at: '2025-03-22T09:00:00Z' },
    { id: 'm2', conversation_id: 'c1', role: 'user', content: "Merci pour votre offre. Le montant semble correct. Pouvez-vous me confirmer le délai de livraison du devis complet avec les plans ?", created_at: '2025-03-22T10:30:00Z' },
    { id: 'm3', conversation_id: 'c1', role: 'assistant', content: "Bien entendu Thomas. Le devis détaillé avec les plans d'exécution sera disponible d'ici **jeudi 27 mars** au plus tard. Nous inclurons également les fiches techniques des matériaux préconisés.", created_at: '2025-03-22T11:00:00Z' },
    { id: 'm4', conversation_id: 'c1', role: 'user', content: "Pouvez-vous me confirmer le délai de livraison du devis ?", created_at: '2025-03-22T14:30:00Z' },
  ],
  c2: [
    { id: 'm5', conversation_id: 'c2', role: 'user', content: "Bonjour Sophie, je vous contacte au sujet du lot technique du centre commercial Vinci. On peut se voir cette semaine ?", created_at: '2025-03-21T11:00:00Z' },
    { id: 'm6', conversation_id: 'c2', role: 'assistant', content: "Bonjour ! Oui bien sûr. Jeudi ou vendredi vous convient ?", created_at: '2025-03-21T11:30:00Z' },
    { id: 'm7', conversation_id: 'c2', role: 'user', content: "Vendredi c'est parfait. 14h sur le chantier ?", created_at: '2025-03-21T14:00:00Z' },
    { id: 'm8', conversation_id: 'c2', role: 'assistant', content: "OK pour le RDV vendredi à 14h sur le chantier.", created_at: '2025-03-21T16:00:00Z' },
  ],
  c3: [
    { id: 'm9', conversation_id: 'c3', role: 'user', content: "Appel entrant — Pierre Moreau — 10 min\n\nNotes : Intéressé par une collaboration sur leur prochain chantier à Nantes. Budget estimé 56k€. Rappeler lundi pour discuter du projet.", created_at: '2025-03-20T10:45:00Z' },
  ],
  c4: [
    { id: 'm10', conversation_id: 'c4', role: 'user', content: "Compte-rendu réunion chantier — 19 mars 2025\n\n**Présents :** Claire Fontaine, Jean-Luc Martin (architecte), équipe Qorpo\n\n**Décisions :**\n- Plans validés\n- Démarrage semaine 14 (7 avril)\n- Budget confirmé : 142 000€ HT\n- Réunion de chantier hebdomadaire le mardi 9h", created_at: '2025-03-19T15:30:00Z' },
  ],
  c5: [
    { id: 'm11', conversation_id: 'c5', role: 'assistant', content: "Objet : Suite à notre échange du 15 mars\n\nBonjour Lucas,\n\nSuite à notre échange du 15 mars, je reviens vers vous concernant votre projet de rénovation. Avez-vous eu le temps d'étudier notre proposition ?\n\nJe reste disponible pour tout renseignement complémentaire.\n\nCordialement", created_at: '2025-03-18T08:00:00Z' },
  ],
  c6: [
    { id: 'm12', conversation_id: 'c6', role: 'user', content: "Note interne\n\nClient intéressé par lot électricité. Budget annoncé : 45k€. Elle souhaite 3 devis comparatifs. Envoyer notre offre avant le 25 mars pour rester dans la course.", created_at: '2025-03-17T16:00:00Z' },
  ],
}
```

- [ ] **Step 2: Vérifier que le projet compile**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```
Attendu : aucune erreur sur `types.ts`.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/types.ts && rtk git commit -m "feat(conversations): add LeadStage type + LEAD_STAGE_LABEL map"
```

---

## Task 2: Créer InboxNav.tsx (panneau gauche)

**Files:**
- Create: `src/components/conversations/InboxNav.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
'use client'

import { type LeadStage, LEAD_STAGE_LABEL } from './types'

export type InboxFilter =
  | 'all'
  | 'unassigned'
  | 'closed'
  | LeadStage

interface Props {
  activeFilter: InboxFilter
  onFilterChange: (f: InboxFilter) => void
  totalUnread: number
}

const MAIN_ITEMS: { id: InboxFilter; label: string }[] = [
  { id: 'all',        label: 'Toutes'        },
  { id: 'unassigned', label: 'Non assignées' },
  { id: 'closed',     label: 'Fermées'       },
]

const LIFECYCLE_ITEMS: { id: LeadStage; label: string }[] = (
  Object.entries(LEAD_STAGE_LABEL) as [LeadStage, string][]
).map(([id, label]) => ({ id, label }))

export default function InboxNav({ activeFilter, onFilterChange, totalUnread }: Props) {
  return (
    <div className="flex flex-col w-[200px] flex-shrink-0 bg-[#111111] h-full overflow-y-auto">
      {/* Title */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Conversations</span>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E2FF8D] text-[#111111]">
              {totalUnread}
            </span>
          )}
        </div>
      </div>

      {/* Main filters */}
      <nav className="flex flex-col gap-0.5 px-2">
        {MAIN_ITEMS.map(item => {
          const isActive = activeFilter === item.id
          return (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={`
                w-full text-left text-sm px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-[#E2FF8D] text-[#111111] font-medium'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }
              `}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Lifecycle section */}
      <div className="mt-5 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3D4F6B] px-3 mb-2">
          Lifecycle
        </p>
        <div className="flex flex-col gap-0.5">
          {LIFECYCLE_ITEMS.map(item => {
            const isActive = activeFilter === item.id
            return (
              <button
                key={item.id}
                onClick={() => onFilterChange(item.id)}
                className={`
                  w-full text-left text-sm px-3 py-2 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-[#E2FF8D] text-[#111111] font-medium'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```
Attendu : aucune erreur.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/InboxNav.tsx && rtk git commit -m "feat(conversations): add InboxNav left panel"
```

---

## Task 3: Créer ConversationList.tsx (panneau milieu)

**Files:**
- Create: `src/components/conversations/ConversationList.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { type Conversation, type InboxFilter, LEAD_STAGE_LABEL } from './types'
// Note: InboxFilter est re-exporté depuis InboxNav — on l'importe depuis là
import { type InboxFilter as NavFilter } from './InboxNav'
import NewConversationModal from './NewConversationModal'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}j`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}min`
  return "à l'instant"
}

function getInitials(name?: string) {
  if (!name) return '??'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function ConvRow({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation
  isSelected: boolean
  onClick: () => void
}) {
  const initials = getInitials(conv.contact_name)
  const stageLabel = conv.lead_stage ? LEAD_STAGE_LABEL[conv.lead_stage] : null

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-[#EBEBEA] last:border-0
        ${isSelected
          ? 'bg-white border-l-2 border-l-[#3462EE]'
          : 'hover:bg-[#EFEFED] border-l-2 border-l-transparent'
        }
      `}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-sm font-semibold text-[#111111] truncate">
            {conv.contact_name ?? 'Contact inconnu'}
          </p>
          <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">
            {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-1">
          {stageLabel && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3462EE]/10 text-[#3462EE]">
              {stageLabel}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[#6B7280] truncate flex-1">
            {conv.last_message ?? 'Aucun message'}
          </p>
          {(conv.unread ?? 0) > 0 && (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#3462EE] flex items-center justify-center text-[9px] font-bold text-white">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

interface Props {
  conversations: Conversation[]
  selected: Conversation | null
  onSelect: (c: Conversation) => void
  activeFilter: NavFilter
  onConversationCreated: () => void
}

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  activeFilter,
  onConversationCreated,
}: Props) {
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)

  const FILTER_LABEL: Record<string, string> = {
    all: 'Toutes les conversations',
    unassigned: 'Non assignées',
    closed: 'Fermées',
    hot: 'Hot Lead',
    vip: 'VIP Lead',
    new: 'Nouveau Lead',
    payments: 'Paiements',
    client: 'Client',
    cold: 'Cold Lead',
  }

  const filtered = useMemo(() => {
    let result = conversations

    // Apply lifecycle filter
    if (activeFilter !== 'all' && activeFilter !== 'unassigned' && activeFilter !== 'closed') {
      result = result.filter(c => c.lead_stage === activeFilter)
    }

    // Apply search
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(c =>
        `${c.contact_name ?? ''} ${c.last_message ?? ''}`.toLowerCase().includes(q)
      )
    }

    return result
  }, [conversations, activeFilter, query])

  return (
    <div className="flex flex-col w-[340px] flex-shrink-0 bg-[#F8F8F6] border-r border-[#E5E7EB] h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#111111]">
            {FILTER_LABEL[activeFilter ?? 'all'] ?? 'Conversations'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#111111] text-white hover:bg-[#222] transition-colors"
          >
            + Nouveau
          </button>
        </div>

        {/* Search — text only, no icon */}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#111111] placeholder-[#9CA3AF] outline-none focus:border-[#3462EE] transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-[#9CA3AF]">Aucune conversation</p>
          </div>
        ) : (
          filtered.map(conv => (
            <ConvRow
              key={conv.id}
              conv={conv}
              isSelected={selected?.id === conv.id}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>

      {showModal && (
        <NewConversationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); onConversationCreated() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/ConversationList.tsx && rtk git commit -m "feat(conversations): add ConversationList middle panel"
```

---

## Task 4: Refactorer ConversationsView.tsx (layout 3 panneaux)

**Files:**
- Modify: `src/components/conversations/ConversationsView.tsx`

- [ ] **Step 1: Remplacer entièrement le fichier**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { type Conversation, MOCK_CONVERSATIONS } from './types'
import InboxNav, { type InboxFilter } from './InboxNav'
import ConversationList from './ConversationList'
import MessageThread from './MessageThread'

export default function ConversationsView({ dbConversations }: { dbConversations: Conversation[] }) {
  const allConversations = useMemo(() => {
    if (dbConversations.length >= 4) return dbConversations
    const realIds = new Set(dbConversations.map(c => c.id))
    const mocks = MOCK_CONVERSATIONS.filter(m => !realIds.has(m.id))
    return [...dbConversations, ...mocks]
  }, [dbConversations])

  const [selected, setSelected] = useState<Conversation | null>(allConversations[0] ?? null)
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all')

  const totalUnread = allConversations.reduce((sum, c) => sum + (c.unread ?? 0), 0)

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Panel 1 — Nav */}
      <InboxNav
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        totalUnread={totalUnread}
      />

      {/* Panel 2 — Conversation list */}
      <ConversationList
        conversations={allConversations}
        selected={selected}
        onSelect={setSelected}
        activeFilter={activeFilter}
        onConversationCreated={() => {}}
      />

      {/* Panel 3 — Thread */}
      <div className="flex-1 overflow-hidden bg-[#EEF0EB]">
        {selected ? (
          <MessageThread conversation={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm text-[#9CA3AF]">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Tester visuellement**

Lancer le serveur si pas déjà lancé :
```bash
cd /c/Users/thoma/qos && npm run dev -- -p 4000
```
Ouvrir http://localhost:4000/conversations — vérifier :
- 3 panneaux visibles
- Panneau gauche sombre avec filtres
- Panneau milieu off-white avec liste
- Panneau droit sage avec thread

- [ ] **Step 4: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/ConversationsView.tsx && rtk git commit -m "feat(conversations): refactor to 3-panel layout"
```

---

## Task 5: Créer KaiAnalysis.tsx (onglet Kai IA)

**Files:**
- Create: `src/components/conversations/KaiAnalysis.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
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
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/KaiAnalysis.tsx && rtk git commit -m "feat(conversations): add KaiAnalysis tab component"
```

---

## Task 6: Créer /api/kai-analysis/route.ts

**Files:**
- Create: `src/app/api/kai-analysis/route.ts`

- [ ] **Step 1: Créer la route**

```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const runtime = 'nodejs'

const PROMPTS = {
  analysis: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, expert en qualification de leads BTP.

Analyse cette conversation avec ${contactName} (${company}) — statut actuel : ${stage || 'inconnu'}.

HISTORIQUE :
${history}

Réponds avec ce format EXACT (ne dévie pas) :
SCORE:[nombre entre 0 et 100]
[2-3 phrases de résumé du lead : projet, budget si mentionné, intérêt, maturité]
`.trim(),

  suggestion: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, commercial IA spécialisé BTP.

Basé sur cette conversation avec ${contactName} (${company}) — statut : ${stage || 'inconnu'} :

HISTORIQUE :
${history}

Rédige UN message de suivi court (3-5 phrases max), naturel et professionnel, en français.
Adapte le ton au statut du lead. Ne commence pas par "Bonjour" si la conversation est déjà engagée.
Réponds UNIQUEMENT avec le message, sans explication.
`.trim(),

  action: (contactName: string, company: string, stage: string, history: string) => `
Tu es Kai, expert en stratégie commerciale BTP.

Pour ${contactName} (${company}) — statut : ${stage || 'inconnu'} :

HISTORIQUE :
${history}

Propose UNE prochaine action concrète (1-2 phrases max). Exemple : "Envoyer un devis chiffré avant vendredi" ou "Appeler pour confirmer le RDV du 15".
Réponds UNIQUEMENT avec l'action recommandée, sans introduction.
`.trim(),
}

export async function POST(req: NextRequest) {
  try {
    const { type, contactName, contactCompany, leadStage, history } = await req.json()

    if (!type || !history) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const name    = contactName ?? 'ce contact'
    const company = contactCompany ?? ''
    const stage   = leadStage ?? ''

    const promptFn = PROMPTS[type as keyof typeof PROMPTS]
    if (!promptFn) {
      return Response.json({ error: `Type inconnu: ${type}` }, { status: 400 })
    }

    const prompt = promptFn(name, company, stage, history)

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[/api/kai-analysis]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/app/api/kai-analysis/route.ts && rtk git commit -m "feat(api): add kai-analysis streaming route"
```

---

## Task 7: Créer VapiCall.tsx (onglet Vocal)

**Files:**
- Create: `src/components/conversations/VapiCall.tsx`

Note : utilise le SDK navigateur `@vapi-ai/web` (déjà installé dans le projet — voir `src/components/conversion/TestTab.tsx`).

- [ ] **Step 1: Créer le composant**

```tsx
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
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/VapiCall.tsx && rtk git commit -m "feat(conversations): add VapiCall vocal tab component"
```

---

## Task 8: Refactorer MessageThread.tsx (tabs + bubbles redesign)

**Files:**
- Modify: `src/components/conversations/MessageThread.tsx`

- [ ] **Step 1: Remplacer entièrement le fichier**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Smartphone, Zap } from 'lucide-react'
import { type Conversation, type Message, CHANNEL_META, MOCK_MESSAGES } from './types'
import { getMessages } from '@/app/conversations/actions'
import { createClient } from '@/lib/supabase/client'
import KaiAnalysis from './KaiAnalysis'
import VapiCall from './VapiCall'

type Tab = 'messages' | 'kai' | 'vocal'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function MessageBubble({ message, contactName }: { message: Message; contactName?: string }) {
  const isContact = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isContact ? 'items-start' : 'items-end'}`}>
      <span className="text-[10px] text-[#9CA3AF] px-1">
        {isContact ? (contactName ?? 'Contact') : 'Kai'} · {formatTime(message.created_at)}
      </span>
      <div className={`
        max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
        ${isContact
          ? 'bg-white text-[#111111] rounded-tl-sm shadow-sm'
          : 'bg-[#111111] text-white rounded-tr-sm'
        }
      `}>
        {renderContent(message.content)}
      </div>
    </div>
  )
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-1 items-end">
      <span className="text-[10px] text-[#9CA3AF] px-1">Kai</span>
      <div className="max-w-[72%] bg-[#111111] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed whitespace-pre-wrap">
        {content || (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
        {content && <span className="inline-block w-0.5 h-3.5 bg-white/60 ml-0.5 animate-pulse align-middle" />}
      </div>
    </div>
  )
}

export default function MessageThread({ conversation }: { conversation: Conversation }) {
  const [tab, setTab]                   = useState<Tab>('messages')
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [isLoading, setIsLoading]       = useState(true)
  const [isSending, setIsSending]       = useState(false)
  const [streamingContent, setStreaming] = useState<string | null>(null)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const channel   = CHANNEL_META[conversation.channel]

  // Load messages
  useEffect(() => {
    setIsLoading(true)
    setMessages([])
    setStreaming(null)
    const load = async () => {
      const result = await getMessages(conversation.id)
      if (result.messages && result.messages.length > 0) {
        setMessages(result.messages as Message[])
      } else {
        setMessages(MOCK_MESSAGES[conversation.id] ?? [])
      }
      setIsLoading(false)
    }
    load()
  }, [conversation.id])

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient()
    const sub = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [conversation.id])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function handleSend() {
    const content = input.trim()
    if (!content || isSending) return
    setInput('')
    setIsSending(true)

    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversation.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setStreaming('')

    try {
      const contactPhone = conversation.channel === 'whatsapp' && conversation.contact_phone
        ? conversation.contact_phone : undefined

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          message: content,
          contactName: conversation.contact_name,
          contactPhone,
        }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setStreaming(fullText)
      }

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: fullText,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMsg])
      setStreaming(null)

      if (contactPhone) {
        setWhatsappSent(true)
        setTimeout(() => setWhatsappSent(false), 3000)
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        role: 'assistant',
        content: "Erreur. Vérifiez votre clé API Anthropic.",
        created_at: new Date().toISOString(),
      }])
      setStreaming(null)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  const TABS: { id: Tab; label: string }[] = [
    { id: 'messages', label: 'Messages'  },
    { id: 'kai',      label: 'Kai IA'    },
    { id: 'vocal',    label: 'Vocal'     },
  ]

  return (
    <div className="flex flex-col h-full bg-[#EEF0EB]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xs font-bold text-white">
            {conversation.contact_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111111]">{conversation.contact_name ?? 'Contact inconnu'}</p>
            {conversation.contact_company && (
              <p className="text-xs text-[#6B7280]">{conversation.contact_company}</p>
            )}
          </div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full border"
          style={{ color: channel.color, borderColor: channel.color + '40', background: channel.bg }}
        >
          {channel.label}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 px-5 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-[#111111] font-semibold border-[#3462EE]'
                : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'kai' && (
        <div className="flex-1 overflow-hidden">
          <KaiAnalysis conversation={conversation} messages={messages} />
        </div>
      )}

      {tab === 'vocal' && (
        <div className="flex-1 overflow-hidden">
          <VapiCall conversation={conversation} />
        </div>
      )}

      {tab === 'messages' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={18} className="text-[#9CA3AF] animate-spin" />
              </div>
            ) : (
              <>
                {grouped.map(group => (
                  <div key={group.date} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-[#E5E7EB]" />
                      <span className="text-[10px] text-[#9CA3AF]">{group.date}</span>
                      <div className="flex-1 h-px bg-[#E5E7EB]" />
                    </div>
                    {group.messages.map(msg => (
                      <MessageBubble key={msg.id} message={msg} contactName={conversation.contact_name} />
                    ))}
                  </div>
                ))}
                {streamingContent !== null && <StreamingBubble content={streamingContent} />}
                {messages.length === 0 && streamingContent === null && !isLoading && (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-sm text-[#9CA3AF]">Envoyez le premier message.</p>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-[#E5E7EB] bg-white">
            <div className="flex items-end gap-2 border border-[#E5E7EB] rounded-xl px-3 py-2 focus-within:border-[#3462EE] transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrire un message..."
                rows={1}
                disabled={isSending}
                className="flex-1 bg-transparent text-sm text-[#111111] placeholder-[#9CA3AF] outline-none resize-none leading-relaxed py-1 disabled:opacity-50"
                style={{ maxHeight: 120, overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="w-8 h-8 rounded-lg bg-[#111111] hover:bg-[#222] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0 mb-0.5"
              >
                {isSending
                  ? <Loader2 size={14} className="text-white animate-spin" />
                  : <Send size={14} className="text-white" />
                }
              </button>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] text-[#6B7280]">Kai actif</span>
              </div>
              <div className="flex items-center gap-2">
                {whatsappSent && (
                  <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                    <Smartphone size={9} />
                    WhatsApp envoyé
                  </span>
                )}
                <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                  <Zap size={9} />
                  Qualification auto
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd /c/Users/thoma/qos && npx tsc --noEmit 2>&1 | head -20
```
Attendu : aucune erreur TypeScript.

- [ ] **Step 3: Test visuel complet**

Ouvrir http://localhost:4000/conversations et vérifier :
- [ ] 3 panneaux visibles sans scroll horizontal
- [ ] Panneau gauche : fond `#111111`, texte lisible, filtre actif en lime
- [ ] Panneau milieu : fond off-white, badges lead bleus, badge unread bleu
- [ ] Onglet Messages : bulles contact blanc gauche, bulles Kai noir droite
- [ ] Onglet Kai IA : bouton Analyser visible, cards blanches, sans erreur
- [ ] Onglet Vocal : card contact, textarea instructions, bouton Appeler

- [ ] **Step 4: Commit final**

```bash
cd /c/Users/thoma/qos && rtk git add src/components/conversations/MessageThread.tsx && rtk git commit -m "feat(conversations): refactor MessageThread with tabs Messages/Kai IA/Vocal"
```

---

## Récapitulatif des commits attendus

1. `feat(conversations): add LeadStage type + LEAD_STAGE_LABEL map`
2. `feat(conversations): add InboxNav left panel`
3. `feat(conversations): add ConversationList middle panel`
4. `feat(conversations): refactor to 3-panel layout`
5. `feat(conversations): add KaiAnalysis tab component`
6. `feat(api): add kai-analysis streaming route`
7. `feat(conversations): add VapiCall vocal tab component`
8. `feat(conversations): refactor MessageThread with tabs Messages/Kai IA/Vocal`

---

## Notes importantes

- **Vapi** : utilise le SDK navigateur (`@vapi-ai/web`) — pas d'appel téléphonique sortant, appel web via microphone. Requiert `NEXT_PUBLIC_VAPI_API_KEY` et `NEXT_PUBLIC_VAPI_ASSISTANT_ID` dans `.env.local` (déjà présents).
- **Kai IA** : requiert `ANTHROPIC_API_KEY` dans `.env.local` (déjà présent).
- **`InboxFilter`** : exporté depuis `InboxNav.tsx` et importé dans `ConversationList.tsx` et `ConversationsView.tsx`.
