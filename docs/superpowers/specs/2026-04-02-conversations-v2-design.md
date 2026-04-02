# Conversations V2 — Design Spec
**Date:** 2026-04-02  
**Route:** `/conversations` + `/conversations/feed`  
**Stack:** Next.js 14 App Router, Tailwind, Supabase Realtime, GHL API, Twilio, Anthropic SDK

---

## Objectif

Transformer le module conversations en hub de communication multi-canal complet :
- Filtres inbox fonctionnels (Toutes / Non assignées / Fermées avec codes couleur)
- Navigation par pipeline GHL (Acquisition / Réception / Réactivation)
- Envoi multi-canal via GHL (WhatsApp, SMS, Email)
- Toggle IA par conversation (Kai ON/OFF)
- Feed Kai live sur `/conversations/feed`
- Traçabilité des leads Meta Ads

---

## Schéma Supabase — Modifications

### Table `conversations` — nouvelles colonnes

```sql
ALTER TABLE conversations 
  ADD COLUMN ai_enabled     boolean DEFAULT true,
  ADD COLUMN source         text DEFAULT 'manual',  -- 'meta' | 'manual' | 'ghl'
  ADD COLUMN pipeline_stage_id   text DEFAULT null,
  ADD COLUMN opportunity_status  text DEFAULT null;  -- 'open' | 'won' | 'lost' | 'abandoned'
```

### Table `messages` — pas de modification

---

## Types TypeScript — Modifications

```typescript
// types.ts additions
export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned' | null
export type ConversationSource = 'meta' | 'manual' | 'ghl' | null

// Conversation type additions
export type Conversation = {
  // ... existing fields ...
  ai_enabled?: boolean          // default true
  source?: ConversationSource
  pipeline_stage_id?: string | null
  opportunity_status?: OpportunityStatus
  assigned_to?: string | null   // GHL user ID
}

// New types
export type PipelineStage = {
  id: string
  name: string
}

export type Pipeline = {
  id: string
  name: string
  stages: PipelineStage[]
}
```

---

## Section 1 — InboxNav : Pipeline + Filtres

### Données (ConversationsPage — server)

Fetch en parallèle :
1. `getConversations(100)` — conversations GHL avec `assignedTo`
2. `getOpportunities(200)` — opportunités GHL avec `pipelineStageId` + `status`
3. `getPipelines()` — 3 pipelines avec leurs étapes

Enrichissement : construire un map `contactId → { pipelineStageId, pipelineName, opportunityStatus }` en joignant opportunités et conversations par `contactId`.

Chaque `Conversation` reçoit :
- `pipeline_stage_id` : l'étape pipeline de l'opportunité liée
- `opportunity_status` : `'open' | 'won' | 'lost' | 'abandoned'`
- `assigned_to` : `assignedTo` de la conversation GHL

### GHL type extension

```typescript
export type GHLConversation = {
  // ... existing ...
  assignedTo?: string | null
}
```

### InboxNav — nouvelle structure

```
Conversations [badge unread]

  Toutes
  Non assignées       ← assignedTo === null
  Fermées             ← opportunity_status in ['won','lost','abandoned']

  PIPELINES
  ├─ Acquisition
  │   ├─ Étape 1
  │   ├─ Étape 2
  │   └─ ...
  ├─ Réception
  │   └─ ...
  └─ Réactivation
      └─ ...

  SOURCES
  └─ Meta Ads
```

### InboxFilter type étendu

```typescript
export type InboxFilter =
  | 'all'
  | 'unassigned'
  | 'closed'
  | { type: 'pipeline_stage'; stageId: string }
  | { type: 'source'; source: ConversationSource }
```

### ConversationList — filtrage

| Filtre | Condition |
|--------|-----------|
| `all` | tous |
| `unassigned` | `assigned_to === null` |
| `closed` | `opportunity_status in ['won','lost','abandoned']` |
| `pipeline_stage` | `pipeline_stage_id === stageId` |
| `source: 'meta'` | `source === 'meta'` |

### ConversationRow — états Fermées

- `opportunity_status === 'won'` → point vert `#22c55e` + bordure gauche verte
- `opportunity_status === 'lost' | 'abandoned'` → point rouge `#EF4444` + bordure gauche rouge

---

## Section 2 — Multi-canal : Envoi via GHL

### API GHL — envoi message

```
POST /conversations/messages
{
  type: 'WhatsApp' | 'SMS' | 'Email',
  conversationId: string,
  message: string,
  subject?: string,    // Email seulement
  html?: string        // Email seulement
}
```

### Nouvelle route : `POST /api/send-message`

```typescript
// Reçoit : { conversationId, message, type, subject? }
// Appelle GHL /conversations/messages
// Sauvegarde en Supabase messages (role: 'user', metadata: { manual: true })
// Retourne { ok: true }
```

### Webhook entrant — extension

Ajouter handler dans `/api/webhooks/ghl` pour `InboundMessage` :
- Type SMS → sauvegarde en Supabase + déclenche Kai si `ai_enabled`
- Type Email → idem

### UI MessageThread — sélecteur canal

- À gauche de l'input : pill cliquable avec le canal actuel ex. `WhatsApp`
- Dropdown (texte pur, sans icône) : `WhatsApp` / `SMS` / `Email`
- Canal par défaut = `conversation.channel`
- Bouton Envoyer → appelle `/api/send-message` au lieu de `/api/chat`
- Kai répond toujours via `/api/chat` (séparé du canal d'envoi manuel)

**Note :** Le canal manuel et la réponse IA sont indépendants. L'humain peut envoyer en SMS, Kai répond toujours via le canal de la conversation.

---

## Section 3 — AI Toggle (Kai ON/OFF)

### Stockage

Colonne `ai_enabled boolean DEFAULT true` sur `conversations` Supabase.

### UI — Header MessageThread

```
[Avatar] Nom Contact          [WhatsApp]  [● Kai ON]
         Entreprise
```

- `● Kai ON` : point vert `#22c55e` + texte `text-[#111111]`
- `○ Kai OFF` : point gris `#9CA3AF` + texte `text-[#9CA3AF]`
- Click → optimistic update + `PATCH /api/conversation/[id]` avec `{ ai_enabled: boolean }`

### Route : `PATCH /api/conversation/[id]/ai`

La route existante `/api/conversation/[id]` appelle GHL. Pour `ai_enabled` (champ Supabase uniquement), créer une sous-route dédiée :
- `PATCH /api/conversation/[id]/ai` → `{ ai_enabled: boolean }` → update Supabase `conversations` set `ai_enabled`
- Retourne `{ ok: true }`

### Comportement

- `/api/chat` : lit `ai_enabled` depuis Supabase avant de générer. Si `false` → retourne 204 (no content)
- `/api/webhooks/meta` : idem — vérifie `ai_enabled` avant de lancer Kai
- `/api/webhooks/twilio` (si existe) : idem

---

## Section 4 — Feed Kai Live

### Route : `/conversations/feed`

Nouvelle page dans `src/app/conversations/feed/`.

### Layout

```
┌─────────────────────────────────────────────────┐
│  Feed Kai Live                    [Filtres]      │
│  Toutes conversations IA en temps réel           │
├───────────┬─────────────────────────────────────┤
│  Filtre   │  Stream messages                     │
│  Tous     │  ┌─────────────────────────────────┐│
│  WhatsApp │  │ Thomas Mercier · WhatsApp · 2min ││
│  SMS      │  │ Lead: "Pouvez-vous me confirmer" ││
│  Email    │  │ Kai: "Bien entendu Thomas..."    ││
│           │  │                    [Kai ON ●]    ││
│           │  └─────────────────────────────────┘│
│           │  ┌─────────────────────────────────┐│
│           │  │ Sophie Laurent · SMS · 5min      ││
│           │  │ ...                              ││
└───────────┴─────────────────────────────────────┘
```

### Données

- Supabase Realtime : subscribe à `messages` (tous, sans filtre `conversation_id`)
- Join avec `conversations` pour avoir `contact_name`, `channel`, `ai_enabled`
- Fetch initial : 50 derniers messages `role='assistant'` avec leur conversation
- Nouvelle route server : `GET /api/feed` → derniers échanges IA

### Composants

- `src/app/conversations/feed/page.tsx` — Server Component, fetch initial
- `src/components/conversations/KaiFeed.tsx` — Client Component, Realtime

---

## Section 5 — Meta chatbot visibility

### Webhook Meta — modification

Dans `processMetaLead()`, lors de la création de la conversation Supabase :
```typescript
await supabase.from('conversations').insert({
  // ... existing fields ...
  source: 'meta',
  ai_enabled: true,
})
```

### ConversationRow — badge Meta

Si `conversation.source === 'meta'` → badge `Meta` en `bg-[#3462EE]/10 text-[#3462EE]` à côté du badge lead stage.

### InboxNav — filtre Sources

Nouvelle section sous Pipelines :
```
SOURCES
└─ Meta Ads    (filtre: source === 'meta')
```

---

## Fichiers à créer / modifier

### Modifier
- `src/components/conversations/types.ts` — nouveaux types
- `src/components/conversations/InboxNav.tsx` — pipeline + sources sections
- `src/components/conversations/ConversationList.tsx` — nouveaux filtres + color coding
- `src/components/conversations/ConversationsView.tsx` — pass pipelines prop
- `src/components/conversations/MessageThread.tsx` — toggle Kai + sélecteur canal
- `src/app/conversations/page.tsx` — fetch pipelines + opportunities
- `src/app/api/webhooks/meta/route.ts` — set source='meta'
- `src/app/api/chat/route.ts` — check ai_enabled
- `src/lib/ghl.ts` — extend GHLConversation + add sendMessage function

### Créer
- `src/app/api/send-message/route.ts` — envoi GHL multi-canal
- `src/app/api/conversation/[id]/ai/route.ts` — PATCH ai_enabled → Supabase uniquement
- `src/app/conversations/feed/page.tsx` — Feed Kai page
- `src/components/conversations/KaiFeed.tsx` — Feed Kai component
- `src/app/api/feed/route.ts` — initial feed data

---

## Contraintes

- Pas d'icônes (sauf fonctionnel : Send, Loader2)
- Langue UI = français
- `#E2FF8D` uniquement sur fond sombre
- `InboxFilter` devient un union type avec objets — **breaking change** : InboxNav, ConversationList, ConversationsView doivent tous être mis à jour pour gérer `{ type: 'pipeline_stage', stageId }` et `{ type: 'source', source }`
- Le toggle AI appelle `/api/conversation/[id]/ai` (Supabase), pas `/api/conversation/[id]` (GHL)
- Le toggle AI est optimiste (update UI immédiatement, rollback si erreur)
- Le feed ne charge que les 50 derniers échanges à l'init, puis Realtime prend le relai
