# Lucie — N8N Calendar Booking

## Workflow: `elevenlabs-google-calendar` (réceptionniste vocale)

Fichier versionné : `workflows/elevenlabs-google-calendar.json`

### Variables d'env N8N requises
- `OPENAI_API_KEY` — clé API OpenAI (utilisée par le nœud "OpenAI — Extraire plage (prochains)")
- `GOOGLE_CALENDAR_ID` — ID du calendrier Google (utilisé dans emma-calendar-booking)
- `GHL_API_KEY` — clé API GHL (utilisée dans emma-calendar-booking step 3)

### Bugs corrigés (hotfix 2026-04-16)
| Bug | Nœud | Fix |
|---|---|---|
| `search_to_iso` absent → fenêtre +1h au lieu de +7j | Parser resultat — Prochains creneaux | Check avant `parisToUTC`, default +7j explicite |
| `JSON.stringify()` dans responseBody → string encodée | Tous les nœuds Respond | Supprimé — objet JSON direct `={{ {...} }}` |
| Clé OpenAI hardcodée `Bearer VOTRE_CLE_OPENAI` | OpenAI — Extraire plage (prochains) | `={{ 'Bearer ' + $env.OPENAI_API_KEY }}` |
| `create_event` échoue si `pendingSlot` absent | Preparer creation evenement | Fallback `params.start`/`params.end` avant erreur |

---

## Workflow: `emma-calendar-booking`

Fichier versionné : `workflows/emma-calendar-booking.json`

### Import dans N8N
1. N8N → Workflows → Import from file
2. Sélectionner `workflows/emma-calendar-booking.json`
3. Activer le workflow (toggle ON)
4. Copier l'URL du Webhook depuis le nœud "Webhook"

### Webhook URL (prod)
```
POST https://<n8n-host>/webhook/emma-calendar-booking
```

### Payload entrant
```json
{
  "trace_id":        "abc123",
  "contact_id":      "GHL_CONTACT_ID",
  "name":            "Prénom Nom",
  "phone":           "+33600000000",
  "email":           "contact@example.com",
  "requested_start": "2026-04-17T10:00:00Z",
  "requested_end":   "2026-04-17T11:00:00Z",
  "timezone":        "Europe/Paris"
}
```

### Réponses standardisées
| Cas | HTTP | Body |
|---|---|---|
| Nouveau RDV | 202 | `{"status":"queued","trace_id":"...","idempotency_key":"..."}` |
| Doublon (déjà traité) | 200 | `{"status":"noop","trace_id":"...","idempotency_key":"..."}` |
| Payload invalide | 400 | `{"status":"error","trace_id":"...","message":"..."}` |

### Idempotency
- Clé = `contact_id::requested_start`
- Stockée dans `$getWorkflowStaticData('global')` (persiste entre exécutions)
- TTL 7 jours (nettoyage automatique à chaque appel)

---

## Réponses step 2 (booked / conflict)

| Cas | HTTP | Body |
|---|---|---|
| Créneau libre → RDV créé | 200 | `{"status":"booked","trace_id":"...","idempotency_key":"...","calendar_event_id":"...","calendar_event_link":"...","start":"...","end":"..."}` |
| Créneau occupé | 409 | `{"status":"conflict","trace_id":"...","idempotency_key":"...","message":"...","alternatives":[{"start":"...","end":"..."},{"start":"...","end":"..."}]}` |

### Alternatives (conflict)
- Alternative 1 : `requested_start + 1h` (même durée)
- Alternative 2 : `requested_start + 2h` (même durée)

---

## Roadmap étapes

| Step | Status | Description |
|---|---|---|
| 1/3 | ✅ Done | Skeleton + webhook + idempotency |
| 2/3 | ✅ Done | FreeBusy check + create event + conflict alternatives |
| 3/3 | ✅ Done | GHL note + SMS confirmation + internal log |
| Hardening | ✅ Done | WhatsApp fallback + alerting + prod checklist |

### Hardening — nœuds ajoutés (post step 3)

| Nœud | Position | Rôle |
|---|---|---|
| `SMS réussi?` (IF) | [2960, 360] | Branche si SMS GHL échoue |
| `GHL WhatsApp Fallback` (HTTP) | [3180, 480] | Retente via WhatsApp si SMS fail — `continueOnFail` |
| `Alert nécessaire?` (IF) | [3620, 360] | Déclenche alerte si `_alert_needed: true` |
| `Alert Webhook` (HTTP) | [3840, 240] | POST vers `$env.ALERT_WEBHOOK_URL` — `continueOnFail` |

Voir `docs/lucie-prod-checklist.md` pour le setup complet.

---

## Setup Google OAuth2 (requis pour step 2)

### 1. Créer credential N8N
1. N8N → Settings → Credentials → New → **Google Calendar OAuth2 API**
2. Copier le **Client ID** et **Client Secret** depuis Google Cloud Console
3. Scopes requis : `https://www.googleapis.com/auth/calendar.events`
4. Autoriser avec le compte `thomas@qorpoia.com`

### 2. Variable d'environnement N8N
```
GOOGLE_CALENDAR_ID=thomas@qorpoia.com
```
(ou l'ID exact du calendrier dans Google Calendar → Paramètres calendrier → ID du calendrier)

### 3. Lier le credential dans le workflow
Après import du JSON :
- Ouvrir le nœud **FreeBusy Check** → Credentials → sélectionner "Google Calendar — Thomas"
- Ouvrir le nœud **Create Calendar Event** → idem

---

## Step 3 — à implémenter (GHL sync + confirmation)
1. **HTTP Request** — `POST /calendars/events/appointments` GHL (Version: 2021-04-15)
2. **Supabase** — insert dans `calendar_event_links` (ghl_appointment_id, google_event_id, contact_id, trace_id)
3. **HTTP Request** — SMS/WhatsApp via GHL conversation (confirmation Lucie → contact)
4. **Respond** — `{status:"confirmed", ghl_appointment_id:...}`

### Variables d'env N8N requises (step 3)
- `GHL_API_KEY` — clé API GHL (Settings → API Keys)

### Réponse finale (status: confirmed)
```json
{
  "status": "confirmed",
  "trace_id": "abc123",
  "idempotency_key": "GHL_CONTACT_ID::2026-04-17T10:00:00Z",
  "calendar_event_id": "google_event_id",
  "calendar_event_link": "https://www.google.com/calendar/event?eid=...",
  "start": "2026-04-17T10:00:00+02:00",
  "end": "2026-04-17T11:00:00+02:00",
  "ghl_sync": "done"
}
```

### Comportement GHL (continueOnFail: true)
- Si GHL API down → le flow continue, `ghl_sync: "partial"` dans la réponse
- Le webhook répond toujours 200 (booking confirmé côté calendrier)
- Les erreurs GHL sont visibles dans les N8N execution logs
