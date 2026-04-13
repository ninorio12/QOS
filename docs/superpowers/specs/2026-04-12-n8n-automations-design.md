# N8N Automations — Design Spec
**Date:** 2026-04-12  
**Statut:** Révisé — frontière GHL/N8N clarifiée

## Principe de base — Quand utiliser N8N vs GHL

**GHL gère déjà nativement :**
- Séquences SMS/email avec délais (J+0, J+3, J+7…)
- Triggers sur événements contact (tag ajouté, pipeline stage changé, lead entrant)
- Routage conditionnel par tag (hot/warm/cold)
- Envoi de messages multi-canal (SMS, email, WhatsApp, voicemail)
- Workflows de nurturing complets

**N8N intervient uniquement pour :**
- Appels Claude API (scoring, transcription, vision, génération)
- Requêtes/écritures Supabase
- Messages Telegram Bot
- Traitements IA multi-étapes
- Orchestration inter-systèmes sans native integration (Whisper, APITemplate.io)

**Règle :** Si GHL peut le faire seul → GHL. N8N uniquement quand il y a une brique IA ou Supabase qui ne rentre pas dans GHL.

---

## Contexte technique

- 3 agents IA : Soren (COO/analyste), Kai (CSM/qualificateur), Mia (KB/docs)
- 6 endpoints webhook actifs (GHL, Cal.com, Twilio WhatsApp, Meta, Telegram, Google Calendar)
- Supabase : tables conversations, messages, contacts, leads, devis, devis_relances, agent_tasks, agent_interactions, agent_memory
- Services externes : GHL CRM, APITemplate.io (PDF), Twilio/WhatsApp, Telegram, Claude API

---

## Les 5 automations N8N (uniquement ce que GHL ne peut pas faire)

### Automation 1 — Voice Note → Devis automatique ⭐⭐⭐

**Pourquoi N8N et pas GHL :** GHL ne sait pas transcrire un audio ni appeler Claude pour extraire des données structurées ni générer un PDF via APITemplate.io.

**Problème résolu :** Un artisan en chantier envoie un vocal sur WhatsApp/Telegram qui décrit le chantier. Aujourd'hui rien ne se passe.

**Flow :**
```
WhatsApp/Telegram audio → N8N Webhook Trigger (message.type === 'audio')
→ Téléchargement fichier audio (Twilio Media URL / Telegram File API)
→ Transcription Whisper (OpenAI Audio API)
→ Claude Sonnet : extraction structurée
  → { client_name, client_address, travaux: [{description, quantite, prix_unitaire}], conditions_paiement, delai_realisation }
→ POST /api/webhooks/n8n/devis (endpoint Soren — spec 2026-04-08)
→ APITemplate.io génère le PDF
→ PDF stocké Supabase + URL envoyé en SMS via GHL
→ Notification Telegram à l'artisan : "Devis créé ✓ [lien preview]"
```

**Prompt Claude extraction :**
```
Tu reçois la transcription d'un message vocal d'un artisan qui dicte un devis.
Extrais en JSON : { client_name, client_address, travaux: [{description, quantite, prix_unitaire}], conditions_paiement, delai_realisation }
Si une info manque, laisse le champ vide. Ne hallucine pas de montants.
```

**Tables Supabase :** `devis` (création), `devis_relances` (init)

**Valeur métier :** Devis créé en 2min depuis chantier, sans ouvrir l'app.

---

### Automation 2 — Relance devis : enrichissement IA + alerte artisan ⭐⭐⭐

**Pourquoi N8N et pas GHL :** GHL ne peut pas requêter Supabase pour identifier les devis sans réponse, ni générer un message personnalisé via Claude, ni envoyer une alerte Telegram.

**Ce que GHL fait déjà :** Les séquences de relance SMS/email standard après envoi d'un devis peuvent être gérées dans GHL workflows. Ne pas les dupliquer ici.

**Ce que N8N ajoute :**
```
Cron N8N : tous les jours à 9h00
→ Supabase query : SELECT * FROM devis WHERE status = 'sent' 
    AND sent_at < NOW() - INTERVAL '5 days' 
    AND relance_count >= 2  (GHL a déjà fait les relances auto)
    AND signed_at IS NULL
→ Pour chaque devis sans réponse malgré relances GHL :
  → Claude Sonnet : génère message de relance personnalisé (contexte client + travaux + montant)
  → Notification Telegram à l'artisan :
    "⚠️ [Client] n'a pas répondu à 2 relances auto.
     Devis [montant]€ — [travaux].
     Appel manuel recommandé aujourd'hui."
  → Update Supabase devis_relances (relance_count, last_relance_at)
```

**Ce que N8N NE fait PAS ici :** Envoyer les SMS/emails de relance (GHL s'en charge).

**Valeur métier :** L'artisan est alerté uniquement sur les cas vraiment bloquants, avec contexte pour rappeler.

---

### Automation 3 — Rapport hebdomadaire business → Telegram ⭐⭐

**Pourquoi N8N et pas GHL :** GHL ne peut pas requêter Supabase, appeler Claude pour synthétiser, ni envoyer un message Telegram.

**Flow :**
```
Cron N8N : lundi 07h30
→ Supabase queries parallèles :
  → Devis : créés / envoyés / signés S-1 + CA signé + delta vs S-2
  → Leads : nouveaux / qualifiés / perdus
  → Conversations : volume messages IA vs humain
→ Claude Sonnet : génère rapport narratif avec recommandations concrètes
→ Telegram message à l'artisan
```

**Format rapport Telegram :**
```
📊 *Rapport semaine du [date]*

💰 *Devis*
• 8 créés · 6 envoyés · 2 signés
• CA signé : 12 400€ (+18% vs semaine dernière)

🎯 *Pipeline*
• 14 leads actifs · 3 qualifiés chauds

⚡ *Actions recommandées*
1. Relancer les 3 devis à J+5 sans réponse
2. Rappeler Sophie Bernard — budget confirmé 8k€
```

**Valeur métier :** Visibilité hebdomadaire sans ouvrir le dashboard.

---

### Automation 4 — Scoring IA des leads entrants + alerte Telegram ⭐⭐⭐

**Pourquoi N8N et pas GHL :** GHL ne peut pas appeler Claude pour scorer un lead, ni envoyer une alerte Telegram. En revanche, GHL gère déjà les séquences de nurturing post-tagging.

**Ce que GHL fait déjà :** Les séquences SMS/email déclenchées par tag hot/warm/cold, le routage pipeline, les workflows de suivi.

**Ce que N8N ajoute :**
```
Trigger : webhook GHL "contact.created" + form_data Meta lead
→ Claude Sonnet : scoring lead 1-10
  → Input : prénom, travaux mentionnés, budget mentionné, urgence, zone géo, nom de la publicité
  → Output JSON : { score, budget_estime, urgence, type_travaux, raison }
→ Selon score :
  → ≥ 7 : ajouter tag "hot" dans GHL (GHL prend le relais avec sa séquence hot)
           + Telegram artisan : "🔥 Lead chaud : [nom] — [travaux] ~[budget]€ (score [X]/10)"
  → 4-6 : ajouter tag "warm" dans GHL (GHL séquence warm)
  → < 4  : ajouter tag "cold" dans GHL (GHL séquence cold ou rien)
→ Log Supabase leads (score + raison)
```

**Ce que N8N NE fait PAS ici :** Les SMS/emails de nurturing (GHL s'en charge post-tag).

**Valeur métier :** L'artisan rappelle les chauds en premier. GHL fait le reste automatiquement.

---

### Automation 5 — Photo chantier → Devis ⭐⭐

**Pourquoi N8N et pas GHL :** GHL ne peut pas analyser une image avec Claude Vision.

**Flow :**
```
WhatsApp/Telegram photo → N8N Webhook Trigger (message.type === 'image')
→ Download image
→ Claude Vision (claude-sonnet-4-6) : analyse photo chantier
  → type_travaux[], superficie_estimee, materiaux[], prestations[], notes
→ Réponse Telegram/WhatsApp à l'artisan :
  "📸 Travaux détectés : [liste]
   Pour créer le devis, confirme :
   → Nom du client ?
   → Surface exacte ?
   → Matériaux souhaités ?"
→ Attente réponse vocale ou texte → Automation 1 (voice→devis) ou saisie manuelle
```

**Valeur métier :** Zéro saisie depuis le chantier. Photo → devis en 3 minutes.

---

### Automation 6 — Demande d'avis Google après chantier ⭐⭐⭐

**Pourquoi N8N et pas GHL :** GHL peut envoyer un SMS générique, mais ne sait pas détecter intelligemment la fin de chantier (depuis Supabase), ni personnaliser le message avec les travaux spécifiques réalisés via Claude.

**Problème résolu :** Les artisans oublient de demander un avis Google. Pourtant c'est leur principal levier de réputation locale. Un bon timing + message personnalisé multiplie le taux de réponse.

**Flow :**
```
Trigger : webhook GHL "opportunity.won" (ou tag "chantier_terminé" ajouté)
→ N8N reçoit : contact_id, opportunity_name, montant, date
→ Supabase query : récupérer le devis associé (travaux réalisés, client_name)
→ Attente 2 jours (délai post-chantier — client a le temps de voir le résultat)
→ Claude Sonnet : génère SMS personnalisé
  → Mentionne les travaux exacts ("votre cuisine rénovée", "votre salle de bain")
  → Ton chaleureux, pas agressif, une seule demande
  → Inclut le lien Google Review de l'artisan
→ GHL sendSMS au contact client
→ Si pas de clic sur le lien après 5 jours :
  → 1 seul SMS de rappel (GHL workflow ou N8N selon préférence)
→ Log Supabase agent_interactions (tracking taux de conversion)
```

**Prompt Claude :**
```
Tu rédiges un SMS de demande d'avis Google pour un artisan bâtiment.
Travaux réalisés : [travaux]. Client : [prénom]. Artisan : [nom_entreprise].
Le SMS doit : remercier chaleureusement, mentionner les travaux spécifiques, 
demander un avis Google de façon naturelle (pas insistante), inclure [LIEN].
Max 160 caractères. Ton : humain, sincère, jamais robotique.
```

**Exemple de SMS généré :**
```
Bonjour Marie, merci pour votre confiance pour la rénovation de votre cuisine ! 
Si vous êtes satisfaite, un avis Google nous aiderait beaucoup 🙏 → [lien]
— Équipe Dupont Rénovation
```

**Prérequis :** Lien Google Review de l'artisan à stocker dans les settings Supabase.

**Valeur métier :** +4-5 avis Google/mois en automatique. Référencement local et crédibilité = source #1 de leads organiques pour artisans.

---

## Ce que GHL gère seul (ne pas dupliquer dans N8N)

| Workflow | Où ça vit |
|---|---|
| Séquence nurturing leads froids J+0/J+3/J+7/J+14/J+30 | GHL Automation |
| SMS de bienvenue lead entrant | GHL Automation |
| Relance automatique devis J+3 / J+7 | GHL Automation |
| Notification interne pipeline stage changé | GHL Automation |
| Rappel RDV 24h avant | GHL Automation |
| Routage lead par tag hot/warm/cold | GHL Automation |

---

## Architecture N8N

### Infrastructure
- Self-hosted N8N sur VPS KVM2 (déjà en place, 7€/mois)
- Sous-domaine recommandé : `n8n.qorpoia.com`
- Credentials à configurer : Supabase (service key), GHL API, Telegram Bot, OpenAI (Whisper), Anthropic Claude

### Sécurité
- Header `X-N8N-Secret` sur tous les appels N8N → Soren
- Valider côté Next.js API routes

### Ordre de déploiement
1. **Automation 4** (scoring leads) — impact ROI pub immédiat, GHL fait le reste
2. **Automation 6** (avis Google) — impact réputation immédiat, simple à déployer
3. **Automation 2** (alerte devis bloqués) — récupération CA
4. **Automation 1** (voice → devis) — différenciateur UX fort
5. **Automation 3** (rapport hebdo) — visibilité sans effort
6. **Automation 5** (photo → devis) — innovation progressive

---

## Tableau récapitulatif

| # | Automation | Ce que N8N apporte | GHL impliqué ? | Priorité |
|---|---|---|---|---|
| 4 | Scoring leads IA + alerte Telegram | Claude scoring + Telegram | Oui (séquences post-tag) | P0 |
| 6 | Demande avis Google post-chantier | Claude SMS perso + timing Supabase | Oui (envoi SMS) | P0 |
| 2 | Alerte devis bloqués | Supabase query + Telegram | Oui (relances auto) | P0 |
| 1 | Voice note → Devis | Whisper + Claude + APITemplate | Non | P1 |
| 3 | Rapport hebdo Telegram | Supabase + Claude + Telegram | Non | P1 |
| 5 | Photo chantier → Devis | Claude Vision | Non | P2 |
