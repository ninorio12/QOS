---
name: aios-blueprint
description: Blueprint pour déployer une IAO (IA Operations) sur Hermes Agent — architecture AIOS 3 couches, mapping composants, ordre d'installation, crons types.
keywords: [aios, iao, architecture, deployment, context-os, data-os, capture-os, clientops]
---

# AIOS Blueprint — Déployer une IAO sur Hermes Agent

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## Architecture 3 couches

### 1. Context OS — qui tu es
Tout ce que l'agent doit savoir avant de réfléchir.
- **SOUL.md** → personnalité, ton, brand voice du client
- **Memory (user)** → qui est le client, ses règles, son business, ses red lines
- **Memory (notes)** → ce que l'agent a appris au fil du temps
- **Skills métier** → process spécifiques à la niche (onboarding, relance, etc.)

### 2. Data OS — ce que tu sais
La source de vérité. Tout ce que l'agent consulte pour agir.
- **DB** (Convex ou autre) → clients, paiements, statuts, historique
- **Second Brain** (`/root/`) → wiki compilé, raw sources, ops, outputs
- **Google Sheets/Dashboard** → KPIs, métriques
- **Sessions passées** → session_search, mémoire conversationnelle

### 3. Capture OS — ce que tu vois
Les entrées qui alimentent le Data OS.
- **Second Brain pipeline (v3)** → sb-capture.py (30m), sb-context-scan.py (2h), sb-lint.py (hebdo)
- **MCP servers** → connecteurs vers les APIs externes
- **Cron jobs** → agents autonomes qui fetchent et analysent
- **Webhooks** → événements temps réel (paiement, message)
- **Discord/Slack/Telegram** → canaux de communication

## Ordre d'installation

**Pré-requis :** Le VPS doit avoir Claude Code CLI + Codex CLI installés avec les abonnements du client (voir SOP #1). Ce sont les outils de l'intégrateur sur la machine client.

1. **Claude Code lance setup-aios-brain** — crée la structure /root/ depuis le package AIOS
2. **Context OS** — installer Hermes, coller le bootstrap → SOUL.md + mémoire + skills métier configurés par Hermes
3. **Data OS** — connecter les sources de vérité (DB, sheets, dashboard)
4. **Capture OS en dernier** — brancher les capteurs (crons, MCP, webhooks)

### Flow AIOS client (SOPs #1-5)
```
SOP #1: VPS + deps + Claude Code + Codex (abonnements client)
SOP #2: Package AIOS (machine AIOS)
SOP #3: Claude Code → setup-aios-brain → install Hermes → bootstrap → vérif
SOP #4: Data OS (Vercel + Convex)
SOP #5: Validation & livraison
```

**Pourquoi Claude Code avant Hermes ?** Claude Code crée la structure brain que le bootstrap Hermes va lire. Sans ça, le bootstrap n'a rien à consulter. Le bootstrap est la DERNIÈRE étape, pas la première.

## Granularité des agents — process vs SOP

Règle forte issue des analyses Cameron England / License & Scale : **design par process, exécution par SOP**.

- **Process** = flux de bout en bout qui produit un résultat business mesurable (onboarding client, suivi post-call, client health, reporting, paiements).
- **SOP** = runbook détaillé pour exécuter une activité précise dans ce process (relance J+3, update CRM, génération rapport, escalade).
- **Subagent** = owner opérationnel d'un process ou sous-process. Il utilise des SOPs; il ne doit pas être défini comme un SOP.

Bon pattern: 1 Agent COO / orchestrateur + 2–3 subagents quick wins par process critique avant extension. Ne pas créer un agent par département entier (`agent marketing`) ni par micro-tâche (`agent relance J+3`). Voir `references/process-vs-sop-agent-placement.md`.

## Les 10 crons types d'une IAO

### Temps réel (15min)
- **Escalades HITL** — delta-based (MD5 hash), alerte uniquement sur du nouveau

### Horaire
- **Capture sync** — fetch messages depuis Discord/Slack/autre

### Quotidien
- **CSM Monitor** (9h) — scan channels, alertes signaux faibles
- **Heartbeat Business** (10h + 18h) — vue d'ensemble projets
- **Heartbeat Infra** (toutes les 2h) — santé services, auto-heal

### Nocturne
- **Batch processing/RAG** (2h) — traitement NLP, extraction contexte, wiki update
- **Dream consolidation** (3h30) — mémoire, patterns long terme, cleanup

### Hebdomadaire
- **CSM Deep Analysis** (lundi 8h) — patterns réussite, élèves à risque
- **Data Analyst KPIs** (lundi 9h) — tendances, anomalies, ROI
- **CFO rapport** (lundi + jeudi 9h) — cash, échéances, commissions

## Second Brain (v3 Pipeline — Karpathy method)

Le Second Brain est le cerveau opérationnel de l'agent. Structure dans `/root/`.

### Structure
```
/root/
├── config/         Identité business (lecture seule pour l'agent)
├── raw/            Sources brutes (append-only, immuable)
│   ├── transcriptions/   Appels, meetings
│   ├── meetings/         tl;dv auto-capturées
│   ├── conversations/    Sessions chat (Telegram, WhatsApp)
│   ├── discord/          Messages Discord
│   ├── messages/         Messages groupes
│   ├── docs/             Documents
│   ├── brainstorming/    Notes brainstorming
│   ├── web/              Articles, clippings
│   └── assets/           Images, diagrams
├── wiki/           Knowledge compilée (l'agent gère)
│   ├── entities/         Personnes, entreprises, produits
│   ├── concepts/         Méthodes, frameworks, process
│   ├── comparisons/      Analyses comparatives
│   ├── queries/          Réponses archivées
│   ├── index.md          Catalogue (TOUJOURS à jour)
│   ├── log.md            Journal append-only
│   └── SCHEMA.md         Conventions + frontmatter business
├── ops/            Opérations (l'agent gère)
├── outputs/        Productions (l'agent gère)
├── projects/       Codebases (lecture seule)
└── archive/        Contenu dormant
```

### Pipeline v3 (3 scripts + 3 crons)
- **sb-capture.py** (every 30m) — capture Telegram, Discord, tl;dv → raw/ (watermark-based)
- **sb-context-scan.py** (every 120m) — scan raw/ → compile wiki/ avec extraction business
- **sb-lint.py** (weekly) — contrôle qualité + alertes business (deals froids, élèves fantômes)
- **sb-health.py** (on-demand) — dashboard KPIs

State : `~/.hermes/state/second_brain_*.json`
Scripts : `~/.hermes/scripts/sb-*.py`
Tous silencieux (deliver: local), sauf urgence.

### Frontmatter business (SCHEMA.md v2)
Chaque page wiki a un frontmatter enrichi :
- Clients : `status`, `deal_value`, `last_contact`, `responsible`
- Élèves : `phase`, `niche`, `offer`
- Extraction automatique : type call, décisions, actions, pain points, deal signal

## Ce qui change par niche

La structure reste identique. Ce qui s'adapte :
- Les **sources de capture** (Discord vs Slack vs autre)
- Les **métriques business** (e-com ≠ coaching ≠ SaaS)
- Les **règles CSM** (qu'est-ce qu'un signal faible dans cette niche ?)
- Le **SOUL.md** (ton, langue, brand voice)
- Les **seuils d'alerte**

## Structure fichiers

### Second Brain — /root/
```
/root/
├── config/         Identité business (brand-voice, icp, products, team, tools)
├── raw/            Sources brutes (9 sous-dossiers, append-only)
├── wiki/           Knowledge compilée (entities, concepts, SCHEMA, index, log)
├── ops/            Décisions, SOPs
├── outputs/        Livrables clients, rapports
├── projects/       Codebases
└── archive/        Contenu dormant
```

### Hermes config — ~/.hermes/
```
~/.hermes/
├── SOUL.md                 # Context OS: personnalité
├── config.yaml             # Modèle, routing, compression
├── state/                  # State des pipelines
│   ├── second_brain_capture.json
│   ├── second_brain_context.json
│   └── second_brain_lint.json
├── skills/
│   └── clientops/            # Context OS: process métier
│       ├── generate-cdc/
│       ├── aios-blueprint/
│       ├── second-brain-ops/
│       ├── sop-questionnaire-onboarding/
│       └── ...
└── scripts/                # Capture OS: scripts
    ├── sb-capture.py       # Second Brain capture
    ├── sb-context-scan.py  # Second Brain ingest
    ├── sb-lint.py          # Second Brain lint
    ├── sb-health.py        # Second Brain dashboard
    └── ...
```

## Créer un bootstrap client (bootstrap-hermes.md)

Le bootstrap est le prompt d'initialisation d'Hermes pour un nouveau client. C'est la DERNIÈRE étape de l'install (Phase C de SOP #3), collé dans `hermes chat` après que Claude Code ait créé la structure brain.

### Workflow
1. Lire le template : `/workspace/config/frameworks/bootstrap-hermes.md`
2. Lire la fiche client Data OS : `clients:getClient` avec le slug
3. Lire le wiki entity du client : `/workspace/wiki/entities/<client>.md`
4. Lire le CDC : `/workspace/outputs/clients/<client>/CDC-*.md`
5. Remplacer toutes les `{{variables}}` avec les données client
6. Customiser les étapes 6-8 (ingest rules, daily brief format) pour la niche
7. Sauvegarder dans `/workspace/outputs/clients/<client>/bootstrap-<client>.md` + `/workspace/config/frameworks/bootstrap-<client>.md`
8. **Ajouter dans Data OS** : `clients:addDocument` avec `content` (markdown inline) pour rendu dans le dashboard

### Personnalisation par niche
- **Immobilier** → agent_name: Atlas, pragmatiste, scoring leads 🔴🟡🔵, signaux mandats/estimations
- **E-commerce** → agent_name: Forge, pattern matcher, métriques conversion/panier
- **Services B2B** → agent_name: Monday, goal digder, focus pipeline/deals
- **Santé/Bien-être** → agent_name: Sage, systems thinker, compliance/privacy focus
- **Formation/Coaching** → agent_name: Mentor, décomposeur, focus engagement/progression

### Règles extraction par niche (pour l'étape 6 du bootstrap)
- **Immobilier** : leads (nom/bien/budget/urgence/score), mandats, estimations, R1/R2, marché local
- **E-commerce** : commandes, retours, paniers abandonnés, AOV, conversion rate
- **Services B2B** : deals, proposals, pipeline stage, follow-ups, contract value

## Pattern agence multi-tenant — master + containers clients

Quand l'AIOS est vendu par une agence qui doit opérer plusieurs clients, le bon pattern est :

```text
Hermes master agence
  -> orchestrator/API interne signée
  -> Docker proxy / Docker SDK
  -> containers Hermes isolés par client
```

Règle forte : **le master est le cockpit agentique, pas le tenant client et pas un gros script bash**. Il doit piloter un orchestrator avec des opérations explicites (`provision_cliente`, `provision_agent`, `status`, `backup`, `restore`, `restart`) plutôt que manipuler tout à la main. Chaque nouveau client doit suivre une convention stable (`client-<slug>`), avec data root dédié, secrets dans `.env`, modules/catalogue montés read-only, limites ressources, healthcheck et flow idempotent. Les anciens clients legacy (ex. container historique non `client-<slug>`) doivent être documentés comme exceptions et jamais migrés automatiquement.

Audit détaillé + checklist : voir `references/agency-master-client-containers.md`. Exemple terrain d'audit résilience Agence Evo : voir `references/evo-agency-resilience-audit-2026-05-09.md`.

## Positionnement CDC client

Pour les CDC AIOS, ne pas vendre Hermes comme une suite d'automatisations figées. Positionner Hermes comme un **agent personnel évolutif** : AIOS installe la structure Second Brain/Context OS, Telegram, connexions outils et premiers skills; le client fait évoluer l'agent par l'usage quotidien, ses corrections et ses méthodes.

Règle forte : **Phase 1 = adaptation à l'existant, pas transformation organisationnelle**. Ne pas inventer de nouveaux pipelines CRM, stages ou process dans le CDC. Cartographier les outils/process actuels, puis faire écrire Hermes dans les objets existants après validation. Voir `references/client-hermes-agent-positioning.md`.

Placement stratégique recommandé : trouver un geste manuel répétitif du dirigeant et y placer Hermes. Le meilleur pattern générique est la **capture opérationnelle Telegram** : le client envoie un vocal/texte/screenshot/lead, Hermes extrait, structure, route vers le bon SaaS/Data OS/Second Brain, puis demande validation avant action sensible.

## Pitfalls

- **No process change by default** — ne jamais refondre pipelines, stages, tags ou organisation client en phase 1; Hermes optimise l'existant.
- **HITL strict** — jamais d'action client sans validation humaine
- **Anti-spam** — crons fréquents DOIVENT tracker le delta (voir skill heartbeat-system)
- **[SILENT]** — les crons qui n'ont rien à dire répondent "[SILENT]" pour supprimer la livraison
- **Compression** — activer la compression contexte pour les longues conversations (Gemini Flash en summarizer)
- **Smart routing** — messages simples sur Haiku, le reste sur le modèle principal
