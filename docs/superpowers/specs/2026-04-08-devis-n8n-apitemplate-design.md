# Devis IA — N8N + APITemplate.io + Soren Integration Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connecter le workflow N8N (voice note Telegram → Whisper → AI Agent → PDF) à Soren pour que chaque devis généré automatiquement soit visible dans le module Devis pour monitoring et suivi.

**Architecture:** N8N reste maître de la génération (transcription, IA, PDF via APITemplate.io). Après génération, N8N appelle un webhook Soren qui sauvegarde le devis dans Supabase. Soren sert uniquement au monitoring, au changement de statut et à l'envoi GHL.

**Tech Stack:** Next.js 14 App Router, Supabase, N8N, APITemplate.io, GHL

---

## Flux complet

```
Thomas (voice note Telegram)
    ↓
N8N Workflow
  ├── Telegram Trigger (Updated message)
  ├── Switch (audio vs texte)
  ├── Telegram (get file)
  ├── OpenAI Whisper (Transcribe Recording)
  ├── AI Agent (OpenRouter + Catalogue GSheets + Contacts GSheets + Calculator)
  ├── APITemplate.io → create-pdf (template_id = template créé dans leur éditeur)
  ├── Telegram → sendDocument à Thomas (PDF)
  └── HTTP Request → POST /api/webhooks/n8n/devis (Soren)
            ↓
       Supabase table devis (source='n8n', pdf_url, lignes, statut='brouillon')
            ↓
       Soren DevisView
         - Badge N8N violet
         - Lignes pré-remplies éditables
         - Bouton "Voir le PDF" (→ pdf_url)
         - Bouton "Envoyer via GHL"
         - Notification dans le clocheton
```

---

## Section 1 — APITemplate.io Template

Thomas crée manuellement un template dans l'éditeur visuel APITemplate.io (app.apitemplate.io).

**Variables à définir dans le template :**

| Variable | Type | Exemple |
|---|---|---|
| `contact_name` | text | Jean Dupont |
| `contact_email` | text | jean@exemple.fr |
| `contact_phone` | text | +33 6 12 34 56 78 |
| `titre` | text | Rénovation salle de bain |
| `reference` | text | DEV-2026-001 |
| `date` | text | 08/04/2026 |
| `total_ht` | text | 2 500,00 € |
| `total_tva` | text | 250,00 € |
| `total_ttc` | text | 2 750,00 € |
| `notes` | text | Conditions de paiement… |
| `ligne_N_description` | text | Dépose carrelage (N=1..15) |
| `ligne_N_quantite` | text | 1 |
| `ligne_N_prix_ht` | text | 800,00 € |
| `ligne_N_total_ht` | text | 800,00 € |

> **Note implementation :** APITemplate supporte les composants répétables. Utiliser la feature "Dynamic Table" si disponible sur le plan, sinon 15 lignes statiques masquées si vides.

Une fois le template créé : récupérer le `template_id` depuis leur dashboard → stocker dans `.env.local` en tant que `APITEMPLATE_TEMPLATE_ID`.

---

## Section 2 — Endpoint Webhook Soren

### `POST /api/webhooks/n8n/devis`

**Sécurité :** header `x-webhook-secret` vérifié contre `N8N_WEBHOOK_SECRET` en env var.

**Payload attendu de N8N :**

```json
{
  "contact_name":  "Jean Dupont",
  "contact_email": "jean@exemple.fr",
  "contact_phone": "+33 6 12 34 56 78",
  "contact_id":    "ghl_contact_id_optionnel",
  "conversation_id": "ghl_conv_id_optionnel",
  "titre":         "Rénovation salle de bain",
  "notes":         "Texte libre issu de la transcription vocale",
  "lignes": [
    { "description": "Dépose carrelage", "quantite": 1, "prixUnitaire": 800, "tvaRate": 10 },
    { "description": "Pose faïence",     "quantite": 12, "prixUnitaire": 45, "tvaRate": 10 }
  ],
  "pdf_url":  "https://apitemplate.io/generated/xxx.pdf",
  "source":   "n8n"
}
```

**Réponse succès :**
```json
{ "ok": true, "devis_id": "uuid", "url": "https://soren.app/devis" }
```

**Logique serveur :**
1. Vérifier `x-webhook-secret`
2. Calculer `montant_ht` depuis les lignes
3. Insérer dans `devis` avec `source='n8n'`, `statut='brouillon'`, `pdf_url`
4. Insérer une entrée dans `agent_logs` (type='devis_genere', metadata={contact_name, montant_ht})
5. Retourner `{ ok: true, devis_id }`

---

## Section 3 — Migration Supabase

```sql
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS source  TEXT NOT NULL DEFAULT 'manuel';
```

---

## Section 4 — Mise à jour DevisView

### Liste (DevisList)
- Nouvelle colonne "Source" : badge `N8N` violet (`bg-purple-100 text-purple-700`) si `source === 'n8n'`, sinon rien
- Colonne "PDF" : icône lien si `pdf_url` présent

### Détail (DetailPanel)
- Si `pdf_url` présent : bouton **"Voir le PDF"** (ouvre dans nouvel onglet) remplace le bouton "Générer PDF"
- Si `pdf_url` absent : bouton "Générer PDF" comme actuellement
- Les lignes pré-remplies restent éditables (Thomas peut ajuster avant envoi)
- Statut initial `brouillon` → flux GHL d'envoi inchangé

### Type Devis mis à jour
```ts
type Devis = {
  // ... champs existants
  pdf_url: string | null
  source:  'manuel' | 'n8n'
}
```

---

## Section 5 — N8N : nœud HTTP Request

Ajouter après le nœud APITemplate.io dans le workflow existant :

**Nœud : HTTP Request**
- Method: `POST`
- URL: `https://[votre-domaine]/api/webhooks/n8n/devis`
- Headers: `x-webhook-secret: {{ $env.SOREN_WEBHOOK_SECRET }}`
- Body (JSON) :
```json
{
  "contact_name":  "{{ $json.contact_name }}",
  "contact_email": "{{ $json.contact_email }}",
  "contact_phone": "{{ $json.contact_phone }}",
  "titre":         "{{ $json.titre }}",
  "notes":         "{{ $json.transcription }}",
  "lignes":        "{{ $json.lignes }}",
  "pdf_url":       "{{ $json.download_url }}",
  "source":        "n8n"
}
```

---

## Variables d'environnement à ajouter

```bash
# .env.local Soren
N8N_WEBHOOK_SECRET=<secret_partage_avec_n8n>
APITEMPLATE_TEMPLATE_ID=<id_du_template_apitemplate>

# N8N (env vars du workflow)
SOREN_WEBHOOK_SECRET=<meme_secret>
```

---

## Ce qui ne change pas

- Création manuelle de devis dans Soren (DevisView CreatePanel)
- Génération PDF HTML actuelle pour devis manuels sans template
- Envoi GHL (WhatsApp/SMS/Email) depuis Soren
- Table devis Supabase (juste 2 colonnes ajoutées)
