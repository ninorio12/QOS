# Remédiation Acquisition — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner calculs, synchronisations et gestion du temps des modules Acquisition sur les règles métier validées, sans aucun changement visuel.

**Architecture:** Fondations transverses d'abord — (C1) temps local de bout en bout via un offset fuseau transmis du client au serveur, (C2) une couche de transition `leadSync` unique rendant la synchro Contact↔Lead↔Prospection bidirectionnelle — puis rebranchement des KPI dépendants (C3 Dashboard, C4 Performance, C5 Calendrier, C6 fiche unique).

**Tech Stack:** Next.js (App Router) + Convex + TypeScript. Déploiement : `vercel --prod --yes`. Convex : `cd /root/QOS; export CONVEX_DEPLOY_KEY='dev:standing-malamute-439|eyJ2MiI6ImViZDI1YmI3Y2ExNjRlODRiYWRiNjJmMDJhNzMyZDU4In0='; env -u VERCEL -u VERCEL_ENV -u VERCEL_URL -u VERCEL_TARGET_ENV timeout 150 npx convex deploy -y`. Vérif données : `env -u VERCEL … npx convex run <file>:<fn> '<json>'`.

**Conventions de vérification (remplacent TDD/commits — pas de git, pas de tests unitaires) :**
- Après chaque tâche touchant Convex : `npx convex deploy` (codegen) puis `npx tsc --noEmit` (doit être vide sur les fichiers touchés).
- Après chaque tâche touchant le front : `npx tsc --noEmit` puis (en fin de phase) `vercel --prod --yes` → `readyState: READY`.
- Vérification fonctionnelle : `convex run` avec sortie attendue, sur les données démo (`osProspection:seedProspectionDemo` / `cleanupProspectionDemo`).
- **Aucune modification de JSX/CSS/layout.** Seules les valeurs liées (binding d'une donnée déjà affichée) et la logique changent.

---

## PHASE C1 — Temps local partout

### Task 1: Helper `localDay` côté serveur

**Files:**
- Create: `convex/timeLib.ts`

- [ ] **Step 1: Créer le helper**

```ts
// convex/timeLib.ts
// Convertit un timestamp ISO UTC vers la date "YYYY-MM-DD" du jour LOCAL de l'utilisateur.
// tzOffsetMin = valeur de `new Date().getTimezoneOffset()` envoyée par le client
// (minutes à ajouter au local pour obtenir l'UTC ; CET hiver = -60).
// Sans offset → fallback jour UTC (comportement historique).
export function localDay(isoUtc: string, tzOffsetMin?: number): string {
  if (isoUtc == null) return ""
  if (tzOffsetMin === undefined || tzOffsetMin === null) return isoUtc.slice(0, 10)
  const ms = new Date(isoUtc).getTime()
  return new Date(ms - tzOffsetMin * 60000).toISOString().slice(0, 10)
}
```

- [ ] **Step 2: Déployer Convex + typecheck**

Run: `cd /root/QOS; export CONVEX_DEPLOY_KEY='dev:standing-malamute-439|eyJ2MiI6ImViZDI1YmI3Y2ExNjRlODRiYWRiNjJmMDJhNzMyZDU4In0='; env -u VERCEL -u VERCEL_ENV -u VERCEL_URL -u VERCEL_TARGET_ENV timeout 150 npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i timeLib`
Expected: déploiement OK, aucune erreur tsc sur `timeLib`.

### Task 2: `performance.ts` — bucketing en local via `tzOffset`

**Files:**
- Modify: `convex/performance.ts` (import + `loadEvents` + args de `summary`, `activityCalendar`, `objectivesForRange`, `dailyTasksList`)

- [ ] **Step 1: Importer le helper et ajouter l'arg tz à `loadEvents`**

En haut : `import { localDay } from "./timeLib"`.
Dans `loadEvents(ctx, a)`, étendre la signature avec `tzOffset?: number` et remplacer le bucketing :
```ts
// avant: const d = e.createdAt.slice(0, 10)
const dayOf = (iso: string) => localDay(iso, a.tzOffset)
let list = evs.filter((e: any) => { const d = dayOf(e.createdAt); return d >= from && d <= to })
```
et exposer `dayOf` dans le retour : `return { list, chan, recs, from, to, dayOf }`.
Pour `aRappeler` (record.nextFollowUpAt) utiliser `dayOf(r.nextFollowUpAt)`.

- [ ] **Step 2: Ajouter `tzOffset` aux args des queries et le passer à `loadEvents`**

Dans `summary`, `activityCalendar`, `objectivesForRange`, `dailyTasksList` : ajouter `tzOffset: v.optional(v.number())` aux `args`, et passer `tzOffset: a.tzOffset` à `loadEvents`.
Dans `activityCalendar`, le regroupement par jour utilise `dayOf(e.createdAt)` (retourné par `loadEvents`).

- [ ] **Step 3: Déployer + typecheck**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i performance`
Expected: OK, aucune erreur.

- [ ] **Step 4: Vérifier la cohérence**

Run (today en local supposé = jour courant) : `… npx convex run performance:summary "{\"from\":\"$(date +%F)\",\"to\":\"$(date +%F)\",\"tzOffset\":$(date +%-z | awk '{print -($1/100)*60}')}"`
Expected: objet KPI cohérent (non vide si démo seedée). (Le calcul d'offset shell est approximatif ; le vrai offset viendra du navigateur.)

### Task 3: `dashboard.ts` et `paiement.ts` — bucketing local

**Files:**
- Modify: `convex/dashboard.ts` (`getMetrics` : args + `dateOf`/`inWindow`/timeline)
- Modify: `convex/paiement.ts` (`overview` : args + `dOf`/`inWin`)

- [ ] **Step 1: dashboard.ts**

`import { localDay } from "./timeLib"`. Ajouter `tzOffset: v.optional(v.number())` aux args de `getMetrics`. Remplacer `dateOf = c.createdAt.split('T')[0]` par `localDay(c.createdAt, args.tzOffset)` ; idem la boucle timeline `d.toISOString().split('T')[0]` → construire les clés de jour localement (les jours `from..to` sont déjà locaux côté client). `inWindow`/`upToEnd` comparent désormais des jours locaux cohérents.

- [ ] **Step 2: paiement.ts**

`import { localDay }`. Ajouter `tzOffset` aux args de `overview`. Remplacer `dOf = s.split('T')[0]` par `localDay(s, tzOffset)` pour les `createdAt` ; **laisser** les `paidDates`/`refund.date` tels quels (déjà des dates saisies, sans heure).

- [ ] **Step 3: Déployer + typecheck**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -iE "dashboard|paiement"`
Expected: OK.

### Task 4: Clients — envoyer l'offset + presets en local

**Files:**
- Modify: `src/components/performance/PerformanceView.tsx` (presets + appels queries)
- Modify: `src/components/dashboard/DashboardClient.tsx` (appel getMetrics)
- Modify: `src/components/paiement/PaiementView.tsx` (appel overview)
- Modify: `src/app/api/dashboard/route.ts` (passer tzOffset à getMetrics)

- [ ] **Step 1: PerformanceView — presets locaux + tzOffset**

Remplacer `const today = () => iso(new Date())` et l'usage de `iso()` dans le `useMemo` des presets par `localDate()` (déjà présent dans le fichier). Définir `const tzOffset = new Date().getTimezoneOffset()`. Ajouter `tzOffset` aux 3 `useQuery` (`summary`, `objectivesForRange`, `activityCalendar`).

- [ ] **Step 2: DashboardClient + dashboard route — tzOffset**

Là où la SWR key/appel `getMetrics` est construit, ajouter `tzOffset: new Date().getTimezoneOffset()` aux paramètres ; propager via `src/app/api/dashboard/route.ts` jusqu'à `api.dashboard.getMetrics`.

- [ ] **Step 3: PaiementView — tzOffset**

Ajouter `tzOffset: new Date().getTimezoneOffset()` à l'appel `useQuery(api.paiement.overview, …)`.

- [ ] **Step 4: typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -iE "PerformanceView|DashboardClient|PaiementView|dashboard/route"`
Expected: vide.

### Task 5: Calendrier — fuseau navigateur au lieu de Europe/Paris

**Files:**
- Modify: `src/components/calendrier/NewAppointmentModal.tsx` (envoyer `tz`)
- Modify: `src/app/api/google-events/route.ts:56-57` (POST) ; `src/app/api/google-events/[id]/route.ts:46-47` (PATCH) ; `src/app/api/calendar-event/route.ts:33`

- [ ] **Step 1: Client envoie le fuseau IANA**

Dans `NewAppointmentModal.handleSave`, calculer `const tz = Intl.DateTimeFormat().resolvedOptions().timeZone` et l'ajouter au body des POST `/api/calendar-event` et `/api/google-events`. Pour le drag (CalendarView PATCH `/api/google-events/[id]`), ajouter aussi `tz`.

- [ ] **Step 2: Routes utilisent `tz` (fallback Europe/Paris)**

Dans chaque route, lire `tz` du body : `const tz = body.tz || 'Europe/Paris'` et remplacer les littéraux `'Europe/Paris'` par `tz` (`timeZone`/`selectedTimezone`).

- [ ] **Step 3: typecheck + déploiement de phase**

Run: `npx tsc --noEmit 2>&1 | grep -iE "calendrier|google-events|calendar-event"` (vide), puis `vercel --prod --yes 2>&1 | grep readyState`
Expected: `READY`.

- [ ] **Step 4: Vérif manuelle bord de journée (note)**

Vérifier en prod (Performance) qu'une action loggée le soir reste sur le bon jour local (comparer la cellule du calendrier d'exécution). Documenter avant/après.

---

## PHASE C2 — Couche de synchro unifiée `leadSync`

### Task 6: Schéma — champ `lostStage`

**Files:**
- Modify: `convex/schema.ts` (table `prospection_records`)

- [ ] **Step 1: Ajouter le champ**

Dans `prospection_records`, après `lostReason` : `lostStage: v.optional(v.string()),  // nouveau-lead | conversation` .

- [ ] **Step 2: Déployer + typecheck**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i schema`
Expected: OK (champ optionnel, pas de migration).

### Task 7: Helper de dédup contact unique

**Files:**
- Create: `convex/contactDedup.ts`
- Modify: `convex/crm_contacts.ts` (`create` utilise le helper) ; `convex/osProspection.ts` (`createOrLink` utilise le helper)

- [ ] **Step 1: Créer le helper partagé**

```ts
// convex/contactDedup.ts
import { type Id } from "./_generated/dataModel"
const digits = (s?: string | null) => (s || "").replace(/\D/g, "")
const norm = (s?: string | null) => (s || "").toLowerCase().trim()

// Retourne l'_id d'un contact existant correspondant, sinon null.
// matchName = true ajoute la clé nom+entreprise (utilisée par la prospection).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findDuplicateContact(ctx: any, c: { phone?: string; email?: string; linkedinUrl?: string; fullName?: string; companyName?: string }, matchName = false): Promise<Id<"crm_contacts"> | null> {
  const ephone = digits(c.phone), eemail = norm(c.email), elink = norm(c.linkedinUrl)
  const ename = matchName ? norm(c.fullName) + "|" + norm(c.companyName) : ""
  if (!ephone && !eemail && !elink && !ename) return null
  const all = await ctx.db.query("crm_contacts").collect()
  const m = all.find((x: any) =>
    (ephone && digits(x.phone) === ephone) ||
    (eemail && norm(x.email) === eemail) ||
    (elink && norm(x.linkedinUrl) === elink) ||
    (matchName && ename && (norm(`${x.firstName ?? ""} ${x.lastName ?? ""}`) + "|" + norm(x.companyName)) === ename))
  return m ? m._id : null
}
```

- [ ] **Step 2: Brancher dans `crm_contacts.create`**

Remplacer le bloc de dédup inline par `const dup = await findDuplicateContact(ctx, { phone: args.phone, email: args.email, linkedinUrl: args.linkedinUrl })` ; si `dup`, patch léger + `return dup` (comme aujourd'hui).

- [ ] **Step 3: Brancher dans `osProspection.createOrLink`**

Remplacer la dédup inline par `findDuplicateContact(ctx, {phone,email,linkedinUrl,fullName,companyName}, true)`.

- [ ] **Step 4: Déployer + typecheck + vérif**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -iE "contactDedup|crm_contacts|osProspection"` (vide).
Vérif dédup : créer un contact via `crm_contacts:create` deux fois avec même téléphone → le 2e renvoie le même `_id`. Nettoyer.

### Task 8: Module `leadSync`

**Files:**
- Create: `convex/leadSync.ts`

- [ ] **Step 1: Créer les helpers de transition**

```ts
// convex/leadSync.ts
import { type Id } from "./_generated/dataModel"
import { WORKSPACE, logActivity } from "./osLib"
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().split("T")[0]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function prospForContact(ctx: any, contactId: string) {
  return (await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
    .find((r: any) => r.contactId === contactId && r.status !== "archived")
}

// Déplace le lead Pipeline + miroir colonne Prospection. column: 'nouveau-lead'|'conversation'|'r1'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function moveStage(ctx: any, contactId: string, stageId: string, by = "human:thomas") {
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && lead.status === "open" && lead.stageId !== stageId) {
    await ctx.db.patch(lead._id, { stageId })
    await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId, stageName: stageId, enteredAt: today() })
  }
  // miroir prospection : r1 → handoff ; conversation/nouveau-lead → active
  const rec = await prospForContact(ctx, contactId)
  if (rec) {
    const status = stageId === "r1" ? "handoff" : "active"
    if (rec.status !== status) await ctx.db.patch(rec._id, { status, updatedAt: now() })
  }
  void by
}

// Marque perdu partout. stage = stade au moment de la perte ('nouveau-lead'|'conversation') ; calculé si non fourni.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markLost(ctx: any, contactId: string, opts: { reason?: string; stage?: string; by?: string }) {
  const by = opts.by ?? "human:thomas"
  const rec = await prospForContact(ctx, contactId)
  const stage = opts.stage ?? (rec && (rec.phase1Status || rec.phase2Status || rec.phase3Status) ? "conversation" : "nouveau-lead")
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && lead.status !== "lost") await ctx.db.patch(lead._id, { status: "lost" })
  await ctx.db.patch(contactId as Id<"crm_contacts">, { statut: "perdu", leadStatus: "non_qualifie", updatedAt: now() })
  if (rec && rec.status !== "lost") {
    await ctx.db.patch(rec._id, { status: "lost", lostReason: opts.reason ?? "autre", lostStage: stage, updatedAt: now() })
    await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: rec._id, contactId, eventType: "perdu", phase: stage, createdBy: by, createdAt: now() })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = await ctx.db.get(contactId as Id<"crm_contacts">) as any
  const cName = c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "contact"
  await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "lead.lost", summary: `Perdu (${stage}) — ${cName}`, entityType: "prospection", entityId: rec?._id ?? contactId, source: "leadSync" })
}
```

- [ ] **Step 2: Déployer + typecheck**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i leadSync`
Expected: OK.

### Task 9: Brancher `osProspection` sur `leadSync`

**Files:**
- Modify: `convex/osProspection.ts` (`quickAction` perdu/r1 ; `setPhaseCell` ; `linkInternal` doublon ; `remove` orphelin)

- [ ] **Step 1: quickAction — déléguer perdu/r1 à leadSync + poser `phase` sur l'event**

Dans `quickAction` : pour `action==='perdu'/'negatif'/'mauvais_numero'/'non_qualifie'`, appeler `markLost(ctx, rec.contactId, { reason, by })` au lieu du patch inline (la dérivation du `stage` est faite par `markLost`). Pour `r1_booke`, après le patch local, appeler `moveStage(ctx, rec.contactId, 'r1', by)`. **Et** ajouter `phase: <phase pertinent>` au `prospection_events.insert` de quickAction (ligne ~214) pour fiabiliser `avancees`.

- [ ] **Step 2: setPhaseCell — déléguer le move de stage**

Remplacer le bloc qui patch `crm_leads.stageId` par `await moveStage(ctx, rec.contactId, (p1||p2||p3) ? 'conversation' : 'nouveau-lead', by)`.

- [ ] **Step 3: linkInternal — pas de doublon de lead**

Quand un `crm_lead` existe mais `status!=="open"`, le **rouvrir** (`status:"open"`, `stageId:"nouveau-lead"`) au lieu d'en insérer un nouveau.

- [ ] **Step 4: remove — clôturer le lead**

Dans `remove`, après suppression du record : récupérer le lead du contact et le passer `status:"lost"` (ou le supprimer) pour éviter l'orphelin open. (Choix : `status:"lost"` pour conserver l'historique.)

- [ ] **Step 5: Déployer + typecheck + vérif**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i osProspection` (vide).
Vérif lostStage : seed démo, prendre un lead sans phase, `quickAction perdu` → `osProspection:get` montre `lostStage:"nouveau-lead"`, `column:"perdu"`, et `crm_leads:get` du lead → `status:"lost"`. Prendre un lead avec une phase remplie, `perdu` → `lostStage:"conversation"`. Nettoyer.

### Task 10: Synchro inverse Pipeline → Prospection

**Files:**
- Modify: `convex/crm_leads.ts` (`updateStage`, `updateStatus`)

- [ ] **Step 1: updateStage appelle leadSync**

Dans `crm_leads.updateStage(id, stageId, …)`, après avoir lu le lead, si `lead.contactId` existe : `await moveStage(ctx, lead.contactId, stageId)` (import depuis `./leadSync`). Garder le patch existant (moveStage ne re-patch que si différent → idempotent).

- [ ] **Step 2: updateStatus='lost' appelle markLost**

Dans `crm_leads.updateStatus`, si `status==='lost'` et `lead.contactId` : `await markLost(ctx, lead.contactId, { reason: 'autre' })`. Sinon comportement inchangé.

- [ ] **Step 3: Déployer + typecheck + vérif bidirectionnelle**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i crm_leads` (vide).
Vérif : seed démo, prendre un lead actif, `crm_leads:updateStatus {id, status:"lost"}` → `osProspection:get` du record montre `column:"perdu"` + `lostStage` posé + contact `statut:"perdu"`. Prendre un lead, `updateStage {id, stageId:"conversation"}` → record reste cohérent (status active). Nettoyer.

---

## PHASE C3 — KPI Dashboard

### Task 11: dashboard.getMetrics — définitions D1/D2 + métiers/niches distincts

**Files:**
- Modify: `convex/dashboard.ts` (`getMetrics`)

- [ ] **Step 1: Clients/Leads = intersection, créés dans la période**

- **Clients** : `pipeline_clients` dont le `ghl_contact_id` correspond à un `crm_contacts` avec `statut==='client'` **ET** `localDay(c.createdAt, tzOffset)` ∈ `[from,to]`.
- **Leads** : `crm_leads` `status==='open'` dont le `contactId` a `crm_contacts.statut==='lead'` **ET** créés dans `[from,to]` (exclure `won`).
- Construire une map `crm_contacts._id → statut` pour l'intersection.

- [ ] **Step 2: R1/R2 = comptage live**

`r1Count` / `r2Count` = nombre de `crm_leads` `status==='open'` avec `stageId==='r1'` / `'r2'` **sans** filtre de période (état courant des colonnes).

- [ ] **Step 3: Métiers / Niches distincts**

Exposer `metiersCount = metierMap.size` et `nichesCount = nicheMap.size` (nombre de valeurs distinctes parmi les fiches clients de la période). Garder les structures de breakdown existantes pour la modale.

- [ ] **Step 4: CA encaissé / à collecter (vrais paiements)**

Importer la logique de `paiement.overview` (paiements réellement reçus dans `[from,to]` = `encaisse`, attente = `attente`). Retourner `caEncaisse = encaisse` et `caACollecter = attente` calculés via les `onboarding.payment` (paidStatus/paidDates) bornés période, au lieu de la somme `pipeline_clients.value`.

- [ ] **Step 5: Déployer + typecheck**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i dashboard` (vide).

### Task 12: Brancher les valeurs sur les cartes existantes (sans toucher au layout)

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx` (binding `caACollecter`, `metiersCount`, `nichesCount`, table Paiements encaissés filtrée)

- [ ] **Step 1: CA à collecter**

Remplacer le `'—'` codé en dur de la carte CA à collecter par `fmt(metrics.caACollecter)` (la carte/markup existe déjà — on ne change que la valeur liée).

- [ ] **Step 2: Métiers / Niches**

Au centre de la carte Métiers, afficher `metrics.metiersCount` au lieu de `clientsCount`. Idem ajouter/lier le nombre `nichesCount` là où la donnée Niches est rendue (binding de la valeur existante).

- [ ] **Step 3: Table « Paiements encaissés » filtrée période**

La table doit lire la source période (passer `from/to/tzOffset`). Si elle utilise `onboarding.paymentsOverview` (global), basculer sur `paiement.overview` (déjà période) ou ajouter `from/to` à `paymentsOverview`. Choix : réutiliser `paiement.overview.transactions` filtrées.

- [ ] **Step 4: typecheck + déploiement de phase + vérif chiffres**

Run: `npx tsc --noEmit 2>&1 | grep -i DashboardClient` (vide), puis `vercel --prod --yes | grep readyState` (`READY`).
Vérif : seed démo, `dashboard:getMetrics {from,to,tzOffset}` → comparer `clientsCount`/`leadsCount`/`caEncaisse`/`caACollecter`/`metiersCount`/`nichesCount` aux valeurs attendues sur la démo ; documenter le delta avant/après.

---

## PHASE C4 — Performance & Objectifs

### Task 13: Avancées fiabilisées + redondance objectif R1

**Files:**
- Modify: `convex/performance.ts` (`activityCalendar.avancees`, retrait de la dépendance `prospection_goals` pour le goal)

- [ ] **Step 1: Avancées**

`avancees` = leads distincts dont, ce jour-là, un event marque une **vraie** avancée : `e.phase ∈ {phase2,phase3}` OU `eventType==='r1_booke'` OU `eventType` ∈ LOST. (Maintenant que `quickAction` pose `phase` (Task 9), les actions via boutons/MCP sont comptées.)

- [ ] **Step 2: Objectif R1 unique**

Supprimer la dépendance `prospection_goals.targetR1Booked` pour le `goal`/`goalMet` du calendrier : dériver le goal du jour depuis le `setter_task` `metric:'r1'` du jour (s'il existe), sinon `goal=0`/`goalMet=false`. (On conserve `setter_tasks` comme mécanisme unique d'objectif R1.) Laisser `setR1Objective`/`prospection_goals` en place mais non lus par le calendrier (cleanup documenté).

- [ ] **Step 3: Déployer + typecheck + vérif**

Run: `… npx convex deploy -y && npx tsc --noEmit 2>&1 | grep -i performance` (vide).
Vérif : seed démo, `performance:activityCalendar {from,to,tzOffset}` → `avancees` ≥ avant (les r1/perdu/phase2-3 comptent). Nettoyer.

*Note : Réponses / À rappeler restent en leads distincts (D3) — aucune modification.*

---

## PHASE C5 — Calendrier

### Task 14: Persistance du type d'événement (R1/R2/…)

**Files:**
- Modify: `src/app/api/google-events/route.ts` (POST écrit `extendedProperties.private.type`)
- Modify: `src/app/api/calendrier/route.ts` (GET relit `extendedProperties.private.type` et l'expose comme `type`)
- Modify: `src/components/calendrier/NewAppointmentModal.tsx` (envoie `type` au POST)

- [ ] **Step 1: Écrire le type à la création**

NewAppointmentModal envoie `type: eventType` au POST `/api/google-events`. La route ajoute au `requestBody` Google : `extendedProperties: { private: { type } }`.

- [ ] **Step 2: Relire le type au GET**

Dans `/api/calendrier/route.ts`, lors du mapping des events Google, lire `ev.extendedProperties?.private?.type` et le poser sur l'`Appointment.type`. (GHL : best-effort, sinon `autre`.)

- [ ] **Step 3: typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -iE "google-events|calendrier/route|NewAppointmentModal"` (vide).

### Task 15: Fenêtre de fetch suit le mois + refresh + cascade delete + toast

**Files:**
- Modify: `src/components/calendrier/CalendarView.tsx` (refresh via SWR mutate ; passer la plage visible au fetch)
- Modify: `src/app/api/calendrier/route.ts` (accepter from/to)
- Modify: `src/app/api/google-events/[id]/route.ts` (DELETE Google cascade vers GHL via les liens)
- Modify: `src/components/calendrier/NewAppointmentModal.tsx` (toast conditionnel)

- [ ] **Step 1: Refresh = SWR mutate**

Remplacer `router.refresh()` par le `mutate()` de la clé SWR `/api/calendrier` (la page utilise `useSWR`).

- [ ] **Step 2: Fetch suit la plage**

CalendarView passe le mois/semaine affiché (`from`,`to`) à `/api/calendrier` ; la route élargit la fenêtre GHL/Google à cette plage au lieu de ±30 j fixes.

- [ ] **Step 3: Cascade suppression Google→GHL**

Dans la suppression d'un event `source==='google'`, après le DELETE Google, résoudre le lien Supabase `calendar_event_links` (google→ghl) et supprimer aussi l'appointment GHL.

- [ ] **Step 4: Toast conditionnel**

`onCreated`/toast « RDV créé » uniquement si GHL **ou** Google a réellement persisté ; sinon afficher une erreur.

- [ ] **Step 5: typecheck + déploiement de phase**

Run: `npx tsc --noEmit 2>&1 | grep -i calend` (vide), `vercel --prod --yes | grep readyState` (`READY`).

---

## PHASE C6 — Fiche contact unique

### Task 16: Clic carte Pipeline → même `NewContactModal`

**Files:**
- Inspect: `src/components/pipeline/KanbanBoard.tsx`, `src/components/pipeline/ClientsBoard.tsx` (handler `onCardClick`)
- Modify (si divergent) : ouvrir la même `NewContactModal` (mode édition) que Contacts/Prospection à partir du `contactId` de la carte.

- [ ] **Step 1: Vérifier le point d'entrée actuel**

Run: `grep -n "onCardClick\|NewContactModal\|setSelected\|Drawer\|Detail" src/components/pipeline/KanbanBoard.tsx src/components/pipeline/ClientsBoard.tsx`
Expected: identifier ce qui s'ouvre au clic.

- [ ] **Step 2: Homogénéiser si nécessaire**

Si le clic ouvre un drawer/détail propre au Pipeline, le remplacer par l'ouverture de `NewContactModal` (édition) à partir du `contactId` de la carte (fetch `crm_contacts.get` + mapping `GHLContact`, même pattern que ProspectionView). Ne pas toucher au layout du board.

- [ ] **Step 3: typecheck + déploiement final**

Run: `npx tsc --noEmit 2>&1 | grep -i pipeline` (vide), `vercel --prod --yes | grep readyState` (`READY`).

---

## Vérification finale (toutes phases)

- [ ] Reseed démo propre : `osProspection:cleanupProspectionDemo` puis `seedProspectionDemo`.
- [ ] Parcours sync 4 chemins : Prospection→Pipeline, Pipeline→Prospection, Perdu des deux côtés, `lostStage` correct dans les 2 cas.
- [ ] KPI Dashboard : `getMetrics` cohérent (intersection, période flux, CA réels, métiers/niches distincts).
- [ ] Performance : presets locaux corrects (bord de journée), avancées comptées.
- [ ] Calendrier : type survit au rechargement, refresh fonctionne.
- [ ] `npx tsc --noEmit` global : pas de **nouvelle** erreur sur les fichiers touchés.
- [ ] Documenter le tableau des deltas de chiffres (avant/après) sur la démo pour validation utilisateur.

---

## Notes de cohérence (pour l'exécutant)

- **Pas de git ici** : ignorer les étapes « commit » des conventions du skill ; la « sauvegarde » = déploiement réussi.
- **Pas de tests unitaires** : la vérification est `tsc` + `convex run` + déploiement. Ne pas introduire de framework de test.
- **Aucun changement visuel** : ne modifier que valeurs liées et logique ; si une correction semble exiger un changement de markup, s'arrêter et demander.
- **Idempotence sync** : `moveStage`/`markLost` ne re-patchent que si l'état diffère → pas de boucle entre `crm_leads.updateStage` ↔ `leadSync.moveStage` ↔ prospection.
- **Données démo** : toujours `cleanup` après une vérification qui crée des données de test.
- **Source du fuseau** : maintenant = navigateur (`new Date().getTimezoneOffset()` pour l'offset serveur, `Intl…timeZone` pour le calendrier) = le PC de l'utilisateur, conforme à la règle. Évolution prévue : le futur module **Paramètres (compte)** stockera un fuseau qui remplacera le navigateur ; le serveur ne change pas (il reçoit déjà un offset, quelle que soit sa source). Le client lira alors le réglage compte au lieu du navigateur.
</content>
