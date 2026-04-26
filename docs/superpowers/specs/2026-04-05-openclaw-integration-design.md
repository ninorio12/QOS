# Soren × OpenClaw — Système d'acquisition agentique BTP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connecter le SaaS Soren à OpenClaw pour transformer les agents simulés (Soren/Kai/Mia) en agents autonomes réels, capables de répondre aux leads, orchestrer des workflows et communiquer entre eux — avec une page d'architecture live pour les présentations partenaires.

**Architecture:** OpenClaw Gateway tourne en local (ou VPS Linux) comme runtime agent. Le SaaS Next.js communique avec le gateway via WebSocket/REST. Les agents sont de vrais processus OpenClaw configurés avec des SOUL.md et SKILL.md spécifiques BTP.

**Tech Stack:** OpenClaw (Node 24, TypeScript), Anthropic API, Twilio SMS, Telegram (grammY), GHL API, Supabase, Next.js 14, Tailwind CSS.

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────────┐
│                  SOREN SAAS (Next.js)                │
│  Dashboard · Pipeline · Contacts · Équipe · Logs     │
│  /architecture (nouvelle page démo)                  │
└──────────────────┬──────────────────────────────────┘
                   │ REST + WebSocket (ws://gateway:18789)
┌──────────────────▼──────────────────────────────────┐
│           OPENCLAW GATEWAY                           │
│         Sessions · Routing · Tool execution          │
│         Cron · Webhooks · Skills                     │
└──────┬────────────────┬───────────────┬─────────────┘
       │                │               │
┌──────▼──────┐  ┌──────▼──────┐  ┌────▼────────┐
│   SOREN     │  │    KAI      │  │    MIA      │
│ Orchestrateur│  │ CSM Agent  │  │ KB + Devis  │
│ Opus 4.6    │  │ Sonnet 4.6 │  │ Haiku 4.5  │
│ Session main│  │ Session kai │  │ Session mia │
└──────┬──────┘  └──────┬──────┘  └────┬────────┘
       │                │               │
       │         ┌──────▼──────┐        │
       │         │   CANAUX    │        │
       │         │ Twilio SMS  │        │
       │         │ Telegram    │        │
       │         │ (WhatsApp*) │        │
       │         └─────────────┘        │
       │                                │
┌──────▼────────────────────────────────▼────────┐
│                  INTÉGRATIONS                   │
│  GHL API · Meta Webhooks · Twilio · Supabase   │
└─────────────────────────────────────────────────┘
```

---

## 2. Les 3 agents OpenClaw

### Soren — Orchestrateur (Claude Opus 4.6)
- **Session OpenClaw** : `main` (full host access)
- **Responsabilités** :
  - Reçoit les événements pipeline GHL (webhooks)
  - Délègue à Kai ou Mia via `sessions_send`
  - Envoie les digests quotidiens à Thomas via Telegram (07h00, cron)
  - Monitore la santé du système (quota API, erreurs)
  - Génère les rapports hebdomadaires pipeline
- **SOUL.md** : rôle CEO/orchestrateur, priorité pipeline ACQUISITION, langue FR
- **Skills** : `ghl-pipeline`, `telegram-digest`, `sessions-delegate`

### Kai — CSM Agent (Claude Sonnet 4.6)
- **Session OpenClaw** : `kai` (sandboxed, accès Twilio + GHL)
- **Responsabilités** :
  - Reçoit les leads Meta (via Soren `sessions_send`)
  - Envoie SMS de bienvenue personnalisé via Twilio < 60 sec
  - Qualifie le lead (budget, type travaux, délai, zone géo)
  - Met à jour le stage GHL et le score
  - Planifie les RDV dans GHL Calendar
  - Relances automatiques (J+2, J+7, J+30) si pas de réponse
- **SOUL.md** : rôle CSM qualificateur BTP, ton chaleureux professionnel, FR
- **Skills** : `twilio-sms`, `ghl-contacts`, `ghl-opportunities`, `calendar-book`

### Mia — KB + Devis (Claude Haiku 4.5)
- **Session OpenClaw** : `mia` (sandboxed, accès fichiers KB)
- **Responsabilités** :
  - Génère les pré-devis depuis les templates KB (< 5 min)
  - Met à jour la base de connaissance (nouveaux contacts, chantiers)
  - Archive les conversations qualifiées
  - Détecte les devis sans réponse → alerte Kai pour relance
- **SOUL.md** : rôle KB manager, précision documentaire, FR
- **Skills** : `devis-generator`, `kb-sync`, `file-archive`

---

## 3. Flux Meta Lead Ads → SMS Kai

```
1. Lead remplit formulaire Meta Ads
2. Meta envoie webhook → POST /api/webhooks/meta (Soren SaaS)
3. Soren SaaS :
   a. Valide la signature Meta (X-Hub-Signature-256)
   b. Extrait : nom, téléphone, email, type_travaux, budget, délai
   c. Crée le contact dans GHL (POST /contacts)
   d. Crée l'opportunité dans GHL pipeline ACQUISITION
   e. Envoie événement à OpenClaw Gateway :
      sessions_send("kai", { type: "new_lead", lead: {...} })
4. Kai reçoit l'événement, génère message personnalisé Claude
5. Twilio SMS envoyé au lead < 60 secondes
6. Lead répond → Kai reçoit SMS entrant → qualification en cours
7. Lead qualifié → Kai met à jour GHL stage → sessions_send("soren", { qualified })
8. Soren reçoit → Telegram alert à Thomas
```

---

## 4. Communication inter-agents (OpenClaw sessions_send)

Le protocole natif OpenClaw `sessions_send` permet aux agents de se parler directement :

```typescript
// Soren délègue à Kai
await sessions_send("kai", {
  type: "new_lead",
  lead: { name, phone, formData },
  priority: "high"
})

// Kai remonte à Soren
await sessions_send("soren", {
  type: "lead_qualified",
  leadId, score, stage, nextAction
})

// Soren demande devis à Mia
await sessions_send("mia", {
  type: "generate_devis",
  contact, requirements, budget
})
```

---

## 5. Webhooks entrants

| Endpoint | Source | Action |
|---|---|---|
| `POST /api/webhooks/meta` | Meta Lead Ads | Créer lead GHL + trigger Kai |
| `POST /api/webhooks/ghl` | GoHighLevel | Sync pipeline → Supabase |
| `POST /api/webhooks/twilio` | Twilio SMS entrant | Router vers Kai |
| `GET /api/openclaw/status` | Soren SaaS UI | Status gateway + agents |
| `GET /api/openclaw/events` | Soren SaaS UI (SSE) | Stream événements live |

---

## 6. Page /architecture (démo partenaire)

Nouvelle page dans le SaaS Soren visualisant le système en temps réel :

- **Topologie agents** : Soren → Kai + Mia avec connexions animées
- **Status live** : chaque agent online/offline avec dernier heartbeat réel (OpenClaw gateway)
- **Event stream** : logs inter-agents en temps réel (SSE `/api/openclaw/events`)
- **Métriques** : leads traités, SMS envoyés, RDV bookés, temps de réponse moyen
- **Flux actif** : visualisation du parcours d'un lead de Meta → SMS → GHL

---

## 7. Configuration OpenClaw requise

```json
// ~/.openclaw/workspace/config.json
{
  "agent": {
    "model": "anthropic/claude-opus-4-6"
  },
  "sessions": {
    "kai": {
      "model": "anthropic/claude-sonnet-4-6",
      "prompt": "~/.openclaw/workspace/.agents/kai/SOUL.md"
    },
    "mia": {
      "model": "anthropic/claude-haiku-4-5-20251001",
      "prompt": "~/.openclaw/workspace/.agents/mia/SOUL.md"
    }
  }
}
```

---

## 8. Roadmap sprints

| Sprint | Livrable | Valeur immédiate |
|---|---|---|
| 1 | OpenClaw runtime + config agents | Agents réels, pas simulés |
| 2 | Kai SMS Twilio + Telegram digest Soren | Réponse < 1 min + alertes Thomas |
| 3 | Meta webhooks → GHL + trigger Kai | Top of funnel automatisé |
| 4 | Page /architecture live | Démo partenaires/clients |
| 5 | Widget chat embarquable | Agent sur site client BTP |
| 6 | Mia pré-devis automatique | -80% temps admin |
| 7 | Permis de construire monitoring | Pipeline proactif |
| 8 | WhatsApp Business | Canal premium |

---

## 9. Différenciateurs concurrentiels

| Point | Soren × OpenClaw | CRM classique |
|---|---|---|
| Réponse lead | < 60 secondes, 24/7 | 2-3 jours |
| Qualification | Automatique + score IA | Manuelle |
| Coordination agents | Inter-agent natif | N/A |
| Canaux | SMS, Telegram, WhatsApp | Email uniquement |
| Dévis | Pré-généré < 5 min | 2-4 heures |
| Attribution | Meta Conversions API | Non mesurée |
| Coût | ~1-2€/lead traité | Commercial humain |
