# Design — Flow Acquisition Client Complet
**Date :** 2026-04-15  
**Scope :** Formulaire public → GHL → Kai WhatsApp → Qualification → RDV Calendrier

---

## Contexte

Pendant les démos Soren, Thomas crée une fausse pub Canva avec un lien vers un formulaire
public hébergé dans Soren. Le prospect remplit le formulaire, un contact apparaît
immédiatement dans le pipeline Acquisition, et Kai envoie un WhatsApp de prise de contact
en moins de 60 secondes. La conversation se poursuit jusqu'à un RDV booké dans le calendrier.

Objectif : **démontrer le flow complet en temps réel devant le client.**

---

## Flow global

```
Pub Canva → lien /formulaire (public, sans auth)
    ↓ formulaire rempli
POST /api/leads/capture
    ├── Crée contact dans GHL
    ├── Crée opportunité GHL pipeline ACQUISITION
    ├── Sync contact Supabase
    ├── Trigger Kai (gateway HTTP)
    └── Redirect → page succès /formulaire/merci

Kai (gateway VPS) < 60s
    └── WhatsApp via GHL : message personnalisé Claude

Prospect répond WhatsApp
    ↓ webhook GHL InboundMessage → /api/webhooks/ghl
Kai poursuit conversation
    ├── Qualification (budget, projet, délai, zone)
    ├── Score > 70 → propose créneaux RDV
    ├── ghl_get_available_slots() → créneaux libres GHL Calendar
    ├── Prospect confirme → ghl_book_appointment()
    └── WhatsApp confirmation RDV

RDV visible dans
    ├── Soren /calendrier ✅
    ├── GHL Calendar ✅
    └── Soren /pipeline (stage mis à jour) ✅
```

---

## Composant 1 — Page formulaire public `/formulaire`

### Route
`src/app/formulaire/page.tsx` — **pas de layout dashboard**, pas d'auth Supabase.

### Design
- Fond `#EEF0EB`, card blanche `rounded-3xl` centrée (max-w-md)
- Logo Soren + tagline entreprise (lu depuis `company_settings` Supabase si disponible, sinon fallback générique)
- Titre : "Demandez votre devis gratuit"
- Champs : Prénom, Nom, Téléphone, Email
- Bouton `#111` avec texte blanc "Envoyer ma demande"
- Spinner inline pendant la soumission
- Redirect vers `/formulaire/merci` après succès

### Page succès `/formulaire/merci`
- Message confirmation : "Merci [Prénom] ! Vous allez recevoir un message WhatsApp dans les prochaines secondes."
- Pas de lien vers le dashboard (public)

### Sécurité
- Route publique, pas de session requise
- Rate limiting : max 5 soumissions par IP par heure (via header check simple)
- Validation : téléphone obligatoire (format E.164 ou FR), email optionnel

---

## Composant 2 — API publique `POST /api/leads/capture`

### Route
`src/app/api/leads/capture/route.ts` — **sans middleware auth**

### Payload entrant
```typescript
{
  firstName: string   // requis
  lastName:  string   // requis
  phone:     string   // requis
  email?:    string   // optionnel
}
```

### Séquence d'actions

**Étape 1 — Créer contact GHL**
```
POST https://services.leadconnectorhq.com/contacts/
Headers: Authorization, Version, x-location-id
Body: { firstName, lastName, phone, email, locationId, source: "Formulaire Soren" }
→ retourne ghlContactId
```

**Étape 2 — Créer opportunité GHL (pipeline ACQUISITION)**
```
POST /opportunities/
Body: { name: "Devis — {prénom} {nom}", contactId: ghlContactId,
        pipelineId: ACQUISITION_PIPELINE_ID, status: "open",
        pipelineStageId: NOUVEAU_STAGE_ID }
→ retourne ghlOppId
```

**Étape 3 — Sync Supabase**
```
INSERT contacts { first_name, last_name, phone, email, ghl_contact_id }
INSERT leads { contact_id, title, status: "new", source: "formulaire" }
INSERT conversations { contact_id, lead_id, channel: "whatsapp", ai_enabled: true }
```

**Étape 4 — Trigger Kai (gateway)**
```
POST http://{GATEWAY_URL}/sessions/kai/send
Body: {
  message: "NOUVEAU_LEAD | Prénom: {firstName} | Nom: {lastName} |
            Téléphone: {phone} | Email: {email} |
            GHL Contact ID: {ghlContactId} | Conv ID: {conversationId} |
            ACTION: Contacter immédiatement via WhatsApp GHL"
}
```
Kai reçoit ce message comme instruction directe — son SOUL.md définit comment le traiter.


**Étape 5 — Réponse**
```
{ ok: true, contactId, conversationId }
→ client redirect vers /formulaire/merci
```

---

## Composant 3 — Gateway : nouveaux tools Kai

### `ghl_get_available_slots`
Fichier : `gateway/src/skills/ghl.ts`

```typescript
// Appelle GHL Calendar API pour récupérer créneaux libres
// GET /calendars/{calendarId}/free-slots?startDate=...&endDate=...
// Retourne tableau de créneaux { date, heure, slot_id }
// Kai utilise ce tool pour proposer 2-3 options au prospect
```

Input schema :
```json
{
  "calendarId": "string",
  "startDate": "string (ISO)",
  "endDate": "string (ISO)"
}
```

### `ghl_book_appointment`
```typescript
// POST /calendars/events/appointments
// Crée un RDV dans GHL Calendar + notifie le contact
// Retourne appointmentId + heure confirmée
```

Input schema :
```json
{
  "calendarId": "string",
  "contactId": "string",
  "startTime": "string (ISO)",
  "title": "string",
  "notes": "string"
}
```

### `ghl_send_whatsapp`
```typescript
// POST /conversations/messages (GHL unified messaging)
// Canal : WhatsApp (remplace Twilio pour les messages sortants clients)
// Permet à Kai d'envoyer via GHL (tracé dans CRM) plutôt que Twilio seul
```

Input schema :
```json
{
  "contactId": "string",
  "message": "string"
}
```

---

## Composant 4 — Kai SOUL.md : flow new_lead

Ajouter dans le SOUL.md de Kai la gestion du trigger `new_lead` :

```
Quand tu reçois { type: "new_lead", contact: {...} } :

1. Attendre 0 secondes — envoyer immédiatement via ghl_send_whatsapp :
   "Bonjour [Prénom] ! Je suis Kai, assistant chez [Entreprise].
    J'ai bien reçu votre demande. Pour vous proposer la meilleure
    solution, puis-je vous demander quel type de travaux vous envisagez ?"

2. Attendre la réponse (webhook GHL InboundMessage)

3. Questions de qualification (max 4, naturelles) :
   - Type de travaux
   - Budget approximatif
   - Délai souhaité
   - Zone géographique / propriétaire ?

4. Calculer score (grille existante SOUL.md)

5. Si score > 70 :
   - Appeler ghl_get_available_slots(calendarId, prochains 7 jours)
   - Proposer 2 créneaux : "J'ai de la disponibilité jeudi à 14h ou vendredi à 10h, ça vous conviendrait ?"
   - Sur confirmation → ghl_book_appointment()
   - Message confirmation : "Parfait ! RDV confirmé [date/heure]. Vous recevrez un rappel la veille."

6. Si score < 40 : tag GHL "nurturing", message relance J+7 programmé
```

---

## Variables d'environnement à ajouter

### `.env.local` (Next.js)
```
GHL_ACQUISITION_PIPELINE_ID=xxx   # ID pipeline Acquisition GHL
GHL_NOUVEAU_STAGE_ID=xxx          # ID stage "Nouveau" dans pipeline
GATEWAY_URL=http://localhost:3001  # URL gateway locale (ou VPS en prod)
```

### `.env` (gateway VPS)
```
GHL_DEFAULT_CALENDAR_ID=xxx       # Calendrier GHL pour RDV
```

---

## Ce qui N'est PAS dans ce scope

- Configuration réelle Meta Ads (lien Canva suffit pour la démo)
- Relances automatiques J+2/J+7 (déjà dans SOUL.md Kai, activé séparément)
- Nurturing post-travaux (spec séparée N8N)
- Hermes / Data OS (vision long terme)

---

## Critères de succès

1. Thomas remplit le formulaire public avec son vrai numéro
2. Contact apparaît dans `/contacts` et `/pipeline` en < 5s
3. WhatsApp reçu sur son téléphone en < 60s
4. La conversation de qualification fonctionne (Kai répond aux réponses)
5. Un RDV se crée dans `/calendrier` après confirmation
