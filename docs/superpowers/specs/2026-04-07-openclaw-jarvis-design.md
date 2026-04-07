# Spec : Soren × OpenClaw — Système Jarvis BTP

**Date :** 2026-04-07
**Stack :** OpenClaw Gateway (Node.js, PM2), Next.js 14, Telegram Bot API (3 bots), Whisper API, Anthropic API, GHL API, Twilio, Supabase
**Contrainte principale :** Comportement Jarvis — proactif, autonome, auto-améliorant

---

## Vision

Trois agents IA (Soren, Kai, Mia) coexistent dans un groupe Telegram avec Thomas. Chacun a sa propre identité Telegram (pas de label "bot" visible dans le fil), son propre rôle, et son propre périmètre d'action. Ils agissent sans qu'on leur demande, se coordonnent entre eux, et s'améliorent chaque semaine en analysant leurs propres résultats.

Le SaaS Soren est leur terrain de jeu — ils y créent des tâches, lisent le pipeline, mettent à jour les contacts. L'interface `/equipe` du SaaS est leur panneau de contrôle : Thomas peut modifier leur SOUL.md, activer/désactiver des skills, lire leurs logs.

---

## Architecture globale

```
[Groupe Telegram]
  Thomas (vocal/texte)     ← voix → Whisper → texte
  Soren  (@SorenAI)        ← bot token 1
  Kai    (@KaiAI)          ← bot token 2
  Mia    (@MiaAI)          ← bot token 3
         │
         ▼ webhook (HTTPS)
[HETZNER VPS — PM2]
  OpenClaw Gateway :18789
  ┌──────────────────────────────────┐
  │  Session: soren  (Opus 4.6)     │
  │  Session: kai    (Sonnet 4.6)   │
  │  Session: mia    (Haiku 4.5)    │
  └──────────────┬───────────────────┘
                 │ sessions_send
      ┌──────────┼──────────┐
      ▼          ▼          ▼
   GHL API    Twilio    Supabase
                 │
      ┌──────────▼──────────┐
      │    SOREN SAAS       │
      │  /taches · /pipeline│
      │  /equipe (panneau)  │
      └─────────────────────┘
```

---

## Les 3 agents

### Soren — Orchestrateur (Opus 4.6)
- **Rôle :** Cerveau central. Lit tous les messages du groupe, route vers Kai/Mia, monitore le pipeline, génère les digests et l'auto-amélioration.
- **Proactivité :**
  - `07h00` cron → digest pipeline dans le groupe
  - Poll GHL toutes les 10 min → alerte si lead chaud sans contact > 2h
  - Dimanche `09h00` → analyse hebdomadaire + suggestions SOUL.md
- **Escalade Thomas :** uniquement leads > 100k€ ou situations hors-script

### Kai — CSM Agent (Sonnet 4.6)
- **Rôle :** Premier contact prospects. SMS < 60s, qualification, relances, booking RDV.
- **Proactivité :**
  - Relances automatiques J+2, J+7, J+30 sans intervention
  - Détecte leads sans réponse → remonte à Soren
- **Skills actifs :** twilio-sms, ghl-contacts, ghl-opportunities, calendar-book

### Mia — KB + Devis (Haiku 4.5)
- **Rôle :** Gestion documentaire. Pré-devis < 5 min, mise à jour KB, archivage.
- **Proactivité :**
  - Surveille devis non signés > 72h → déclenche relance Kai
  - Sync KB après chaque conversation qualifiée
- **Skills actifs :** devis-generator, kb-sync, file-archive

---

## Flux vocal (< 4 secondes)

```
1. Thomas envoie note vocale dans le groupe
2. Bot Soren reçoit le fichier audio (file_id Telegram)
3. Download audio → POST OpenAI Whisper API → texte transcrit
4. Texte envoyé à session "soren" sur gateway OpenClaw
5. Soren analyse, répond et/ou délègue (sessions_send vers kai/mia)
6. L'agent concerné poste sa réponse avec son propre bot token
   Délai visé : < 4 secondes bout en bout
```

---

## Flux proactif (sans intervention Thomas)

```
1. Cron OpenClaw (toutes les 10 min) réveille Soren
2. Soren appelle skill "ghl-pipeline" → lit les leads actifs
3. Détecte lead > 2h sans contact → sessions_send("kai", { type: "urgent_contact", lead })
4. Kai génère SMS personnalisé → Twilio → lead contacté
5. Kai poste dans le groupe : "📱 SMS envoyé à Jean Dupont (façade 35k€) — relance urgente"
6. Outcome loggé dans Supabase (agent_tasks)
```

---

## Auto-amélioration (cycle hebdomadaire)

```
Dimanche 09h00 :
1. Soren lit Supabase → 7 derniers jours d'interactions
2. Analyse : taux réponse par type message, conversions par profil lead, patterns détectés
3. Génère suggestions SOUL.md pour Kai et Mia
4. Poste dans le groupe :
   "📊 Analyse semaine : 23 leads, 67% taux réponse SMS.
    Observation : leads mentionnant 'urgence' convertissent 3x mieux.
    Suggestion Kai : prioriser ces leads en < 30s.
    Je mets à jour ? (oui/non)"
5. Thomas répond "oui" → Soren appelle API SaaS → SOUL.md mis à jour
6. Nouvelle version activée immédiatement sur le gateway
```

---

## SaaS — Page /equipe (panneau de contrôle)

### Par agent :
- **Éditeur SOUL.md** inline (textarea + save → push vers gateway)
- **Skills toggles** : activer/désactiver chaque skill individuellement
- **Status live** : online/offline + dernier heartbeat + action en cours ("Kai : rédaction SMS Jean Dupont")
- **Logs** : fil chronologique des actions (type, lead concerné, résultat, durée)
- **Métriques** : leads traités, SMS envoyés, taux réponse, temps moyen

### Prompt Lab :
- Champ "tester SOUL.md" : modifier temporairement le SOUL, envoyer un lead fictif, voir la réponse simulée avant de publier

### Override manuel :
- Thomas peut "prendre la main" sur une conversation → l'agent se met en pause, Thomas répond manuellement, puis rend la main

---

## Enrichissements SaaS liés aux agents

### /pipeline :
- Agent assigné visible sur chaque opportunité
- Prochaine action planifiée par l'agent
- Fil des derniers messages Telegram échangés avec le lead

### /conversations :
- Tag agent sur chaque message (Kai, Mia, Manuel)
- Score de qualification décomposé (budget 40pts, délai 30pts, zone 20pts, décideur 10pts)

---

## Déploiement Hetzner

- **Process manager :** PM2 (`pm2 start openclaw --name gateway --watch`)
- **Restart auto :** `pm2 startup` → survie aux reboots
- **3 webhooks Telegram :** HTTPS requis → Nginx + Let's Encrypt sur le VPS
- **Variables d'env :** `.env` sur le VPS (API keys Anthropic, Telegram tokens x3, Twilio, GHL)
- **Logs PM2 :** `pm2 logs gateway` pour debug

---

## Supabase — Tables nouvelles

| Table | Colonnes clés | Usage |
|---|---|---|
| `agent_interactions` | agent, lead_id, type, outcome, duration, created_at | Base d'apprentissage |
| `agent_memory` | agent, key, value, updated_at | Mémoire longue par lead |
| `soul_versions` | agent, content, deployed_at, author | Historique des SOUL.md |

---

## Métriques de succès

- Premier SMS Kai envoyé < 60s après lead Meta
- Réponse vocale Thomas → réponse agent < 4s
- Digest 07h00 posté sans intervention
- Auto-amélioration hebdomadaire fonctionne (suggestion + validation Thomas)
- Zéro downtime gateway > 99% uptime (PM2 watchdog)
