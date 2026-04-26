# Operations Checklist — QOS Prod Pilotée

## 1. Démarrage standard

```powershell
# Terminal 1 — SaaS
cd C:\Users\thoma\qos
npm run dev

# Terminal 2 — N8N (avec toutes les vars)
$env:GOOGLE_CALENDAR_ID="thomas@qorpoia.com"
$env:GHL_API_KEY="pit-61ab7722-55e9-414b-8f03-b7eb2664ba1f"
$env:OPENAI_API_KEY="sk-..."
$env:ALERT_WEBHOOK_URL="https://hooks.slack.com/..."   # ou webhook.site pour test
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE="false"
n8n start

# Terminal 3 — Tunnel
ngrok http 3000
```

## 2. Smoke test go/no-go (< 2 min)

```powershell
# Health global
Invoke-RestMethod -Uri "http://localhost:3000/api/health" | ConvertTo-Json -Depth 5

# Booking calendrier (créneau libre)
Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:5678/webhook/emma-calendar-booking" -ContentType "application/json" -Body '{"trace_id":"smoke-01","contact_id":"3kCGXTpVDUebEZAWwF4X","name":"Smoke Test","phone":"+33600000000","requested_start":"2026-06-01T09:00:00Z","requested_end":"2026-06-01T10:00:00Z","timezone":"Europe/Paris"}'

# Bot admin Telegram — envoyer /start au bot Soren
# Bot client Telegram — envoyer /start au bot client
```

**Go si :**
- `/api/health` → `status: ok` ou `degraded` (pas `down`)
- booking → `status: confirmed` + `calendar_event_id` présent
- les deux bots Telegram répondent au `/start`

## 3. Vérifications pré-démo

| Check | Commande | Attendu |
|---|---|---|
| SaaS alive | `curl http://localhost:3000` | HTTP 200 |
| N8N alive | `curl http://localhost:5678` | HTTP 200 |
| Ngrok actif | `Invoke-RestMethod http://localhost:4040/api/tunnels` | tunnel présent |
| GHL contact demo | smoke-test.js | `ghl_contact: ok` |
| Webhooks Telegram | `/api/health` | `telegram_admin: ok` |

```powershell
# Smoke test complet (requiert SUPABASE_SERVICE_ROLE_KEY)
node scripts/smoke-test.js
```

## 4. Rollback rapide

### Supprimer les données démo GHL + Supabase
```javascript
// node -e "..."
const k = 'pit-61ab7722-55e9-414b-8f03-b7eb2664ba1f'
const b = 'https://services.leadconnectorhq.com'
const h = { 'Authorization': 'Bearer ' + k, 'Version': '2021-07-28' }
Promise.all([
  fetch(b+'/calendars/events/cQ8nInILdABMwfrxwytx', { method:'DELETE', headers:h }),
  fetch(b+'/opportunities/qFVSHydNcb0VypbCgria',    { method:'DELETE', headers:h }),
  fetch(b+'/contacts/3kCGXTpVDUebEZAWwF4X',         { method:'DELETE', headers:h }),
]).then(() => console.log('DEMO cleaned'))
```

```sql
-- Supabase
DELETE FROM devis WHERE id = 'dd399eb3-7c05-4e33-a905-f61c1a126643';
```

### Réinitialiser idempotency N8N
Dans N8N → Workflow `lucie-calendar-booking` → Settings → Clear Static Data

## 5. Incident playbook (5 min)

### Bot Telegram ne répond pas
1. `Invoke-RestMethod "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` → vérifier `last_error_message`
2. Si 404 : ngrok mort → relancer `ngrok http 3000` + réenregistrer webhook
3. Si 401 : token erroné dans `.env.local`
4. Redémarrer Next.js : Ctrl+C → `npm run dev`

### Booking calendrier échoue
1. Vérifier N8N en marche : `curl http://localhost:5678`
2. Ouvrir execution logs N8N → identifier nœud rouge
3. `ghl_sync: partial` → GHL_API_KEY invalide ou rate-limit → vérifier key
4. `calendar_create_failed` → Google OAuth expiré → réauthoriser credential dans N8N

### Import contacts bloqué (429)
- Réponse `burst_limit_exceeded` → découper en lots de ≤ 20 contacts
- Log `trace_id` présent dans la réponse pour traçabilité

### `ghl_sync: partial` persistant
1. Vérifier GHL_API_KEY dans N8N env : `$env:GHL_API_KEY`
2. Tester manuellement : `curl -H "Authorization: Bearer <KEY>" -H "Version: 2021-07-28" https://services.leadconnectorhq.com/contacts/<ID>/notes`
3. Si ALERT_WEBHOOK_URL configuré → alerte déjà envoyée, consulter Slack/webhook.site

## 6. Variables d'environnement — état prod

| Variable | Fichier | Requis | État |
|---|---|---|---|
| `GHL_API_KEY` | `.env.local` + N8N | ✅ | Configuré |
| `GOOGLE_CALENDAR_ID` | N8N env | ✅ | Configuré |
| `OPENAI_API_KEY` | N8N env | ✅ | Configuré |
| `TELEGRAM_BOT_TOKEN_ADMIN` | `.env.local` | ✅ | Configuré |
| `TELEGRAM_BOT_TOKEN_CLIENT` | `.env.local` | ✅ | Configuré |
| `ALERT_WEBHOOK_URL` | `.env.local` + N8N env | ⚠️ | À configurer |
| `N8N_WEBHOOK_BASE_URL` | `.env.local` | ⚠️ | localhost:5678 (dev) |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | N8N process env | ✅ | `false` requis |

## 7. Known limits (prod pilotée)

1. **Ngrok URL change** à chaque restart → réenregistrer les webhooks Telegram
2. **N8N idempotency** : stockée en mémoire — perdue si N8N redémarre. Un booking peut se répéter après restart N8N.
3. **GHL rate-limit** : max ~60 SMS/min, ~100 notes/min — non géré automatiquement
4. **ALERT_WEBHOOK_URL vide** : alertes silencieuses (continueOnFail) — booking toujours confirmé
5. **Google OAuth token** : expire si non utilisé >6 mois — réauthoriser dans N8N credentials
