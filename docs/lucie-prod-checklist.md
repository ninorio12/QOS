# Lucie — Production Checklist

## Variables d'environnement N8N requises

| Variable | Requis | Usage |
|---|---|---|
| `GOOGLE_CALENDAR_ID` | ✅ Obligatoire | ID calendrier FreeBusy + Create Event |
| `GHL_API_KEY` | ✅ Obligatoire | Note contact + SMS confirmation |
| `OPENAI_API_KEY` | ✅ Obligatoire (elevenlabs workflow) | Extraction plage horaire vocale |
| `ALERT_WEBHOOK_URL` | ⚠️ Recommandé | Alertes internes si GHL down |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | `false` | Débloque `$env.*` dans Code nodes |

### Démarrage N8N avec toutes les vars
```powershell
$env:GOOGLE_CALENDAR_ID="thomas@qorpoia.com"
$env:GHL_API_KEY="pit-XXXX"
$env:OPENAI_API_KEY="sk-XXXX"
$env:ALERT_WEBHOOK_URL="https://hooks.slack.com/..."   # ou webhook Make/N8N
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE="false"
n8n start
```

---

## Import workflow

1. N8N → Workflows → Import from file
2. Sélectionner `workflows/emma-calendar-booking.json`
3. Ouvrir **FreeBusy Check** → Credentials → "Google Calendar — Thomas"
4. Ouvrir **Create Calendar Event** → Credentials → idem
5. Activer le workflow (toggle ON)

---

## Architecture de fallback

```
GHL Send Confirmation (SMS)
        │
        ▼
   SMS réussi? ──── true ──────────────────────┐
        │ false                                 │
        ▼                                       │
GHL WhatsApp Fallback (continueOnFail)          │
        │                                       │
        └───────────────► Internal Log ◄────────┘
                                │
                                ▼
                        Alert nécessaire?
                         │          │
                      true        false
                         │          │
                    Alert Webhook   │
                         │          │
                         └──► Respond Booked
```

**Garanties :**
- Booking calendrier toujours confirmé, même si GHL est down
- SMS échoue → tentative WhatsApp automatique
- GHL totalement down → `ghl_sync: "partial"` dans la réponse, alerte envoyée
- `ALERT_WEBHOOK_URL` absent → alerte silencieuse (continueOnFail), flow non bloqué

---

## Réponses API

| Cas | HTTP | `ghl_sync` |
|---|---|---|
| Tout OK | 200 | `done` |
| SMS ok, note GHL fail | 200 | `partial` + alerte |
| SMS fail → WhatsApp ok, note ok | 200 | `done` |
| SMS fail → WhatsApp fail | 200 | `partial` + alerte |
| Conflit calendrier | 409 | N/A — alternatives proposées |
| Payload invalide | 400 | N/A |
| Doublon idempotency | 200 | `status: noop` |

---

## Tests de validation

### 1. Smoke test — créneau libre
```bash
curl -s -X POST https://<n8n-host>/webhook/emma-calendar-booking \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "test-001",
    "contact_id": "3kCGXTpVDUebEZAWwF4X",
    "name": "Test Lucie",
    "phone": "+33600000000",
    "email": "test@qorpoia.com",
    "requested_start": "2026-05-10T09:00:00Z",
    "requested_end": "2026-05-10T10:00:00Z",
    "timezone": "Europe/Paris"
  }'
```
Attendu : `{ "status": "confirmed", "ghl_sync": "done" | "partial", "calendar_event_id": "..." }`

### 2. Test conflit
Relancer avec le même créneau → `{ "status": "conflict", "alternatives": [...] }`

### 3. Test idempotency
Relancer exactement la même requête → `{ "status": "noop" }`

### 4. Test fallback WhatsApp
Couper GHL (clé invalide) → SMS fail → WhatsApp tentée → `ghl_sync: "partial"` + alerte si ALERT_WEBHOOK_URL configuré

---

## Rate limits GHL

| Endpoint | Limite | Notes |
|---|---|---|
| `POST /contacts/{id}/notes` | ~100 req/min par location | Non bloquant en démo (1 note/booking) |
| `POST /conversations/messages` | ~60 req/min par location | SMS + WhatsApp = 2 tentatives max |

En cas de 429 : N8N log l'erreur, `ghl_sync: "partial"`, alerte déclenchée si ALERT_WEBHOOK_URL set.

---

## Monitoring N8N

- **Executions** : N8N → Executions (onglet) — voir chaque run, inputs/outputs par nœud
- **Erreurs GHL** : filtre sur `ghl_sync: "partial"` dans les execution logs
- **Internal Log** : visible dans l'output du nœud "Internal Log" à chaque exécution

---

## Checklist go-live

- [ ] `GOOGLE_CALENDAR_ID` configuré et testé (FreeBusy renvoie des résultats)
- [ ] `GHL_API_KEY` valide (`Bearer pit-XXXX`) — vérifié sur `/contacts/{id}/notes`
- [ ] `ALERT_WEBHOOK_URL` configuré (Slack, Make, ou webhook N8N dédié)
- [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` dans l'env de démarrage
- [ ] Google OAuth2 credential lié sur FreeBusy Check + Create Calendar Event
- [ ] Workflow importé, activé, webhook URL notée
- [ ] Smoke test "créneau libre" : status confirmed + event visible dans Google Calendar
- [ ] Smoke test "conflit" : status 409 + alternatives présentes
- [ ] Smoke test "idempotency" : status noop sur doublon
- [ ] `ghl_sync` vérifié : "done" si GHL_API_KEY valide, "partial" + alerte si non
