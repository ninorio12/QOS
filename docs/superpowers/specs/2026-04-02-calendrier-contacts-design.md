# Design — Calendrier (sync suppression + notes) & Contacts (fiche + attribution + GHL)

**Date :** 2026-04-02  
**Statut :** Approuvé

---

## Contexte

QoS est un CRM Next.js 14 (App Router) pour l'agence Qorpo (BTP).  
Sources de données : GHL (GoHighLevel) comme source de vérité pour contacts/RDV, Google Calendar pour la synchro agenda, Supabase pour les données Soren-spécifiques.

---

## Feature 1 — Sync de suppression de RDV (Calendrier)

### Problème
Quand un RDV est créé via Soren, deux événements sont créés : un dans GHL et un dans Google Calendar. Mais le lien entre les deux IDs n'est jamais stocké. Résultat :
- Supprimer depuis Soren → supprime uniquement GHL (pas Google Calendar)
- Supprimer depuis GHL → aucune propagation vers Google Calendar ni vers Soren

### Solution

**Nouvelle table Supabase `calendar_event_links`**
```sql
create table calendar_event_links (
  id                  uuid primary key default gen_random_uuid(),
  ghl_appointment_id  text unique not null,
  google_event_id     text not null,
  created_at          timestamptz default now()
);
create index on calendar_event_links (ghl_appointment_id);
```

**Flux de création modifié (`NewAppointmentModal`)**
Après création GHL + Google, si les deux IDs sont disponibles :
→ `POST /api/calendar-event/link` avec `{ ghlId, googleEventId }` → insert Supabase

**Flux de suppression depuis Soren (`DELETE /api/calendar-event/[id]`)**
1. Lookup `calendar_event_links` pour `ghl_appointment_id = id`
2. Si `google_event_id` trouvé → appel `DELETE` Google Calendar API
3. Supprime la ligne de mapping
4. Supprime dans GHL (comportement actuel conservé)

**Webhook GHL pour suppressions depuis GHL**
Nouveau handler `POST /api/webhooks/ghl/route.ts`  
Événement écouté : `AppointmentDelete`
1. Extrait `appointmentId` du payload
2. Lookup Supabase → `google_event_id`
3. Si trouvé → supprime dans Google Calendar
4. Supprime la ligne de mapping
5. Soren se rafraîchit automatiquement (refresh toutes les 2 min déjà en place)

**Nouveaux fichiers/modifications**
- `src/app/api/calendar-event/link/route.ts` (nouveau)
- `src/app/api/calendar-event/[id]/route.ts` (modifié)
- `src/app/api/webhooks/ghl/route.ts` (nouveau)
- `src/components/calendrier/NewAppointmentModal.tsx` (modifié : appel link après création)

---

## Feature 2 — Preview des notes sur le calendrier

### Problème
Le champ `notes` existe sur `Appointment` et s'affiche dans le DetailCard, mais est invisible sur les pills/cards du calendrier.

### Solution

**Vue mois — `EventPill`**
Tooltip au hover : wrapper `relative group`, div absolue `opacity-0 group-hover:opacity-100` positionnée au-dessus de la pill, contenant le texte des notes. Affiché seulement si `appt.notes`.

**Vue semaine — `WeekCard`**
- Texte inline tronqué (1 ligne, `text-[9px]`, couleur `color + '88'`) si `cardH > 52` et `appt.notes`
- Tooltip au hover (même pattern que EventPill) pour le texte complet

**Fichiers modifiés**
- `src/components/calendrier/CalendarView.tsx` : `EventPill` + `WeekCard`

---

## Feature 3 — Fiche contact (page dédiée)

### Problème
Cliquer sur une row dans la liste contacts ne fait rien. `ContactPanel.tsx` existe comme slide-over mais n'est pas utilisé.

### Solution

**Nouvelle route `/contacts/[id]`**
Page serveur (`src/app/contacts/[id]/page.tsx`) qui :
1. Fetch `GET /contacts/:id` sur l'API GHL
2. Fetch l'attribution depuis Supabase `contact_attribution`
3. Rend un composant `ContactDetailPage` (adapté de `ContactPanel.tsx` en pleine page)

**ContactRow cliquable**
`ContactRow` dans `ContactsView.tsx` : ajout `onClick={() => router.push('/contacts/' + contact.id)}` + `cursor-pointer`.

**Nouveau endpoint API**
`GET /api/contact/[id]` → proxy vers GHL `GET /contacts/:id`, retourne les données enrichies.

**Nouveaux fichiers**
- `src/app/contacts/[id]/page.tsx`
- `src/app/api/contact/[id]/route.ts`
- `src/components/contacts/ContactDetailPage.tsx`

---

## Feature 4 — Colonne "Origine" (qui a créé le contact)

### Problème
Impossible de savoir si un contact a été créé par l'utilisateur ou par un bot Soren (Mia, Kai, Luc…). Les bots n'écrivent pas dans GHL.

### Solution

**Nouvelle table Supabase `contact_attribution`**
```sql
create table contact_attribution (
  ghl_contact_id  text primary key,
  created_by      text not null,  -- 'Thomas' | 'Mia' | 'Kai' | 'Luc' | ...
  created_at      timestamptz default now()
);
```

**Affichage**
Nouvelle colonne "Origine" dans `ContactsView` :
- Badge sombre `#111111` → "Toi"
- Badge coloré (couleur par bot) → nom du bot

**Enrichissement au fetch**
La page `/contacts` fetch GHL contacts + batch-fetch les attributions Supabase → merge avant de passer à `ContactsView`.

**API bots (pour écriture future)**
Les agents Soren (Mia, Kai…) appelleront `POST /api/contact/attribution` avec `{ ghlContactId, createdBy }` quand ils créent un contact.

**Fichiers modifiés/créés**
- `src/app/contacts/page.tsx` (enrichissement avec attribution)
- `src/components/contacts/ContactsView.tsx` (colonne Origine)
- `src/app/api/contact/attribution/route.ts` (nouveau)

---

## Feature 5 — GHL comme base de données contacts

### Problème
Le type `Contact` est un sous-ensemble appauvri de `GHLContact`. Des champs utiles sont perdus lors du mapping (`source`, `attributionSource`, `assignedTo`, `address`, `city`, `customFields`…).

### Solution

**Étendre `GHLContact`**
Ajouter les champs manquants dans `src/lib/ghl.ts` :
```ts
export type GHLContact = {
  // champs existants...
  source: string | null
  assignedTo: string | null
  address1: string | null
  city: string | null
  country: string | null
  postalCode: string | null
  website: string | null
  customFields: { id: string; value: string }[]
}
```

**Supprimer le mapping intermédiaire**
La page `contacts/page.tsx` utilisera `GHLContact` directement au lieu du type `Contact` appauvri. Les composants seront mis à jour pour accepter `GHLContact`.

**Avantage**
La fiche contact et la liste afficheront adresse, ville, site web, champs customs GHL sans aucune perte d'information.

---

## Ordre d'implémentation recommandé

1. Supabase migrations (`calendar_event_links`, `contact_attribution`)
2. Feature 1 : sync suppression calendrier
3. Feature 2 : notes preview calendrier
4. Feature 5 : type GHL étendu (prerequis pour Features 3 & 4)
5. Feature 3 : fiche contact
6. Feature 4 : colonne Origine
