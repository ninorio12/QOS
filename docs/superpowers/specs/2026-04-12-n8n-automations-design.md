# N8N Automations — Design Spec
**Date:** 2026-04-12  
**Statut:** Brainstorming autonome (utilisateur indisponible)

## Contexte

Le SaaS Soren dispose d'une infrastructure agentique complète :
- 3 agents IA : Soren (COO/analyste), Kai (CSM/qualificateur), Mia (KB/docs)
- 6 endpoints webhook actifs (GHL, Cal.com, Twilio WhatsApp, Meta, Telegram, Google Calendar)
- Supabase : tables conversations, messages, contacts, leads, devis, devis_relances, agent_tasks, agent_interactions, agent_memory
- Services externes : GHL CRM, APITemplate.io (PDF), Twilio/WhatsApp, Telegram, Claude API

N8N vient orchestrer la couche **inter-systèmes** : déclencher des workflows complexes en réponse à des événements, connecter des services qui ne se parlent pas nativement, et automatiser les tâches répétitives à valeur métier.

---

## Les 7 automations prioritaires

### Automation 1 — Voice Note → Devis automatique ⭐⭐⭐

**Problème résolu :** Un artisan en chantier ne peut pas taper un devis. Il envoie un vocal à Soren depuis WhatsApp ou Telegram. Aujourd'hui rien ne se passe.

**Flow :**
```
WhatsApp/Telegram audio → N8N Webhook Trigger
→ Téléchargement fichier audio (Twilio Media URL / Telegram File API)
→ Transcription Whisper (OpenAI Audio API)
→ Claude Sonnet : extraction structurée (client, travaux, montants estimés, conditions)
→ POST /api/webhooks/n8n/devis (endpoint existant selon spec 2026-04-08)
→ APITemplate.io génère le PDF
→ PDF stocké Supabase + envoyé au contact GHL via SMS/WhatsApp
→ Notification Telegram à l'artisan : "Devis créé ✓ [lien preview]"
```

**Déclencheur N8N :** Webhook entrant depuis `/api/webhooks/telegram` ou `/api/webhooks/twilio/whatsapp` quand `message.type === 'audio'`

**Prompt Claude extraction :**
```
Tu reçois la transcription d'un message vocal d'un artisan qui dicte un devis.
Extrais en JSON : { client_name, client_address, travaux: [{description, quantite, prix_unitaire}], conditions_paiement, delai_realisation }
Si une info manque, laisse le champ vide. Ne hallucine pas de montants.
```

**Tables Supabase impactées :** `devis` (création), `devis_relances` (init), `agent_tasks` (suivi)

**Valeur métier :** Réduit le temps de création devis de 20min → 2min. Différenciateur fort.

---

### Automation 2 — Relance automatique devis sans réponse ⭐⭐⭐

**Problème résolu :** Les devis envoyés sans réponse se perdent. Pas de relance systématique aujourd'hui.

**Flow :**
```
Cron N8N : tous les jours à 9h00
→ Supabase query : SELECT * FROM devis WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '3 days' AND relance_count < 3
→ Pour chaque devis :
  → Incrémenter relance_count dans devis_relances
  → Si relance 1 (J+3) : SMS via GHL "Bonjour [prénom], votre devis est disponible ici : [lien]. Questions ?"
  → Si relance 2 (J+7) : WhatsApp + email via GHL avec message personnalisé Claude
  → Si relance 3 (J+14) : Notification Telegram à l'artisan "Relancer manuellement [client] ?"
→ Log dans agent_tasks
```

**Personnalisation relance 2 (Claude) :**
```
Génère un SMS de relance chaleureux (max 160 chars) pour [prénom_client] pour un devis de [travaux] à [montant]€.
Ton : professionnel mais accessible. Inclure une question ouverte pour relancer la conversation.
```

**Tables Supabase :** `devis`, `devis_relances` (update count + dates), `agent_interactions` (log)

**Valeur métier :** +20-30% de devis convertis selon benchmarks secteur bâtiment.

---

### Automation 3 — Rapport hebdomadaire business → Telegram ⭐⭐

**Problème résolu :** L'artisan n'a pas le temps de regarder son dashboard. Il veut un résumé actionnable chaque lundi matin.

**Flow :**
```
Cron N8N : lundi 07h30
→ Supabase queries parallèles :
  → Devis : créés / envoyés / signés cette semaine + CA signé
  → Leads : nouveaux / qualifiés / perdus
  → Conversations : taux de réponse IA vs humain
  → Relances : automatiques envoyées + taux de réponse
→ Claude Sonnet : génère rapport narratif avec recommandations
→ Telegram message à l'artisan (format structuré avec emojis)
→ Optionnel : GHL note sur contact "Propriétaire" avec le rapport
```

**Format rapport Telegram :**
```
📊 *Rapport semaine du [date]*

💰 *Devis*
• 8 créés · 6 envoyés · 2 signés
• CA signé : 12 400€ (+18% vs semaine dernière)

🎯 *Pipeline*
• 14 leads actifs · 3 qualifiés chauds
• À prioriser : Martin Dupont (demande urgente cuisine)

⚡ *Actions recommandées*
1. Relancer les 3 devis à J+5 sans réponse
2. Rappeler Sophie Bernard — budget confirmé 8k€
```

**Valeur métier :** Visibilité hebdomadaire sans effort. L'artisan reste "dans la boucle" sans ouvrir l'app.

---

### Automation 4 — Qualification automatique leads entrants ⭐⭐⭐

**Problème résolu :** Les leads Meta Ads arrivent dans GHL mais ne sont pas qualifiés ni scorés. L'artisan rappelle tout le monde sans priorisation.

**Flow :**
```
Trigger : POST /api/webhooks/meta/leadgen (webhook existant)
→ N8N reçoit le lead (nom, email, phone, ad_name, form_data)
→ Claude Sonnet : scoring lead (budget estimé, urgence, type de travaux, zone géo)
→ Score 1-10 → tag GHL (hot/warm/cold)
→ Si score ≥ 7 :
  → SMS automatique dans les 5min (taux de contact x3 si <5min)
  → Notification Telegram à l'artisan : "🔥 Lead chaud entrant : [nom] — [travaux] [budget]"
→ Si score 4-6 :
  → Email de bienvenue + qualification form
  → Ajout séquence nurturing (Automation 5)
→ Si score < 4 :
  → Tag "cold" + séquence longue 30 jours
→ Log Supabase leads + agent_interactions
```

**Prompt scoring Claude :**
```
Lead entrant d'une publicité Meta pour artisan bâtiment/rénovation.
Données : [form_data]. Pubicité : [ad_name].
Score ce lead de 1-10 selon : budget mentionné, urgence signalée, clarté du projet, cohérence avec nos services.
Réponds JSON : { score: number, budget_estime: string, urgence: "haute|normale|faible", type_travaux: string, raison: string }
```

**Valeur métier :** Priorisation automatique → l'artisan rappelle les chauds en premier → +40% taux de conversion.

---

### Automation 5 — Nurturing leads froids (séquence 30 jours) ⭐⭐

**Problème résolu :** Les leads froids sont oubliés. Pourtant 30-40% des ventes viennent de leads qui ont dit non initialement.

**Flow :**
```
Trigger : tag "cold" posé sur contact GHL (via Automation 4 ou manuel)
→ J+0 : Email personnalisé "Vos travaux, quand vous le souhaitez"
→ J+3 : SMS avec photo réalisation similaire (URL image Supabase)
→ J+7 : Email avec témoignage client + lien simulateur ROI
→ J+14 : SMS "Offre limitée ce mois-ci"
→ J+30 : Dernière tentative + sortie séquence si pas de réponse

À chaque message :
→ Claude génère le contenu personnalisé (prénom, type de travaux du lead)
→ GHL sendMessage (SMS) ou sendEmail
→ Tracking ouverture/clic → si interaction → escalade vers Kai (agent qualificateur)
```

**Tables Supabase :** `leads` (suivi séquence), `agent_tasks` (états)

**Valeur métier :** Monétise les leads payés Meta qui ne convertissent pas immédiatement.

---

### Automation 6 — Sync contact GHL → Supabase temps réel ⭐⭐

**Problème résolu :** Les contacts créés ou mis à jour dans GHL ne sont pas toujours reflétés dans Supabase. Les agents IA travaillent parfois sur des données obsolètes.

**Flow :**
```
Trigger : GHL webhook "contact.created" ou "contact.updated"
→ N8N reçoit le payload GHL contact
→ Upsert Supabase contacts (ghl_contact_id comme clé)
→ Si nouveau contact avec email : enrichissement LinkedIn (Unipile) → update Supabase
→ Si tag "chantier_en_cours" ajouté : créer agent_task pour Soren (suivi chantier)
→ Log agent_interactions
```

**Valeur métier :** Cohérence données. Les agents IA ont toujours une vue à jour. Pas de "contact introuvable".

---

### Automation 7 — Génération devis depuis photo chantier ⭐⭐

**Problème résolu :** L'artisan prend une photo du chantier avec son téléphone. Aujourd'hui il doit encore tout saisir manuellement.

**Flow :**
```
WhatsApp/Telegram photo → N8N Webhook Trigger (message.type === 'image')
→ Download image URL
→ Claude Vision (claude-3-5-sonnet) : analyse photo
  → Identification travaux visibles (type, ampleur estimée)
  → Estimation superficie si possible
  → Liste de prestations probables
→ Réponse Telegram/WhatsApp à l'artisan :
  "📸 J'ai analysé la photo. Travaux détectés : [liste]
   Pour créer le devis, confirme : client ? surface exacte ? matériaux souhaités ?"
→ Attente réponse → POST /api/webhooks/n8n/devis avec données complètes
```

**Prompt Claude Vision :**
```
Tu es un expert en bâtiment/rénovation. Analyse cette photo de chantier.
Identifie : type de travaux, ampleur estimée (petite/moyenne/grande), matériaux visibles, prestations nécessaires.
Réponds JSON : { type_travaux: string[], superficie_estimee: string, materiaux: string[], prestations: string[], notes: string }
```

**Valeur métier :** Zéro saisie pour l'artisan. Photo → devis en 3 minutes.

---

## Architecture N8N recommandée

### Infrastructure
- **Self-hosted N8N** sur VPS KVM2 (déjà en place, 7€/mois)
- URL N8N : `http://vps-ip:5678` (ou sous-domaine n8n.qorpoia.com)
- Credentials N8N : Supabase (service key), GHL API, Telegram Bot, Twilio, OpenAI (Whisper), Anthropic

### Sécurité webhooks
- Tous les webhooks N8N → Soren SaaS passent par header `X-N8N-Secret: [token]`
- Valider le header côté API route Next.js

### Variables d'environnement à ajouter dans Soren
```
N8N_WEBHOOK_SECRET=xxx
N8N_BASE_URL=https://n8n.qorpoia.com
```

### Ordre de déploiement recommandé
1. **Automation 4** (qualification leads) — impact immédiat sur ROI pub
2. **Automation 2** (relance devis) — récupération CA perdu
3. **Automation 1** (voice → devis) — différenciateur UX
4. **Automation 3** (rapport hebdo) — confort artisan
5. **Automation 6** (sync GHL/Supabase) — prérequis qualité données
6. **Automation 5** (nurturing) — monétisation leads froids
7. **Automation 7** (photo → devis) — innovation, déploiement progressif

---

## Tableau récapitulatif

| # | Automation | Impact | Complexité | Priorité |
|---|---|---|---|---|
| 4 | Qualification leads entrants | ⭐⭐⭐ | Moyenne | P0 |
| 2 | Relance devis automatique | ⭐⭐⭐ | Faible | P0 |
| 1 | Voice note → Devis | ⭐⭐⭐ | Haute | P1 |
| 3 | Rapport hebdo Telegram | ⭐⭐ | Faible | P1 |
| 6 | Sync GHL → Supabase | ⭐⭐ | Faible | P1 |
| 5 | Nurturing leads froids | ⭐⭐ | Moyenne | P2 |
| 7 | Photo chantier → Devis | ⭐⭐ | Haute | P2 |

---

## Prochaines étapes

1. **Valider cette liste** avec Thomas (priorités, ajouts éventuels)
2. **Écrire le plan d'implémentation** pour les automations P0 (4 + 2)
3. **Configurer N8N** sur VPS : installer, exposer avec nginx/reverse proxy, HTTPS
4. **Créer l'endpoint** `POST /api/webhooks/n8n/devis` côté Soren (décrit dans spec 2026-04-08)
5. **Déployer workflow par workflow** avec tests en staging avant prod
