# Runbook — Demo Day QOS

## 1. Démarrage

```bash
cd C:\Users\thoma\qos
npm run dev          # SaaS sur :3000
node relay.js        # Bridge Hermes ↔ QOS (terminal séparé)
```

Vérifier ngrok actif :
```bash
curl http://localhost:4040/api/tunnels
```

## 2. Vérifications pré-démo

```bash
# Health check admin
curl "http://localhost:3000/api/admin?secret=hermes-qos-ec4888da90d34e9b"
```

Tous les champs `ok: true` + `go_no_go: "go"` requis avant de démarrer.

```bash
# Smoke test GHL
curl -H "Authorization: Bearer pit-61ab7722-55e9-414b-8f03-b7eb2664ba1f" \
     -H "Version: 2021-07-28" \
     https://services.leadconnectorhq.com/contacts/3kCGXTpVDUebEZAWwF4X
```

## 3. Flux démo complet

| Step | Action | Vérification |
|---|---|---|
| 1 | Lead entrant → contact `3kCGXTpVDUebEZAWwF4X` | Tags `demo`, `demo_2026-04-16` présents |
| 2 | SMS qualification envoyé (SLA < 2 min) | `message_id: lGI8kRjcliFXag8eWBZW` dans GHL |
| 3 | RDV créé → `cQ8nInILdABMwfrxwytx` | status: booked, 2026-04-17 10h |
| 4 | Devis en brouillon → `dd399eb3` | `human_validation_required: true` |
| 5 | Validation humaine → changer statut en `envoyé` | Manuellement dans le SaaS |

## 4. Règles métier actives

Fichier : `src/lib/agent-config.ts` — `BUSINESS_RULES`

| Règle | Valeur |
|---|---|
| SLA premier contact | 2 min |
| Canal initial | SMS |
| Appels sortants | Lucie uniquement |
| Relance no-show | +24h |
| Envoi devis | Validation humaine obligatoire |

## 5. Rollback / Cleanup

```bash
node -e "
const k='pit-61ab7722-55e9-414b-8f03-b7eb2664ba1f';
const b='https://services.leadconnectorhq.com';
const h={'Authorization':'Bearer '+k,'Version':'2021-07-28'};
Promise.all([
  fetch(b+'/calendars/events/cQ8nInILdABMwfrxwytx',{method:'DELETE',headers:h}),
  fetch(b+'/opportunities/qFVSHydNcb0VypbCgria',{method:'DELETE',headers:h}),
  fetch(b+'/contacts/3kCGXTpVDUebEZAWwF4X',{method:'DELETE',headers:h}),
]).then(()=>console.log('DEMO cleaned up'))
"
```

Supprimer le devis demo dans Supabase :
```sql
DELETE FROM devis WHERE id = 'dd399eb3-7c05-4e33-a905-f61c1a126643';
```

## 6. Known Limits (démo)

1. **Admin endpoint `/api/admin`** : retourne 404 si le dev server n'a pas été redémarré après la création du fichier route. Fix : `npm run dev` restart.
2. **Kai gateway** : fire-and-forget avec 1 retry (500ms backoff). Si gateway offline, le lead est quand même enregistré — Kai doit être relancé manuellement.
3. **Statut `pending_human_validation`** : stocké dans `notes` (workaround). La migration SQL pour l'ajouter au CHECK constraint n'est pas encore appliquée.
4. **Relay Hermes** (`node relay.js`) : doit tourner en terminal séparé. Si coupé, les réponses Hermes ne sont pas relayées.
5. **Import contacts** : parallélisé mais rate-limit GHL non géré — ne pas importer >20 contacts d'un coup en démo.

## 7. TODO technique post-démo

### Migration SQL : statut natif `pending_human_validation`

```sql
-- Étendre le check constraint devis
ALTER TABLE devis DROP CONSTRAINT devis_statut_check;
ALTER TABLE devis ADD CONSTRAINT devis_statut_check
  CHECK (statut IN ('brouillon','envoyé','accepté','refusé','pending_human_validation'));
```

À appliquer via : `npx supabase db push` depuis `C:\Users\thoma\qos`
