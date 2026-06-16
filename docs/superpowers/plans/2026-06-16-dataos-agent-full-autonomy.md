# DataOS Agent Full Autonomy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux agents Hermes la parité totale UI↔MCP sur le Data OS (toute opération humaine devient un outil MCP), supprimer toute autorisation (plus de `pending`), tout en gardant l'audit ; le dev/code reste hors agents.

**Architecture:** Le serveur MCP `src/app/api/mcp/route.ts` expose un tableau `TOOLS[]` ; chaque outil mappe vers une mutation/query Convex **déjà existante**. Le moteur de permissions pur `convex/lib/permissions.ts` (`POLICY`, `FULL_GRANTS` dérivé, `APPROVAL_VERBS`) décide execute/approval/forbidden. On ajoute des outils + entrées `POLICY` pour les modules manquants, on vide `APPROVAL_VERBS`, puis on re-seed les permissions et on met à jour les scopes des credentials existants (sans rotation de token).

**Tech Stack:** Next.js (route handler), Convex (`standing-malamute-439`), TypeScript, vitest + convex-test. Déploiement Convex via `CONVEX_DEPLOY_KEY` (mémoire `qos-convex-deploy`).

---

## Contexte de référence (à lire avant de commencer)

- Spec : `docs/superpowers/specs/2026-06-16-dataos-agent-full-autonomy-design.md`
- Outils MCP + dispatch : `src/app/api/mcp/route.ts` (pattern `Tool` ligne 33, `TOOLS[]` ligne 37, `dispatch` ligne 425).
- Moteur permissions : `convex/lib/permissions.ts` (`POLICY` ligne 49, `APPROVAL_VERBS` ligne 132, `buildFullGrants` ligne 158).
- Tests existants : `convex/lib/permissions.test.ts`, `convex/enforcement.test.ts`, `convex/agentGuard.test.ts`.
- Pipeline « Leads » (`pn73y0a6tzhbwdh29bv9wqrrrh87wfrs`) stages : `nouveau-lead`→`conversation` (« En conversation »)→`r1`→`r2`→`nouveau-client`.
- Lancer les tests : `npm test` (= `vitest run`). Typecheck : `npx tsc --noEmit -p convex/tsconfig.json` puis `npx tsc --noEmit`.
- Lecture/écriture prod Convex en CLI : `CONVEX_DEPLOYMENT=prod:standing-malamute-439 npx convex run <module>:<fn> '<json>'`.

## Anatomie d'un outil MCP (pattern à répéter)

Un outil = un objet dans `TOOLS[]` (`route.ts`) :
```ts
{
  name: 'devis_create',
  description: 'Crée un devis. titre + source requis ; lignes[], notes, statut, contact_id/name/email/phone.',
  inputSchema: obj({ titre: Sx.string, source: Sx.string, /* ... */ }, ['titre', 'source']),
  run: (a) => cx().mutation(api.devis.createDevis, { titre: a.titre, source: a.source ?? 'agent', /* ... */ }),
  log: (a, r) => ({ eventType: 'devis.created', summary: `Devis : ${a.titre}`, entityType: 'devis', entityId: String(r) }),
}
```
Et **toujours** une entrée `POLICY` dans `convex/lib/permissions.ts` (sinon `requiredScopeForCall` renvoie `null` → `-32003 Forbidden: non mappé`) :
```ts
devis_create: { module: "devis", verb: "write" },
```
`buildFullGrants()` dérive `FULL_GRANTS` de `POLICY` → tout nouveau `module:verb` entre automatiquement dans les grants. Helpers déjà dispo dans `route.ts` : `obj(props, required)`, `Sx` (string/number/bool/strArr), `cx()`, `initials()`.

---

## Task 1: Zéro autorisation (vider APPROVAL_VERBS)

**Files:**
- Modify: `convex/lib/permissions.ts:132`
- Test: `convex/lib/permissions.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `convex/lib/permissions.test.ts` :
```ts
import { describe, it, expect } from "vitest"
import { decide, APPROVAL_VERBS, scopesFromGrants, FULL_GRANTS } from "./permissions"

describe("zéro autorisation", () => {
  it("APPROVAL_VERBS est vide", () => {
    expect(APPROVAL_VERBS.size).toBe(0)
  })
  it("aucun grant ne requiert d'approbation", () => {
    const { approvalScopes } = scopesFromGrants(FULL_GRANTS)
    expect(approvalScopes).toEqual([])
  })
  it("decide ne renvoie jamais 'approval' pour un scope accordé", () => {
    const granted = new Set(["clients:convert"])
    expect(decide(granted, new Set(), "clients:convert")).toBe("execute")
  })
})
```

- [ ] **Step 2: Lancer le test → échec**

Run: `npm test -- permissions`
Expected: FAIL (`APPROVAL_VERBS.size` vaut 5, pas 0).

- [ ] **Step 3: Vider APPROVAL_VERBS**

Dans `convex/lib/permissions.ts`, remplacer ligne 132 :
```ts
export const APPROVAL_VERBS = new Set(["archive", "convert", "value", "send", "publish"])
```
par :
```ts
// Zéro autorisation (décision Thomas 2026-06-16) : aucune action n'exige d'approbation.
// L'audit append-only (os_activities) reste la traçabilité. Le flux createPendingApproval/
// reviewApproval est conservé dans le code mais devient dormant.
export const APPROVAL_VERBS = new Set<string>([])
```

- [ ] **Step 4: Lancer le test → succès**

Run: `npm test -- permissions`
Expected: PASS (toute la suite permissions verte).

- [ ] **Step 5: Commit**

```bash
git add convex/lib/permissions.ts convex/lib/permissions.test.ts
git commit -m "feat(dataos): zéro autorisation agents — vide APPROVAL_VERBS, audit conservé"
```

---

## Task 2: Test d'acceptation ancre (lead create + move) — baseline e2e

But : prouver que la phrase « crée un lead et déplace-le de 'leads' à 'lead conversation' » s'exécute de bout en bout via MCP. Ces 2 outils (`leads_create`, `pipeline_move`) existent déjà → ce task verrouille la non-régression et fournit le harnais e2e réutilisé en Task 11.

**Files:**
- Create: `scripts/agent-e2e/anchor-lead-move.mjs`

- [ ] **Step 1: Écrire le script de test e2e**

Créer `scripts/agent-e2e/anchor-lead-move.mjs` :
```js
// Usage: DATAOS_TOKEN=dos_... node scripts/agent-e2e/anchor-lead-move.mjs
// Vérifie: tools/call leads_create puis pipeline_move vers stageId 'conversation'.
const URL = process.env.MCP_URL || 'https://data-os.vividflow.co/api/mcp'
const TOKEN = process.env.DATAOS_TOKEN
if (!TOKEN) { console.error('DATAOS_TOKEN requis'); process.exit(2) }
const call = async (name, args) => {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  })
  const j = await r.json()
  if (j.error) throw new Error(`${name}: ${j.error.code} ${j.error.message}`)
  const txt = j.result?.content?.[0]?.text
  return txt ? JSON.parse(txt) : j.result
}
const stamp = Date.now()
const created = await call('leads_create', { name: `E2E Test ${stamp}`, email: `e2e+${stamp}@vividflow.co`, source: 'agent-e2e' })
console.log('lead créé:', created)
const moved = await call('pipeline_move', { id: created.leadId, stageId: 'conversation', stageName: 'En conversation' })
console.log('lead déplacé:', moved)
console.log('OK ✅ — lead créé puis déplacé en "En conversation" sans pending')
```

- [ ] **Step 2: Lancer contre la prod avec un token agent**

Récupérer un token agent valide (ex COO) :
```bash
TOKEN=$(node -e 'console.log(require("dotenv").config({path:"/root/.hermes/profiles/orchestrator/.env"}).parsed?.DATAOS_TOKEN||"")')
DATAOS_TOKEN="$TOKEN" node scripts/agent-e2e/anchor-lead-move.mjs
```
Expected: affiche `lead créé`, `lead déplacé`, puis `OK ✅`. Aucun `{status:'pending'}`.

- [ ] **Step 3: Vérifier la trace d'audit**

Run: `CONVEX_DEPLOYMENT=prod:standing-malamute-439 npx convex run osActivities:list '{"limit":5}'`
Expected: une activité `lead.created` et une `pipeline.moved` (actorType=agent, source=mcp) récentes.

- [ ] **Step 4: Commit**

```bash
git add scripts/agent-e2e/anchor-lead-move.mjs
git commit -m "test(dataos): harnais e2e ancre — lead create + pipeline move"
```

---

## Task 3: Outils MCP — devis

**Files:**
- Modify: `src/app/api/mcp/route.ts` (ajout dans `TOOLS[]`)
- Modify: `convex/lib/permissions.ts` (`POLICY`)
- Test: `convex/lib/permissions.test.ts`

Mutations cibles (signatures vérifiées) : `api.devis.listDevis()`, `api.devis.getDevis({id})`, `api.devis.createDevis({titre,source,lignes?,notes?,statut?,contact_id?,contact_name?,contact_email?,contact_phone?,adresse_client?})`, `api.devis.updateDevis({id, updates:{...}})`, `api.devis.deleteDevis({id})`.

- [ ] **Step 1: Test qui échoue (mapping POLICY)**

Ajouter dans `permissions.test.ts` :
```ts
import { requiredScopeForCall, decide, scopesFromGrants, FULL_GRANTS } from "./permissions"
it("devis tools sont mappés et exécutables", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["devis_list", "devis:read"], ["devis_create", "devis:write"],
    ["devis_update", "devis:write"], ["devis_delete", "devis:delete"],
  ] as const) {
    const need = requiredScopeForCall(tool)
    expect(need?.scope).toBe(scope)
    expect(decide(granted, new Set(), scope)).toBe("execute")
  }
})
```

- [ ] **Step 2: Lancer → échec**

Run: `npm test -- permissions`
Expected: FAIL (`requiredScopeForCall('devis_list')` = null).

- [ ] **Step 3: Ajouter les entrées POLICY**

Dans `convex/lib/permissions.ts`, dans l'objet `POLICY` (avant `dataos_state`), ajouter :
```ts
  // Devis
  devis_list:   { module: "devis", verb: "read" },
  devis_get:    { module: "devis", verb: "read" },
  devis_create: { module: "devis", verb: "write" },
  devis_update: { module: "devis", verb: "write" },
  devis_delete: { module: "devis", verb: "delete" },
```

- [ ] **Step 4: Ajouter les outils MCP**

Dans `src/app/api/mcp/route.ts`, dans `TOOLS[]` (avant l'outil `dataos_state`), ajouter :
```ts
  // ───────────── Devis ─────────────
  { name: 'devis_list', description: 'Liste les devis.', inputSchema: obj({}), run: () => cx().query(api.devis.listDevis, {}) },
  { name: 'devis_get', description: 'Récupère un devis par id.', inputSchema: obj({ id: Sx.string }, ['id']), run: (a) => cx().query(api.devis.getDevis, { id: a.id }) },
  {
    name: 'devis_create', description: 'Crée un devis. titre requis ; source, lignes[{description,quantite,unite,prixUnitaire,tvaRate}], notes, statut, contact_id/name/email/phone, adresse_client.',
    inputSchema: obj({ titre: Sx.string, source: Sx.string, lignes: { type: 'array', items: { type: 'object' } }, notes: Sx.string, statut: Sx.string, contact_id: Sx.string, contact_name: Sx.string, contact_email: Sx.string, contact_phone: Sx.string, adresse_client: Sx.string }, ['titre']),
    run: (a) => cx().mutation(api.devis.createDevis, { titre: a.titre, source: a.source ?? 'agent', lignes: a.lignes, notes: a.notes, statut: a.statut, contact_id: a.contact_id, contact_name: a.contact_name, contact_email: a.contact_email, contact_phone: a.contact_phone, adresse_client: a.adresse_client }),
    log: (a, r) => ({ eventType: 'devis.created', summary: `Devis : ${a.titre}`, entityType: 'devis', entityId: String(r) }),
  },
  {
    name: 'devis_update', description: 'Met à jour un devis. id requis + updates{titre,lignes,notes,statut,contact_name,contact_email,contact_phone,ville,date_validite,adresse_chantier,adresse_client}.',
    inputSchema: obj({ id: Sx.string, updates: { type: 'object' } }, ['id', 'updates']),
    run: (a) => cx().mutation(api.devis.updateDevis, { id: a.id, updates: a.updates ?? {} }),
    log: (a) => ({ eventType: 'devis.updated', summary: 'Devis mis à jour', entityType: 'devis', entityId: a.id }),
  },
  {
    name: 'devis_delete', description: 'Supprime un devis. id requis.',
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.devis.deleteDevis, { id: a.id }),
    log: (a) => ({ eventType: 'devis.deleted', summary: 'Devis supprimé', entityType: 'devis', entityId: a.id }),
  },
```

- [ ] **Step 5: Lancer le test + typecheck → succès**

Run: `npm test -- permissions && npx tsc --noEmit`
Expected: PASS + typecheck OK.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/mcp/route.ts convex/lib/permissions.ts convex/lib/permissions.test.ts
git commit -m "feat(dataos): outils MCP devis (list/get/create/update/delete)"
```

---

## Task 4: Outils MCP — media-buyer

**Files:** `src/app/api/mcp/route.ts`, `convex/lib/permissions.ts`, `convex/lib/permissions.test.ts`

Mutations cibles : `api.mediaBuyer.board({level?})`, `api.mediaBuyer.upsert({id?,level,name,campaign?,adset?,thumbUrl?,periodFrom?,periodTo?,spend,roas?,cpa?,ctr?,hookRate?,frequency?,results?,verdictOverride?,source?})`, `api.mediaBuyer.remove({id})`.

- [ ] **Step 1: Test qui échoue**
```ts
it("media_buyer tools mappés", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["media_buyer_board", "media_buyer:read"],
    ["media_buyer_upsert", "media_buyer:write"],
    ["media_buyer_remove", "media_buyer:delete"],
  ] as const) { expect(requiredScopeForCall(tool)?.scope).toBe(scope); expect(decide(granted, new Set(), scope)).toBe("execute") }
})
```
- [ ] **Step 2: Run → FAIL.** `npm test -- permissions`
- [ ] **Step 3: POLICY** (ajouter dans `POLICY`) :
```ts
  // Media buyer
  media_buyer_board:  { module: "media_buyer", verb: "read" },
  media_buyer_upsert: { module: "media_buyer", verb: "write" },
  media_buyer_remove: { module: "media_buyer", verb: "delete" },
```
- [ ] **Step 4: Outils** (ajouter dans `TOOLS[]`) :
```ts
  // ───────────── Media buyer (cockpit Meta) ─────────────
  { name: 'media_buyer_board', description: "Board média Meta. level optionnel (creative|adset|campaign).", inputSchema: obj({ level: Sx.string }), run: (a) => cx().query(api.mediaBuyer.board, { level: a.level }) },
  {
    name: 'media_buyer_upsert', description: "Crée/maj une métrique d'annonce. level+name+spend requis ; id pour update ; campaign,adset,roas,cpa,ctr,hookRate,frequency,results,verdictOverride(scale|watch|kill).",
    inputSchema: obj({ id: Sx.string, level: Sx.string, name: Sx.string, campaign: Sx.string, adset: Sx.string, thumbUrl: Sx.string, periodFrom: Sx.string, periodTo: Sx.string, spend: Sx.number, roas: Sx.number, cpa: Sx.number, ctr: Sx.number, hookRate: Sx.number, frequency: Sx.number, results: Sx.number, verdictOverride: Sx.string, source: Sx.string }, ['level', 'name', 'spend']),
    run: (a) => cx().mutation(api.mediaBuyer.upsert, { id: a.id || undefined, level: a.level, name: a.name, campaign: a.campaign, adset: a.adset, thumbUrl: a.thumbUrl, periodFrom: a.periodFrom, periodTo: a.periodTo, spend: a.spend, roas: a.roas, cpa: a.cpa, ctr: a.ctr, hookRate: a.hookRate, frequency: a.frequency, results: a.results, verdictOverride: a.verdictOverride, source: a.source ?? 'agent' }),
    log: (a) => ({ eventType: 'media_buyer.upserted', summary: `Métrique Meta : ${a.name}`, entityType: 'meta_ad_metrics' }),
  },
  {
    name: 'media_buyer_remove', description: "Désactive une métrique (soft). id requis.",
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.mediaBuyer.remove, { id: a.id }),
    log: (a) => ({ eventType: 'media_buyer.removed', summary: 'Métrique Meta retirée', entityType: 'meta_ad_metrics', entityId: a.id }),
  },
```
- [ ] **Step 5: Run → PASS + typecheck.** `npm test -- permissions && npx tsc --noEmit`
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(dataos): outils MCP media-buyer"`

---

## Task 5: Outils MCP — onboarding

**Files:** `src/app/api/mcp/route.ts`, `convex/lib/permissions.ts`, `convex/lib/permissions.test.ts`

Mutations cibles : `api.onboarding.list()`, `api.onboarding.getByContact({contactId})`, `api.onboarding.getProgress({token})`, `api.onboarding.saveProgress({token,name?,state,contactId?})`, `api.onboarding.paymentsOverview()`.

- [ ] **Step 1: Test qui échoue**
```ts
it("onboarding tools mappés", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["onboarding_list", "onboarding:read"],
    ["onboarding_get_by_contact", "onboarding:read"],
    ["onboarding_payments_overview", "onboarding:read"],
    ["onboarding_save_progress", "onboarding:write"],
  ] as const) { expect(requiredScopeForCall(tool)?.scope).toBe(scope); expect(decide(granted, new Set(), scope)).toBe("execute") }
})
```
- [ ] **Step 2: Run → FAIL.** `npm test -- permissions`
- [ ] **Step 3: POLICY** :
```ts
  // Onboarding
  onboarding_list:               { module: "onboarding", verb: "read" },
  onboarding_get_by_contact:     { module: "onboarding", verb: "read" },
  onboarding_payments_overview:  { module: "onboarding", verb: "read" },
  onboarding_save_progress:      { module: "onboarding", verb: "write" },
```
- [ ] **Step 4: Outils** :
```ts
  // ───────────── Onboarding ─────────────
  { name: 'onboarding_list', description: 'Liste les onboardings clients.', inputSchema: obj({}), run: () => cx().query(api.onboarding.list, {}) },
  { name: 'onboarding_get_by_contact', description: "Onboarding d'un contact. contactId requis.", inputSchema: obj({ contactId: Sx.string }, ['contactId']), run: (a) => cx().query(api.onboarding.getByContact, { contactId: a.contactId }) },
  { name: 'onboarding_payments_overview', description: "Tour de contrôle paiements (échéances + remboursements, encaissé/attente).", inputSchema: obj({}), run: () => cx().query(api.onboarding.paymentsOverview, {}) },
  {
    name: 'onboarding_save_progress', description: "Crée/maj l'onboarding (paiements, étapes). token requis ; name, contactId, state (objet complet, inclut payment.amounts/paidStatus/paidDates/refunds).",
    inputSchema: obj({ token: Sx.string, name: Sx.string, contactId: Sx.string, state: { type: 'object' } }, ['token', 'state']),
    run: (a) => cx().mutation(api.onboarding.saveProgress, { token: a.token, name: a.name, contactId: a.contactId, state: a.state ?? {} }),
    log: (a) => ({ eventType: 'onboarding.saved', summary: `Onboarding maj : ${a.name ?? a.contactId ?? a.token}`, entityType: 'onboarding' }),
  },
```
- [ ] **Step 5: Run → PASS + typecheck.**
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(dataos): outils MCP onboarding"`

---

## Task 6: Outils MCP — closing + confirmation

**Files:** `src/app/api/mcp/route.ts`, `convex/lib/permissions.ts`, `convex/lib/permissions.test.ts`

Mutations cibles : `api.closing.upcomingCalls({scope?})`, `api.closing.saveCallNote({id,notes?,nextStep?})`, `api.confirmationIntake.create({fullName,email?,company?,companyType?,headcount?,monthlyRevenue?,costliestFunction?,repetitiveCost?,whyNow?,timing?,budget?,raw?})`, `api.confirmationIntake.listForContact({contactId?,email?})`, `api.confirmationIntake.linkToContact({id,contactId})`.

- [ ] **Step 1: Test qui échoue**
```ts
it("closing tools mappés", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["closing_upcoming_calls", "closing:read"],
    ["closing_save_call_note", "closing:write"],
    ["confirmation_list_for_contact", "closing:read"],
    ["confirmation_create", "closing:write"],
    ["confirmation_link", "closing:write"],
  ] as const) { expect(requiredScopeForCall(tool)?.scope).toBe(scope); expect(decide(granted, new Set(), scope)).toBe("execute") }
})
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: POLICY** :
```ts
  // Closing (prép R1/R2 + confirmation)
  closing_upcoming_calls:        { module: "closing", verb: "read" },
  closing_save_call_note:        { module: "closing", verb: "write" },
  confirmation_list_for_contact: { module: "closing", verb: "read" },
  confirmation_create:           { module: "closing", verb: "write" },
  confirmation_link:             { module: "closing", verb: "write" },
```
- [ ] **Step 4: Outils** :
```ts
  // ───────────── Closing / confirmation ─────────────
  { name: 'closing_upcoming_calls', description: "Calls à venir (prép R1/R2). scope optionnel: today|week|all.", inputSchema: obj({ scope: Sx.string }), run: (a) => cx().query(api.closing.upcomingCalls, { scope: a.scope }) },
  {
    name: 'closing_save_call_note', description: "Note de prép d'un call. id (os_sales_calls) requis ; notes, nextStep.",
    inputSchema: obj({ id: Sx.string, notes: Sx.string, nextStep: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.closing.saveCallNote, { id: a.id, notes: a.notes, nextStep: a.nextStep }),
    log: (a) => ({ eventType: 'closing.note_saved', summary: 'Note de call enregistrée', entityType: 'sales_call', entityId: a.id }),
  },
  { name: 'confirmation_list_for_contact', description: "Soumissions formulaire de confirmation d'un contact. contactId ou email.", inputSchema: obj({ contactId: Sx.string, email: Sx.string }), run: (a) => cx().query(api.confirmationIntake.listForContact, { contactId: a.contactId || undefined, email: a.email || undefined }) },
  {
    name: 'confirmation_create', description: "Enregistre une soumission de confirmation (auto-lien contact par email). fullName requis ; email,company,companyType,headcount,monthlyRevenue,costliestFunction,repetitiveCost,whyNow,timing,budget.",
    inputSchema: obj({ fullName: Sx.string, email: Sx.string, company: Sx.string, companyType: Sx.string, headcount: Sx.string, monthlyRevenue: Sx.string, costliestFunction: Sx.string, repetitiveCost: Sx.string, whyNow: Sx.string, timing: Sx.string, budget: Sx.string }, ['fullName']),
    run: (a) => cx().mutation(api.confirmationIntake.create, { fullName: a.fullName, email: a.email, company: a.company, companyType: a.companyType, headcount: a.headcount, monthlyRevenue: a.monthlyRevenue, costliestFunction: a.costliestFunction, repetitiveCost: a.repetitiveCost, whyNow: a.whyNow, timing: a.timing, budget: a.budget }),
    log: (a, r) => ({ eventType: 'confirmation.created', summary: `Confirmation : ${a.fullName}`, entityType: 'confirmation_intake', entityId: String((r as { id?: string })?.id ?? '') }),
  },
  {
    name: 'confirmation_link', description: "Lie une soumission de confirmation à un contact. id + contactId requis.",
    inputSchema: obj({ id: Sx.string, contactId: Sx.string }, ['id', 'contactId']),
    run: (a) => cx().mutation(api.confirmationIntake.linkToContact, { id: a.id, contactId: a.contactId }),
    log: (a) => ({ eventType: 'confirmation.linked', summary: 'Confirmation liée au contact', entityType: 'confirmation_intake', entityId: a.id }),
  },
```
- [ ] **Step 5: Run → PASS + typecheck.**
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(dataos): outils MCP closing + confirmation"`

---

## Task 7: Outils MCP — records (bibliothèque/records)

**Files:** `src/app/api/mcp/route.ts`, `convex/lib/permissions.ts`, `convex/lib/permissions.test.ts`

Mutations cibles : `api.recordNotes.list()`, `api.recordNotes.get({recordId})`, `api.recordNotes.patch({recordId,synthesis?,tags?,name?,linkedContactId?,linkedLeadId?})`, `api.recordNotes.remove({recordId})`.

- [ ] **Step 1: Test qui échoue**
```ts
it("records tools mappés", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["records_list", "records:read"], ["records_get", "records:read"],
    ["records_patch", "records:write"], ["records_remove", "records:delete"],
  ] as const) { expect(requiredScopeForCall(tool)?.scope).toBe(scope); expect(decide(granted, new Set(), scope)).toBe("execute") }
})
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: POLICY** :
```ts
  // Records (bibliothèque/records — méta des records)
  records_list:   { module: "records", verb: "read" },
  records_get:    { module: "records", verb: "read" },
  records_patch:  { module: "records", verb: "write" },
  records_remove: { module: "records", verb: "delete" },
```
- [ ] **Step 4: Outils** :
```ts
  // ───────────── Records (méta bibliothèque) ─────────────
  { name: 'records_list', description: 'Méta de tous les records (synthèse, tags, liens).', inputSchema: obj({}), run: () => cx().query(api.recordNotes.list, {}) },
  { name: 'records_get', description: 'Méta d\'un record. recordId requis.', inputSchema: obj({ recordId: Sx.string }, ['recordId']), run: (a) => cx().query(api.recordNotes.get, { recordId: a.recordId }) },
  {
    name: 'records_patch', description: 'Met à jour la méta d\'un record. recordId requis ; synthesis, tags[], name, linkedContactId, linkedLeadId.',
    inputSchema: obj({ recordId: Sx.string, synthesis: Sx.string, tags: Sx.strArr, name: Sx.string, linkedContactId: Sx.string, linkedLeadId: Sx.string }, ['recordId']),
    run: (a) => cx().mutation(api.recordNotes.patch, { recordId: a.recordId, synthesis: a.synthesis, tags: a.tags, name: a.name, linkedContactId: a.linkedContactId, linkedLeadId: a.linkedLeadId }),
    log: (a) => ({ eventType: 'record.updated', summary: 'Record mis à jour', entityType: 'record', entityId: a.recordId }),
  },
  {
    name: 'records_remove', description: 'Supprime la méta d\'un record. recordId requis.',
    inputSchema: obj({ recordId: Sx.string }, ['recordId']),
    run: (a) => cx().mutation(api.recordNotes.remove, { recordId: a.recordId }),
    log: (a) => ({ eventType: 'record.removed', summary: 'Record supprimé', entityType: 'record', entityId: a.recordId }),
  },
```
- [ ] **Step 5: Run → PASS + typecheck.**
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(dataos): outils MCP records"`

---

## Task 8: Outils MCP — library (data) + kb_docs

**Files:** `src/app/api/mcp/route.ts`, `convex/lib/permissions.ts`, `convex/lib/permissions.test.ts`

Mutations cibles : `api.library.list()`, `api.library.listFolders()`, `api.library.addLink({name,url,category?,folder?})`, `api.library.updateItem({id,name?,tags?,description?,assignedTo?,folder?,status?})`, `api.library.remove({id})`, `api.library.createFolder({name,parentPath?})`, `api.library.renameFolder({...})`, `api.library.deleteFolder({...})`, `api.osKbDocs.list()`, `api.osKbDocs.getByDocId({...})`, `api.osKbDocs.upsert({docId,title,body,status,owner?,validatedAt?,updatedBy?})`. (NB : `library.addFile` nécessite un storageId d'upload → upload non disponible côté agent, on l'omet.)

- [ ] **Step 1: Test qui échoue**
```ts
it("library + kb_docs tools mappés", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["library_list", "library:read"], ["library_folders_list", "library:read"],
    ["library_add_link", "library:write"], ["library_update_item", "library:write"],
    ["library_remove", "library:delete"], ["library_create_folder", "library:write"],
    ["kb_docs_list", "kb_docs:read"], ["kb_docs_upsert", "kb_docs:write"],
  ] as const) { expect(requiredScopeForCall(tool)?.scope).toBe(scope); expect(decide(granted, new Set(), scope)).toBe("execute") }
})
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: POLICY** :
```ts
  // Library (bibliothèque/data)
  library_list:          { module: "library", verb: "read" },
  library_folders_list:  { module: "library", verb: "read" },
  library_add_link:      { module: "library", verb: "write" },
  library_update_item:   { module: "library", verb: "write" },
  library_remove:        { module: "library", verb: "delete" },
  library_create_folder: { module: "library", verb: "write" },
  library_rename_folder: { module: "library", verb: "write" },
  library_delete_folder: { module: "library", verb: "delete" },
  // KB docs
  kb_docs_list:   { module: "kb_docs", verb: "read" },
  kb_docs_get:    { module: "kb_docs", verb: "read" },
  kb_docs_upsert: { module: "kb_docs", verb: "write" },
```
- [ ] **Step 4: Outils** :
```ts
  // ───────────── Library (data) + KB docs ─────────────
  { name: 'library_list', description: 'Liste les items de la bibliothèque (fichiers/liens).', inputSchema: obj({}), run: () => cx().query(api.library.list, {}) },
  { name: 'library_folders_list', description: 'Liste les dossiers de la bibliothèque.', inputSchema: obj({}), run: () => cx().query(api.library.listFolders, {}) },
  {
    name: 'library_add_link', description: 'Ajoute un lien. name + url requis ; category, folder.',
    inputSchema: obj({ name: Sx.string, url: Sx.string, category: Sx.string, folder: Sx.string }, ['name', 'url']),
    run: (a) => cx().mutation(api.library.addLink, { name: a.name, url: a.url, category: a.category, folder: a.folder }),
    log: (a, r) => ({ eventType: 'library.link_added', summary: `Lien : ${a.name}`, entityType: 'library_item', entityId: String(r) }),
  },
  {
    name: 'library_update_item', description: 'Met à jour un item. id requis ; name, tags[], description, assignedTo[], folder, status.',
    inputSchema: obj({ id: Sx.string, name: Sx.string, tags: Sx.strArr, description: Sx.string, assignedTo: Sx.strArr, folder: Sx.string, status: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.library.updateItem, { id: a.id, name: a.name, tags: a.tags, description: a.description, assignedTo: a.assignedTo, folder: a.folder, status: a.status }),
    log: (a) => ({ eventType: 'library.item_updated', summary: 'Item bibliothèque mis à jour', entityType: 'library_item', entityId: a.id }),
  },
  {
    name: 'library_remove', description: 'Supprime un item. id requis.',
    inputSchema: obj({ id: Sx.string }, ['id']),
    run: (a) => cx().mutation(api.library.remove, { id: a.id }),
    log: (a) => ({ eventType: 'library.item_removed', summary: 'Item bibliothèque supprimé', entityType: 'library_item', entityId: a.id }),
  },
  {
    name: 'library_create_folder', description: 'Crée un dossier. name requis ; parentPath optionnel.',
    inputSchema: obj({ name: Sx.string, parentPath: Sx.string }, ['name']),
    run: (a) => cx().mutation(api.library.createFolder, { name: a.name, parentPath: a.parentPath }),
    log: (a) => ({ eventType: 'library.folder_created', summary: `Dossier : ${a.name}`, entityType: 'library_folder' }),
  },
  {
    name: 'library_rename_folder', description: 'Renomme un dossier (path-based). Voir convex/library.ts:149 pour les args exacts (path, newName).',
    inputSchema: obj({ path: Sx.string, newName: Sx.string }, ['path', 'newName']),
    run: (a) => cx().mutation(api.library.renameFolder, { path: a.path, newName: a.newName }),
    log: (a) => ({ eventType: 'library.folder_renamed', summary: 'Dossier renommé', entityType: 'library_folder' }),
  },
  {
    name: 'library_delete_folder', description: 'Supprime un dossier (path-based). Voir convex/library.ts:176 pour les args exacts (path).',
    inputSchema: obj({ path: Sx.string }, ['path']),
    run: (a) => cx().mutation(api.library.deleteFolder, { path: a.path }),
    log: (a) => ({ eventType: 'library.folder_deleted', summary: 'Dossier supprimé', entityType: 'library_folder' }),
  },
  { name: 'kb_docs_list', description: 'Liste les docs de base de connaissance opérationnelle.', inputSchema: obj({}), run: () => cx().query(api.osKbDocs.list, {}) },
  { name: 'kb_docs_get', description: 'Récupère un KB doc par docId.', inputSchema: obj({ docId: Sx.string }, ['docId']), run: (a) => cx().query(api.osKbDocs.getByDocId, { docId: a.docId }) },
  {
    name: 'kb_docs_upsert', description: 'Crée/maj un KB doc. docId+title+body+status requis ; owner, validatedAt.',
    inputSchema: obj({ docId: Sx.string, title: Sx.string, body: Sx.string, status: Sx.string, owner: Sx.string, validatedAt: Sx.string }, ['docId', 'title', 'body', 'status']),
    run: (a, actor) => cx().mutation(api.osKbDocs.upsert, { docId: a.docId, title: a.title, body: a.body, status: a.status, owner: a.owner, validatedAt: a.validatedAt, updatedBy: actor }),
    log: (a) => ({ eventType: 'kb_doc.upserted', summary: `KB doc : ${a.title}`, entityType: 'kb_doc', entityId: a.docId }),
  },
```

- [ ] **Step 4b: Vérifier les args exacts de renameFolder/deleteFolder**

Run: `sed -n '149,200p' convex/library.ts`
Si les noms d'args diffèrent de `path`/`newName`, ajuster les deux outils ci-dessus en conséquence.

- [ ] **Step 5: Run → PASS + typecheck.** `npm test -- permissions && npx tsc --noEmit`
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(dataos): outils MCP library + kb_docs"`

---

## Task 9: Outils MCP — processes (écriture) + dossiers process

**Files:** `src/app/api/mcp/route.ts`, `convex/lib/permissions.ts`, `convex/lib/permissions.test.ts`

Mutations cibles : `api.processes.create({title,icon?,category?,subfolder?,linkedClientId?,assignedUserIds?})`, `api.processes.update({id,title?,icon?,blocks?,category?,subfolder?,linkedClientId?,assignedUserIds?})`, `api.processCategories.create({name})`, `api.processSubfolders.create({category,name})`. (`processes_list` existe déjà.)

- [ ] **Step 1: Test qui échoue**
```ts
it("processes write tools mappés", () => {
  const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
  for (const [tool, scope] of [
    ["processes_create", "processes:write"],
    ["processes_update", "processes:write"],
    ["process_category_create", "processes:write"],
    ["process_subfolder_create", "processes:write"],
  ] as const) { expect(requiredScopeForCall(tool)?.scope).toBe(scope); expect(decide(granted, new Set(), scope)).toBe("execute") }
})
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: POLICY** (le module `processes` existe déjà en read ; on ajoute le write) :
```ts
  processes_create:         { module: "processes", verb: "write" },
  processes_update:         { module: "processes", verb: "write" },
  process_category_create:  { module: "processes", verb: "write" },
  process_subfolder_create: { module: "processes", verb: "write" },
```
- [ ] **Step 4: Outils** :
```ts
  // ───────────── Process (écriture) ─────────────
  {
    name: 'processes_create', description: "Crée un process. title requis ; icon (lucide), category, subfolder, linkedClientId, assignedUserIds[].",
    inputSchema: obj({ title: Sx.string, icon: Sx.string, category: Sx.string, subfolder: Sx.string, linkedClientId: Sx.string, assignedUserIds: Sx.strArr }, ['title']),
    run: (a) => cx().mutation(api.processes.create, { title: a.title, icon: a.icon, category: a.category, subfolder: a.subfolder, linkedClientId: a.linkedClientId, assignedUserIds: a.assignedUserIds }),
    log: (a, r) => ({ eventType: 'process.created', summary: `Process : ${a.title}`, entityType: 'process', entityId: String(r) }),
  },
  {
    name: 'processes_update', description: "Met à jour un process. id requis ; title, icon, blocks[{type,text}], category, subfolder, linkedClientId, assignedUserIds[].",
    inputSchema: obj({ id: Sx.string, title: Sx.string, icon: Sx.string, blocks: { type: 'array', items: { type: 'object' } }, category: Sx.string, subfolder: Sx.string, linkedClientId: Sx.string, assignedUserIds: Sx.strArr }, ['id']),
    run: (a) => cx().mutation(api.processes.update, { id: a.id, title: a.title, icon: a.icon, blocks: a.blocks, category: a.category, subfolder: a.subfolder, linkedClientId: a.linkedClientId, assignedUserIds: a.assignedUserIds }),
    log: (a) => ({ eventType: 'process.updated', summary: 'Process mis à jour', entityType: 'process', entityId: a.id }),
  },
  {
    name: 'process_category_create', description: "Crée une catégorie de process. name requis.",
    inputSchema: obj({ name: Sx.string }, ['name']),
    run: (a) => cx().mutation(api.processCategories.create, { name: a.name }),
    log: (a) => ({ eventType: 'process.category_created', summary: `Catégorie : ${a.name}`, entityType: 'process_category' }),
  },
  {
    name: 'process_subfolder_create', description: "Crée un sous-dossier de process. category + name requis.",
    inputSchema: obj({ category: Sx.string, name: Sx.string }, ['category', 'name']),
    run: (a) => cx().mutation(api.processSubfolders.create, { category: a.category, name: a.name }),
    log: (a) => ({ eventType: 'process.subfolder_created', summary: `Sous-dossier : ${a.name}`, entityType: 'process_subfolder' }),
  },
```
- [ ] **Step 5: Run → PASS + typecheck.**
- [ ] **Step 6: Commit.** `git add -A && git commit -m "feat(dataos): outils MCP process (write + dossiers)"`

---

## Task 10: Frontière dev/code → Claude (règle de comportement agents)

But : empêcher les agents de coder / réparer leur propre infra ; router le technique vers Claude. Règle injectée dans les profils Hermes actifs.

**Files:**
- Create: `docs/agents/dev-code-boundary.md` (source de vérité de la règle, versionnée)

- [ ] **Step 1: Écrire la règle**

Créer `docs/agents/dev-code-boundary.md` :
```markdown
# Frontière dev/code (agents Data OS)

Tu OPÈRES le business dans le Data OS via tes outils MCP. Tu NE codes pas, tu NE
répares pas l'infra, les gateways, les scripts, ni le code du Data OS lui-même.

Quand une tâche exige du code, un fix technique, un déploiement, ou un effecteur
absent (ex : envoi d'email réel, intégration manquante) :
→ NE bricole pas. Écris une tâche claire et escalade à Claude/Thomas
  (tasks_create avec assigneeType='human', source='agent', priority selon impact),
  puis logge `ops.escalation` via activities_log avec le besoin précis.

Interdits explicites : modifier des fichiers du repo, redémarrer des services,
toucher aux tokens/credentials, "réparer" un autre agent. Ces actions remontent à Claude.
```

- [ ] **Step 2: Injecter la règle dans les profils Hermes actifs**

Pour chaque profil agent actif (`coo`→`orchestrator`, `agent-kb`, `agent-support-client`, `agent-operations`, `agent-analyse`, `agent-media-buyer`, `agent-debug` — vérifier les chemins réels sous `/root/.hermes/profiles/<p>-slack/`), ajouter le contenu de `docs/agents/dev-code-boundary.md` au `SOUL.md`/system prompt du profil (append, ne pas écraser). Préférer un append déterministe :
```bash
for P in orchestrator agent-kb agent-support-client agent-operations agent-analyse agent-media-buyer agent-debug; do
  D="/root/.hermes/profiles/${P}-slack"
  [ -d "$D" ] || D="/root/.hermes/profiles/${P}"
  [ -d "$D" ] || { echo "profil absent: $P"; continue; }
  { echo; echo "## Frontière dev/code"; cat /root/QOS/docs/agents/dev-code-boundary.md; } >> "$D/SOUL.md"
  echo "patché: $D/SOUL.md"
done
```

- [ ] **Step 3: Redémarrer les gateways concernés**

```bash
for P in orchestrator agent-kb agent-support-client agent-operations agent-analyse agent-media-buyer agent-debug; do
  XDG_RUNTIME_DIR=/run/user/0 systemctl --user restart "hermes-gateway-${P}-slack.service" 2>/dev/null && echo "restart $P" || echo "skip $P"
done
```
Expected: chaque service redémarre sans erreur (`systemctl --user is-active`).

- [ ] **Step 4: Vérifier l'acquisition**

Demander à un agent : « Peux-tu corriger le bug dans ton gateway ? » → réponse attendue : il refuse de coder et escalade à Claude (crée une tâche humaine), ne tente pas de patch.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/dev-code-boundary.md
git commit -m "feat(agents): frontière dev/code — les agents opèrent, Claude code"
```

---

## Task 11: Déploiement, re-seed des accès, vérification end-to-end

But : pousser le nouveau code MCP/permissions sur Convex+Vercel, donner les nouveaux scopes aux 7 agents **sans rotation de token**, et prouver la parité.

**Files:**
- Create: `convex/agentAccessSync.ts` (mutation interne de synchro des accès)

- [ ] **Step 1: Écrire la mutation de synchro des accès**

Créer `convex/agentAccessSync.ts` :
```ts
import { mutation } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE } from "./osLib"
import { FULL_GRANTS, SLUG_TO_ROLE, scopesFromGrants } from "./lib/permissions"

// Aligne os_agent_permissions ET les scopes des credentials existants sur FULL_GRANTS,
// SANS révoquer ni faire tourner les tokens (cred.tokenHash inchangé). requiresApproval
// suit APPROVAL_VERBS (vide) → 0 approval. Idempotent.
export const syncFullAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const { scopes } = scopesFromGrants(FULL_GRANTS)
    const agents = await ctx.db.query("os_agents").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
    let agentsTouched = 0, rowsUpserted = 0, credsUpdated = 0
    for (const a of agents) {
      if (!a.slug || !(a.slug in SLUG_TO_ROLE)) continue
      agentsTouched++
      const existing = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q: any) => q.eq("agentId", a._id as Id<"os_agents">)).collect()
      const byKey = new Map(existing.map((r: any) => [`${r.scope}:${r.level}`, r]))
      for (const g of FULL_GRANTS) {
        const key = `${g.scope}:${g.level}`
        const row = byKey.get(key)
        if (row) { await ctx.db.patch(row._id, { requiresApproval: g.requiresApproval }); byKey.delete(key) }
        else { await ctx.db.insert("os_agent_permissions", { agentId: a._id, scope: g.scope, level: g.level, requiresApproval: g.requiresApproval, resource: g.resource }); }
        rowsUpserted++
      }
      const creds = await ctx.db.query("os_agent_credentials").withIndex("by_agent", (q: any) => q.eq("agentId", a._id as Id<"os_agents">)).collect()
      for (const c of creds) { if (!c.revokedAt) { await ctx.db.patch(c._id, { scopes }); credsUpdated++ } }
    }
    return { ok: true, agentsTouched, rowsUpserted, credsUpdated, scopeCount: scopes.length }
  },
})
```

- [ ] **Step 2: Déployer le code sur Convex (standing-malamute-439)**

```bash
cd /root/QOS
CONVEX_DEPLOY_KEY="$(cat /root/.hermes/.convex_deploy_key)" npx convex deploy --yes
```
Expected: déploiement OK sur `standing-malamute-439` (vérifier la cible avant : `--dry-run` si doute, cf. mémoire `qos-convex-deploy`).

- [ ] **Step 3: Synchroniser les accès des 7 agents**

```bash
CONVEX_DEPLOYMENT=prod:standing-malamute-439 npx convex run agentAccessSync:syncFullAccess '{}'
```
Expected: `{ ok:true, agentsTouched:7, credsUpdated:7, scopeCount:<nouveau total> }`.

- [ ] **Step 4: Vérifier la matrice (0 approval, nouveaux scopes)**

```bash
CONVEX_DEPLOYMENT=prod:standing-malamute-439 npx convex run agentPermissions:getPermissionMatrix '{}' \
 | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));for(const a of d){const ap=a.permissions.filter(p=>p.requiresApproval).length;console.log(a.slug,"perms="+a.permissions.length,"approval="+ap,"tokens="+a.activeTokens)}'
```
Expected: chaque agent `approval=0`, `tokens=1`, `perms` = nouveau total (≈ +18 vs 49).

- [ ] **Step 5: Déployer le front (route MCP) sur Vercel**

```bash
cd /root/QOS && vercel --prod --yes
```
Expected: déploiement prod OK ; `GET https://data-os.vividflow.co/api/mcp` renvoie un `toolCount` augmenté.

- [ ] **Step 6: Smoke test — la liste d'outils contient les nouveaux**

```bash
curl -s https://data-os.vividflow.co/api/mcp | node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const want=["devis_create","media_buyer_upsert","onboarding_save_progress","confirmation_create","records_patch","library_add_link","kb_docs_upsert","processes_create"];console.log("toolCount=",d.toolCount);console.log("manquants=",want.filter(t=>!d.tools.includes(t)))'
```
Expected: `manquants= []`.

- [ ] **Step 7: Re-rejouer le test d'acceptation ancre**

```bash
TOKEN=$(node -e 'console.log(require("dotenv").config({path:"/root/.hermes/profiles/orchestrator/.env"}).parsed?.DATAOS_TOKEN||"")')
DATAOS_TOKEN="$TOKEN" node scripts/agent-e2e/anchor-lead-move.mjs
```
Expected: `OK ✅` (lead créé + déplacé en « En conversation », aucun pending).

- [ ] **Step 8: Smoke test d'un nouveau module (devis) bout-en-bout**

```bash
DATAOS_TOKEN="$TOKEN" node -e '
const URL="https://data-os.vividflow.co/api/mcp";const T=process.env.DATAOS_TOKEN;
fetch(URL,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${T}`},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"devis_create",arguments:{titre:"Devis E2E "+Date.now(),source:"agent-e2e"}}})}).then(r=>r.json()).then(j=>{if(j.error)throw new Error(JSON.stringify(j.error));console.log("devis_create OK:",j.result?.content?.[0]?.text)})'
```
Expected: renvoie un id de devis, pas d'erreur, pas de `pending`.

- [ ] **Step 9: Commit**

```bash
git add convex/agentAccessSync.ts
git commit -m "feat(dataos): syncFullAccess — aligne perms+scopes des agents sans rotation de token"
```

---

## Self-Review (rempli par l'auteur du plan)

**1. Spec coverage :**
- Bloc 1 (parité MCP) → Tasks 3-9 (devis, media-buyer, onboarding, closing, records, library/kb_docs, processes). Calendrier retiré (vue dérivée, déjà couverte). ✅
- Bloc 2 (zéro autorisation) → Task 1 + Task 11 step 3-4 (re-seed requiresApproval=false). ✅
- Bloc 3 (frontière dev/code) → Task 10. ✅
- Critère d'acceptation ancre → Task 2 + Task 11 step 7. ✅
- Modules admin hors MCP (équipe/intégrations/paramètres) → non ajoutés (respecté). ✅

**2. Placeholder scan :** Seuls `library_rename_folder`/`library_delete_folder` ont une étape de vérification d'args (4b) car non extraits intégralement ; tous les autres outils ont code + args complets. Acceptable (étape concrète, file:line fourni).

**3. Type consistency :** noms de scopes cohérents POLICY↔tests (`devis:write`, `media_buyer:read`, etc.) ; `syncFullAccess` réutilise `scopesFromGrants`/`FULL_GRANTS`/`SLUG_TO_ROLE` (exports réels de `permissions.ts`) ; verbe `delete` introduit comme nouveau niveau (cohérent avec `archive`, pas dans APPROVAL_VERBS vide → execute).

**4. Risque clé adressé :** tokens NON tournés (Task 11 step 1 patch `cred.scopes` en place) — évite le piège de rotation (mémoire `qos-slack-agents-wiring`).
