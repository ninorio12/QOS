# Spec : Module Équipe IA — Panneau de contrôle agents

**Date :** 2026-04-07
**Stack :** Next.js 14, Tailwind CSS, OpenClaw Gateway (Express/Node.js), Anthropic API, Supabase
**Périmètre :** Page `/equipe` du SaaS Soren — connexion live au gateway + drawer de contrôle par agent

---

## Vision

La page `/equipe` est déjà construite avec un organigram animé (3 agents, SVG data-packets, cartes status). Tout est aujourd'hui simulé. Ce spec couvre la connexion au gateway réel + l'ajout d'un **drawer latéral par agent** avec 4 onglets de contrôle : Live, SOUL.md, Skills, Prompt Lab.

L'organigram reste visible en permanence — le drawer s'ouvre à droite sans masquer le diagramme.

---

## Architecture

```
[Next.js SaaS /equipe]
  EquipeView (organigram + cartes)
    useGatewayEvents()  ──SSE──►  GET /api/openclaw/events  ──proxy──►  Gateway :18789/events
    useAgentStatus()    ──poll─►  GET /api/openclaw/status  ──proxy──►  Gateway :18789/health (30s)
    
  AgentDrawer (drawer latéral 480px)
    LiveTab          ──SSE events filtrés par agent
    SoulTab          ──GET/POST /api/openclaw/agents/:agent/soul  ──proxy──►  Gateway :18789/agents/:agent/soul
    SkillsTab        ──POST /api/openclaw/agents/:agent/tools/:tool/toggle  ──proxy──►  Gateway :18789/agents/:agent/tools/:tool/toggle
    PromptLabTab     ──POST /api/test-agent (existant)  ──►  Anthropic direct

[OpenClaw Gateway]
  GET  /agents/:agent/soul        (existant Plan B)
  POST /agents/:agent/soul        (existant Plan B)
  POST /agents/:agent/tools/:tool/toggle  (NOUVEAU — Plan C)
  GET  /events                    (existant Plan A)
  GET  /health                    (existant Plan A)
```

---

## Composants

### Fichiers SaaS modifiés / créés

| Fichier | Action | Rôle |
|---------|--------|------|
| `src/components/equipe/EquipeView.tsx` | Modifier | Brancher SSE + status réels, ouvrir drawer au clic agent |
| `src/components/equipe/AgentDrawer.tsx` | Créer | Drawer 480px, 4 onglets, overlay backdrop |
| `src/components/equipe/tabs/LiveTab.tsx` | Créer | Feed événements SSE filtrés + status heartbeat |
| `src/components/equipe/tabs/SoulTab.tsx` | Créer | Éditeur SOUL.md textarea + bouton Save |
| `src/components/equipe/tabs/SkillsTab.tsx` | Créer | Toggles skills avec appel toggle live |
| `src/components/equipe/tabs/PromptLabTab.tsx` | Créer | Test SOUL.md → appel Anthropic → réponse → bouton Publier |
| `src/hooks/useGatewayEvents.ts` | Créer | Hook SSE — subscribe à `/api/openclaw/events`, retourne `GatewayEvent[]` |
| `src/hooks/useAgentStatus.ts` | Créer | Hook polling 30s — retourne `AgentStatus[]` |
| `src/app/api/openclaw/agents/[agent]/soul/route.ts` | Créer | Proxy GET/POST vers gateway |
| `src/app/api/openclaw/agents/[agent]/tools/[tool]/route.ts` | Créer | Proxy POST toggle vers gateway |

### Fichiers Gateway modifiés / créés

| Fichier | Action | Rôle |
|---------|--------|------|
| `gateway/src/sessions/SessionManager.ts` | Modifier | Ajouter `disableTool(name)` et `enableTool(name, definition, executor)` |
| `gateway/src/routes/tools.ts` | Créer | `POST /agents/:agent/tools/:tool/toggle { enabled: boolean }` |
| `gateway/src/index.ts` | Modifier | Monter `makeToolsRouter(sessions)` |

---

## Détail des features

### 1. Données réelles dans l'organigram

**`useGatewayEvents()`** — hook client qui s'abonne à `GET /api/openclaw/events` (SSE). Retourne un tableau d'événements `GatewayEvent[]` (les 50 derniers). La route SSE `/api/openclaw/events` existe déjà et proxie le gateway si `OPENCLAW_GATEWAY_URL` est défini, sinon mock.

**`useAgentStatus()`** — polling toutes les 30s sur `GET /api/openclaw/status`. Route déjà existante avec un TODO à connecter au gateway. On la branche sur `GET http://[OPENCLAW_GATEWAY_URL]/health` qui retourne `{ ok, agents, uptime }`. Retourne `Record<AgentName, { online: boolean, lastHeartbeat: string }>`.

`EquipeView` remplace ses états simulés par ces deux hooks. Les cartes agent affichent le vrai statut. Les data-packets SVG s'animent uniquement quand le gateway est online.

### 2. Drawer latéral (`AgentDrawer`)

S'ouvre au clic sur une carte agent. Position fixe, droite de l'écran, largeur 480px. Backdrop semi-transparent (`bg-black/30`) ferme le drawer au clic. Header : nom agent + accent color + bouton fermer. Corps : 4 onglets pill.

#### Onglet Live
- Statut badge (online/offline) + dernière activité horodatée
- Feed des `GatewayEvent` filtrés sur `event.from === agentName || event.to === agentName`
- Format : `[HH:MM:SS] type : msg` en monospace fond `#111111`
- Auto-scroll vers le bas

#### Onglet SOUL.md
- `GET /api/openclaw/agents/:agent/soul` au montage → textarea pré-remplie
- Textarea dark, monospace, hauteur auto (min 300px)
- Bouton "Sauvegarder" → `POST /api/openclaw/agents/:agent/soul { content }` → gateway écrit sur disk + `updateSoul()` live
- Toast "SOUL mis à jour" on success
- Bouton désactivé si pas de changement (dirty tracking)

#### Onglet Skills
- Liste des skills de l'agent (depuis `openclaw.config.json` → `config.agents[agent].skills`)
- Chaque skill = ligne avec nom + description courte + toggle switch
- Toggle → `POST /api/openclaw/agents/:agent/tools/:tool/toggle { enabled: boolean }` → gateway `disableTool` ou `enableTool`
- État des toggles chargé depuis `/api/openclaw/status` (le health endpoint retournera les tools actifs)
- Si gateway offline → toggles disabled avec tooltip "Gateway hors ligne"

#### Onglet Prompt Lab
- Deux zones : éditeur SOUL.md temporaire (copié depuis l'onglet SOUL.md au montage, modifiable) + champ "Message test"
- Bouton "Tester" → `POST /api/test-agent { messages: [{role:'user', content: testMessage}], agent, systemPrompt: labSoul }` → réponse Anthropic streamée dans une zone résultat
- Bouton "Publier" (activé seulement après un test réussi) → copie le labSoul vers l'onglet SOUL.md et sauvegarde

### 3. Tools toggle — Gateway

`SessionManager` ajoute :
```typescript
disableTool(name: string): void  // supprime de this.tools Map
enableTool(name: string, definition: Omit<Tool,'name'>, executor: ToolExecutor): void  // re-register
```

Nouveau `gateway/src/routes/tools.ts` :
```
POST /agents/:agent/tools/:tool/toggle
Body: { enabled: boolean, definition?: ..., executor?: ... }
```

Le gateway doit conserver les définitions des tools désactivés pour pouvoir les ré-activer. `SessionManager` stocke un `disabledTools = new Map<string, ToolEntry>()`.

`GET /health` étendu pour retourner les tools actifs par agent :
```json
{
  "ok": true,
  "agents": {
    "soren": { "online": true, "activeTools": ["telegram_send", "sessions_send", "ghl_get_pipeline"] },
    "kai":   { "online": true, "activeTools": ["telegram_send", "twilio_send_sms"] },
    "mia":   { "online": true, "activeTools": ["telegram_send"] }
  }
}
```

### 4. Prompt Lab — `/api/test-agent`

La route existe déjà (`src/app/api/test-agent/route.ts`). Elle accepte `{ messages, agent }` et appelle Anthropic avec un system prompt hardcodé par agent. On l'étend pour accepter un `systemPrompt` optionnel qui override le system prompt par défaut — c'est tout ce qu'il faut pour le Prompt Lab.

---

## Flux de données — résumé

```
Thomas ouvre /equipe
  → useAgentStatus() poll :18789/health → statut dots mis à jour
  → useGatewayEvents() SSE → data-packets SVG animés si events

Thomas clique "Soren"
  → AgentDrawer s'ouvre
  → LiveTab : events SSE filtrés from/to soren
  → SoulTab : GET :18789/agents/soren/soul → textarea
  → SkillsTab : activeTools depuis useAgentStatus()

Thomas modifie SOUL.md → Save
  → POST :18789/agents/soren/soul
  → Gateway : writeFileSync + session.updateSoul() live
  → Soul actif immédiatement sans redémarrage

Thomas désactive "twilio_send_sms" sur Kai
  → POST :18789/agents/kai/tools/twilio_send_sms/toggle { enabled: false }
  → Gateway : session.disableTool('twilio_send_sms')
  → Kai ne peut plus envoyer de SMS immédiatement

Thomas teste un SOUL.md dans le Prompt Lab
  → POST /api/test-agent { agent: 'kai', systemPrompt: '...', messages: [...] }
  → Anthropic appel direct (session isolée)
  → Réponse streamée dans la zone résultat
  → Bouton Publier → POST :18789/agents/kai/soul
```

---

## Ce qui N'est PAS dans ce spec

- Override manuel (Thomas prend la main sur une conversation Telegram) — complexité élevée, v2
- Métriques avancées (taux réponse SMS, conversion) — v2, nécessite agrégation Supabase
- Historique des versions SOUL.md visible dans l'UI — les versions sont déjà en Supabase, UI v2

---

## Supabase

Aucune nouvelle table. Les versions SOUL.md vont déjà dans `soul_versions` (Plan B). Les logs agents vont dans `agent_interactions` (Plan B).

---

## Tests

- `AgentDrawer.test.tsx` — render, onglets, close on backdrop
- `useGatewayEvents.test.ts` — SSE parsing, reconnect on close
- `useAgentStatus.test.ts` — polling interval, status mapping
- `SoulTab.test.tsx` — dirty tracking, save button state
- `SkillsTab.test.tsx` — toggle call, disabled state when gateway offline
- `PromptLabTab.test.tsx` — test flow, publish button activation
- `gateway/src/routes/tools.test.ts` — toggle enable/disable, unknown agent 404
- `gateway/src/sessions/SessionManager.test.ts` — disableTool, enableTool

---

## Métriques de succès

- Vrais statuts agents visibles dans le diagramme (plus de simulation)
- SOUL.md modifiable et actif en < 2s sans redémarrage gateway
- Skill toggle effectif immédiatement
- Prompt Lab retourne une réponse Anthropic réelle en < 5s
