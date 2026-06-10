# Vérificateur d'intégrité (Vague 0) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le vérificateur d'intégrité du Data OS — une carte des invariants + deux scanners (données : orphelins & désync ; UI : boutons/routes morts) — qui rend l'audit répétable et sert de test de réception aux vagues suivantes.

**Architecture:** Des scripts `node` ESM (`.mjs`) sous `scripts/integrity/`, suivant la convention existante du repo (`scripts/*.mjs`). La logique de vérification est **pure** (entrées → violations) et testée avec le runner intégré de Node 20 (`node --test`, zéro config). La lecture des données Convex se fait en **lecture seule** via les `list` queries déjà déployées (ConvexHttpClient), donc **aucun déploiement** sur le backend partagé. Le scanner UI fait de l'analyse statique de `src/`.

**Tech Stack:** Node 20 ESM (`.mjs`), `node:test`/`node:assert`, `convex/browser` (ConvexHttpClient, lecture seule), `node:fs`.

**Périmètre :** Vague 0 uniquement. Les Vagues 1-5 (couper le mort, cœur Convex, intégrations, agentique, balayage) feront chacune leur propre plan. Voir le spec `docs/superpowers/specs/2026-06-11-convex-single-source-of-truth-design.md` (§1bis : exécution chirurgicale).

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `scripts/integrity/check.mjs` | Fonctions **pures** de vérification : `checkReferential`, `checkConsistency`. |
| `scripts/integrity/check.test.mjs` | Tests unitaires (`node --test`) de `check.mjs` sur fixtures. |
| `scripts/integrity/invariant-map.mjs` | La **carte des invariants** : règles référentielles + cohérence (seedées par le corpus d'audit). |
| `scripts/integrity/load.mjs` | Lecture seule des tables Convex via les `list` queries existantes (ConvexHttpClient). |
| `scripts/integrity/scan-data.mjs` | Entrypoint : charge les tables, applique la carte, imprime le rapport orphelins+désync. |
| `scripts/integrity/scan-ui.mjs` | Analyse statique : `findDeadUi` (pur) + parcours de `src/` ; routes/boutons morts + valeurs sourcées localStorage. |
| `scripts/integrity/scan-ui.test.mjs` | Tests unitaires de `findDeadUi` sur fixtures. |
| `scripts/integrity/extract-candidates.mjs` | Étape 0.0 : extrait des invariants **candidats** du schéma + grep UI (aide à compléter la carte). |
| `scripts/integrity/README.md` | Mode d'emploi + signification des sorties. |

Convention de retour commune (une **violation**) :
```js
// { rule: string, kind: 'ref'|'consistency'|'ui', table?: string, id?: string,
//   field?: string, expected?: any, observed?: any, file?: string, line?: number, reason: string }
```

---

## Task 1 : Vérification référentielle (pur, TDD)

**Files:**
- Create: `scripts/integrity/check.mjs`
- Test: `scripts/integrity/check.test.mjs`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/integrity/check.test.mjs` :
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkReferential } from './check.mjs'

test('checkReferential : signale une valeur qui ne pointe vers aucune cible', () => {
  const rows = [
    { _id: 'p1', contactId: 'c1' },   // ok
    { _id: 'p2', contactId: 'cX' },   // orphelin
    { _id: 'p3', contactId: null },   // optionnel absent → ignoré
  ]
  const targetIds = new Set(['c1', 'c2'])
  const rule = { id: 'paiement.contactId→crm_contacts', kind: 'ref', table: 'paiements', field: 'contactId', target: 'crm_contacts' }
  const out = checkReferential(rows, targetIds, rule)
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 'p2')
  assert.equal(out[0].kind, 'ref')
  assert.equal(out[0].rule, 'paiement.contactId→crm_contacts')
  assert.match(out[0].reason, /crm_contacts/)
})

test('checkReferential : required=true signale aussi les valeurs nulles', () => {
  const rows = [{ _id: 'x1', leadId: null }]
  const rule = { id: 'r', kind: 'ref', table: 't', field: 'leadId', target: 'crm_leads', required: true }
  const out = checkReferential(rows, new Set(), rule)
  assert.equal(out.length, 1)
  assert.match(out[0].reason, /manquant/)
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `node --test scripts/integrity/check.test.mjs`
Expected: FAIL — `Cannot find module ... check.mjs` (le fichier n'existe pas encore).

- [ ] **Step 3 : Écrire l'implémentation minimale**

Créer `scripts/integrity/check.mjs` :
```js
// Fonctions PURES de vérification d'intégrité. Aucune I/O ici (testable en isolation).
const idOf = (row) => row._id ?? row.id

// Référentiel : chaque row[field] non-null doit exister dans targetIds.
// Si rule.required, une valeur nulle/absente est aussi une violation.
export function checkReferential(rows, targetIds, rule) {
  const out = []
  for (const row of rows) {
    const value = row[rule.field]
    if (value == null) {
      if (rule.required) {
        out.push({ rule: rule.id, kind: 'ref', table: rule.table, id: idOf(row), field: rule.field, observed: null, reason: `champ requis manquant` })
      }
      continue
    }
    if (!targetIds.has(value)) {
      out.push({ rule: rule.id, kind: 'ref', table: rule.table, id: idOf(row), field: rule.field, observed: value, reason: `cible absente dans ${rule.target}` })
    }
  }
  return out
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `node --test scripts/integrity/check.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/integrity/check.mjs scripts/integrity/check.test.mjs
git commit -m "feat(integrity): vérification référentielle pure (orphelins)"
```

---

## Task 2 : Vérification de cohérence / dérivation (pur, TDD)

**Files:**
- Modify: `scripts/integrity/check.mjs` (ajouter `checkConsistency`)
- Modify: `scripts/integrity/check.test.mjs` (ajouter des tests)

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin de `scripts/integrity/check.test.mjs` :
```js
import { checkConsistency } from './check.mjs'

test('checkConsistency : signale un enfant dont la valeur dérivée diverge du parent', () => {
  // Cas Yasmine : lead en stage actif "r2" mais contact "perdu".
  const leads = [
    { _id: 'l1', contactId: 'c1', stageId: 'r2' },   // contact perdu → incohérent
    { _id: 'l2', contactId: 'c2', stageId: 'r2' },   // contact actif → ok
    { _id: 'l3', contactId: 'cX', stageId: 'r2' },   // parent absent → ignoré ici (job du référentiel)
  ]
  const parentById = new Map([
    ['c1', { _id: 'c1', statut: 'perdu' }],
    ['c2', { _id: 'c2', statut: 'client' }],
  ])
  const rule = {
    id: 'crm_leads.stage↔contact.statut', kind: 'consistency', table: 'crm_leads', via: 'contactId',
    parentTable: 'crm_contacts',
    ok: (lead, contact) => !(contact.statut === 'perdu' && lead.stageId !== 'perdu'),
    describe: (lead, contact) => `lead en stage "${lead.stageId}" mais contact statut "${contact.statut}"`,
  }
  const out = checkConsistency(leads, parentById, rule)
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 'l1')
  assert.equal(out[0].kind, 'consistency')
  assert.match(out[0].reason, /perdu/)
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `node --test scripts/integrity/check.test.mjs`
Expected: FAIL — `checkConsistency is not a function` / export manquant.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Ajouter à `scripts/integrity/check.mjs` :
```js
// Cohérence : pour chaque enfant, on résout son parent via rule.via, puis on
// vérifie rule.ok(enfant, parent). Un parent absent est ignoré (c'est le rôle
// d'une règle référentielle), pas une désync.
export function checkConsistency(rows, parentById, rule) {
  const out = []
  for (const row of rows) {
    const pid = row[rule.via]
    if (pid == null) continue
    const parent = parentById.get(pid)
    if (!parent) continue
    if (!rule.ok(row, parent)) {
      out.push({ rule: rule.id, kind: 'consistency', table: rule.table, id: idOf(row), reason: rule.describe(row, parent) })
    }
  }
  return out
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `node --test scripts/integrity/check.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/integrity/check.mjs scripts/integrity/check.test.mjs
git commit -m "feat(integrity): vérification de cohérence/dérivation (désync)"
```

---

## Task 3 : La carte des invariants (seedée par l'audit)

**Files:**
- Create: `scripts/integrity/invariant-map.mjs`
- Test: `scripts/integrity/invariant-map.test.mjs`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/integrity/invariant-map.test.mjs` :
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REFERENTIAL, CONSISTENCY, ALL_TABLES } from './invariant-map.mjs'

test('la carte contient les règles seedées par l\'audit', () => {
  const refIds = REFERENTIAL.map(r => r.id)
  assert.ok(refIds.includes('pipeline_clients.ghl_contact_id→crm_contacts'), 'relique GHL surveillée')
  assert.ok(refIds.includes('crm_leads.contactId→crm_contacts'))
  // chaque règle a les champs requis
  for (const r of REFERENTIAL) {
    assert.ok(r.id && r.table && r.field && r.target, `règle ref incomplète: ${JSON.stringify(r)}`)
  }
})

test('chaque règle de cohérence expose ok() et describe()', () => {
  for (const r of CONSISTENCY) {
    assert.equal(typeof r.ok, 'function', `ok() manquant: ${r.id}`)
    assert.equal(typeof r.describe, 'function', `describe() manquant: ${r.id}`)
    assert.ok(r.via && r.table && r.parentTable, `règle consistency incomplète: ${r.id}`)
  }
})

test('ALL_TABLES couvre toutes les tables référencées par les règles', () => {
  for (const r of REFERENTIAL) {
    assert.ok(ALL_TABLES.includes(r.table), `table source manquante: ${r.table}`)
    assert.ok(ALL_TABLES.includes(r.target), `table cible manquante: ${r.target}`)
  }
  for (const r of CONSISTENCY) {
    assert.ok(ALL_TABLES.includes(r.table) && ALL_TABLES.includes(r.parentTable))
  }
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `node --test scripts/integrity/invariant-map.test.mjs`
Expected: FAIL — module `invariant-map.mjs` introuvable.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Créer `scripts/integrity/invariant-map.mjs` :
```js
// LA CARTE DES INVARIANTS — source de vérité de la cohérence du Data OS.
// Seedée par le corpus d'audit (docs/superpowers/specs/2026-06-10-audit-corpus.md).
// Étape 0.0 : enrichie via extract-candidates.mjs + passe de découverte.
//
// Règle référentielle : { id, table, field, target, required? } → field doit exister dans target.
// Règle de cohérence  : { id, table, via, parentTable, ok(child,parent), describe(child,parent) }.

// NB : 'osProspection' est un LIBELLÉ LOGIQUE (la table Convex réelle est prospection_records),
// chargé via api.osProspection.list. Les libellés ici doivent matcher les clés de TABLE_QUERY (Task 4).
// Pas de table "paiements" dans ce schéma (les paiements sont dérivés de pipeline_clients/onboarding) → pas de règle paiement en Vague 0.
export const REFERENTIAL = [
  { id: 'crm_leads.contactId→crm_contacts',            table: 'crm_leads',        field: 'contactId',      target: 'crm_contacts' },
  { id: 'pipeline_clients.ghl_contact_id→crm_contacts', table: 'pipeline_clients', field: 'ghl_contact_id', target: 'crm_contacts' },
  { id: 'osProspection.contactId→crm_contacts',        table: 'osProspection',    field: 'contactId',      target: 'crm_contacts' },
  { id: 'osProspection.leadId→crm_leads',              table: 'osProspection',    field: 'leadId',         target: 'crm_leads' },
]

export const CONSISTENCY = [
  {
    id: 'crm_leads.stage↔contact.statut',
    table: 'crm_leads', via: 'contactId', parentTable: 'crm_contacts',
    // Un contact "perdu" ne doit pas avoir un lead dans une étape active (ex. Yasmine en R2).
    ok: (lead, contact) => !(contact.statut === 'perdu' && lead.stageId !== 'perdu'),
    describe: (lead, contact) => `lead en stage "${lead.stageId}" alors que le contact est "${contact.statut}"`,
  },
]

// Libellés logiques à charger (toute source + toute cible). Doit rester en phase avec les règles
// ci-dessus ET avec les clés de TABLE_QUERY (Task 4).
export const ALL_TABLES = [
  'crm_contacts', 'crm_leads', 'pipeline_clients', 'osProspection',
]
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `node --test scripts/integrity/invariant-map.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add scripts/integrity/invariant-map.mjs scripts/integrity/invariant-map.test.mjs
git commit -m "feat(integrity): carte des invariants seedée par le corpus d'audit"
```

---

## Task 4 : Loader Convex (lecture seule) + table→query

**Files:**
- Create: `scripts/integrity/load.mjs`

> Pas de test unitaire : ce module fait de l'I/O réseau (lecture seule prod). Il est validé en intégration par `scan-data.mjs` (Task 5). Aucune écriture, aucun déploiement.

- [ ] **Step 1 : Vérifier l'URL Convex disponible**

Run: `grep -m1 NEXT_PUBLIC_CONVEX_URL .env.local`
Expected: une ligne `NEXT_PUBLIC_CONVEX_URL=https://standing-malamute-439.eu-west-1.convex.cloud`.

- [ ] **Step 2 : Écrire le loader**

Créer `scripts/integrity/load.mjs` :
```js
// Lecture SEULE des tables Convex via les list queries DÉJÀ déployées.
// Aucune écriture, aucun déploiement. Mappe nom de table → fonction api.<module>.list.
import { ConvexHttpClient } from 'convex/browser'
import { readFileSync } from 'node:fs'
import { api } from '../../convex/_generated/api.js'

function convexUrl() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return process.env.NEXT_PUBLIC_CONVEX_URL
  const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
  const m = env.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)
  if (!m) throw new Error('NEXT_PUBLIC_CONVEX_URL introuvable (env ou .env.local)')
  return m[1].trim().replace(/^"|"$/g, '')
}

// libellé logique → query list existante (lecture seule). Les clés doivent matcher
// ALL_TABLES / les tables des règles dans invariant-map.mjs.
export const TABLE_QUERY = {
  crm_contacts:     api.crm_contacts.list,
  crm_leads:        api.crm_leads.list,
  pipeline_clients: api.pipeline_clients.list,
  osProspection:    api.osProspection.list,   // lit la table prospection_records
}

// Charge les tables demandées. Retourne { [table]: rows[] }. Une table sans query connue lève une erreur explicite.
export async function loadTables(tableNames) {
  const client = new ConvexHttpClient(convexUrl())
  const result = {}
  for (const name of tableNames) {
    const q = TABLE_QUERY[name]
    if (!q) throw new Error(`Pas de list query connue pour la table "${name}" — l'ajouter à TABLE_QUERY (lecture seule).`)
    result[name] = await client.query(q, {})
  }
  return result
}
```

- [ ] **Step 3 : Vérifier que les queries existent réellement**

Run: `grep -l "export const list = query" convex/crm_contacts.ts convex/crm_leads.ts convex/pipeline_clients.ts convex/osProspection.ts`
Expected: les 4 fichiers listés (vérifiés présents au moment de la rédaction). Si un libellé ajouté plus tard n'a pas de `list` query, l'erreur explicite de `loadTables` l'indiquera ; soit on retire la règle, soit on ajoute une `list` (déploiement Convex — hors Vague 0, à coordonner). Ne PAS déployer maintenant.

- [ ] **Step 4 : Commit**

```bash
git add scripts/integrity/load.mjs
git commit -m "feat(integrity): loader Convex lecture seule (table→list query)"
```

---

## Task 5 : Entrypoint scan-data (orphelins + désync)

**Files:**
- Create: `scripts/integrity/scan-data.mjs`

- [ ] **Step 1 : Écrire l'entrypoint**

Créer `scripts/integrity/scan-data.mjs` :
```js
// Scanner d'intégrité des DONNÉES : applique la carte des invariants aux tables Convex (lecture seule).
// Usage : node scripts/integrity/scan-data.mjs   (exit 1 si au moins une violation)
import { loadTables } from './load.mjs'
import { checkReferential, checkConsistency } from './check.mjs'
import { REFERENTIAL, CONSISTENCY, ALL_TABLES } from './invariant-map.mjs'

const idOf = (row) => row._id ?? row.id

async function main() {
  const data = await loadTables(ALL_TABLES)
  const violations = []

  for (const rule of REFERENTIAL) {
    const rows = data[rule.table] ?? []
    const targetIds = new Set((data[rule.target] ?? []).map(idOf))
    violations.push(...checkReferential(rows, targetIds, rule))
  }

  for (const rule of CONSISTENCY) {
    const rows = data[rule.table] ?? []
    const parentById = new Map((data[rule.parentTable] ?? []).map(p => [idOf(p), p]))
    violations.push(...checkConsistency(rows, parentById, rule))
  }

  if (violations.length === 0) {
    console.log('✅ Intégrité données : 0 orphelin, 0 désync.')
    return
  }
  console.log(`❌ ${violations.length} violation(s) :\n`)
  for (const v of violations) {
    const where = `${v.table}/${v.id ?? '?'}${v.field ? '.' + v.field : ''}`
    console.log(`  [${v.kind}] ${v.rule}\n      → ${where} : ${v.reason}`)
  }
  process.exitCode = 1
}

main().catch(err => { console.error('Erreur scan-data:', err.message); process.exitCode = 2 })
```

- [ ] **Step 2 : Lancer le scanner en réel (lecture seule prod)**

Run: `node scripts/integrity/scan-data.mjs`
Expected: soit `✅ Intégrité données…`, soit une liste de violations (ex. la relique `pipeline_clients.ghl_contact_id` ou un lead Yasmine-like). **Toute sortie est valide** — le but est qu'il tourne sans erreur réseau/import. Si une `list` query manque, l'erreur explicite de `load.mjs` indique laquelle.

- [ ] **Step 3 : Commit**

```bash
git add scripts/integrity/scan-data.mjs
git commit -m "feat(integrity): entrypoint scan-data (orphelins + désync)"
```

---

## Task 6 : Scanner d'UI morte (routes/boutons/localStorage) (pur, TDD)

**Files:**
- Create: `scripts/integrity/scan-ui.mjs`
- Test: `scripts/integrity/scan-ui.test.mjs`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `scripts/integrity/scan-ui.test.mjs` :
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findDeadUi } from './scan-ui.mjs'

const knownRoutes = new Set(['/dashboard', '/contacts', '/pipeline'])

test('détecte href="#"', () => {
  const out = findDeadUi('a.tsx', '<a href="#">X</a>', knownRoutes)
  assert.ok(out.some(v => v.reason.includes('href="#"')))
})

test('détecte un onClick vide', () => {
  const out = findDeadUi('b.tsx', '<button onClick={() => {}}>X</button>', knownRoutes)
  assert.ok(out.some(v => v.reason.includes('handler vide')))
})

test('détecte une route inexistante dans router.push', () => {
  const out = findDeadUi('c.tsx', "router.push('/activites')", knownRoutes)
  assert.ok(out.some(v => v.reason.includes('route inexistante') && v.reason.includes('/activites')))
})

test('ne signale pas une route existante', () => {
  const out = findDeadUi('d.tsx', "router.push('/dashboard')", knownRoutes)
  assert.equal(out.filter(v => v.reason.includes('route inexistante')).length, 0)
})

test('signale une valeur affichée sourcée depuis localStorage', () => {
  const out = findDeadUi('e.tsx', "const source = localStorage.getItem('vividflow_contact_source') || 'inbound'", knownRoutes)
  assert.ok(out.some(v => v.reason.includes('localStorage')))
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run: `node --test scripts/integrity/scan-ui.test.mjs`
Expected: FAIL — module `scan-ui.mjs` introuvable.

- [ ] **Step 3 : Écrire l'implémentation minimale**

Créer `scripts/integrity/scan-ui.mjs` :
```js
// Scanner d'UI morte. Coeur PUR (findDeadUi) testable ; le parcours fichiers est en bas.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

// Analyse un fichier (texte) et retourne les éléments morts/suspects.
export function findDeadUi(file, text, knownRoutes) {
  const out = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const ln = i + 1
    if (/href\s*=\s*["']#["']/.test(line)) {
      out.push({ kind: 'ui', file, line: ln, reason: 'lien href="#" (ne mène nulle part)' })
    }
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*(\/\*.*?\*\/\s*)?\}\s*\}/.test(line)) {
      out.push({ kind: 'ui', file, line: ln, reason: 'bouton à handler vide' })
    }
    for (const m of line.matchAll(/(?:router\.push|href\s*=\s*)\(?["'](\/[A-Za-z0-9/_-]*)["']/g)) {
      const route = m[1].split('?')[0]
      // ignore les racines dynamiques évidentes
      if (route === '/' || route.includes('[')) continue
      if (!knownRoutes.has(route)) {
        out.push({ kind: 'ui', file, line: ln, reason: `route inexistante: ${route}` })
      }
    }
    if (/localStorage\.getItem\(/.test(line)) {
      out.push({ kind: 'ui', file, line: ln, reason: 'valeur sourcée depuis localStorage (à vérifier : doit dériver d\'une entité ?)' })
    }
  })
  return out
}

// --- Parcours fichiers (exécuté seulement en CLI) ---
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (['.tsx', '.ts', '.jsx', '.js'].includes(extname(p))) acc.push(p)
  }
  return acc
}

// Construit l'ensemble des routes existantes à partir de src/app/**/page.tsx.
export function knownRoutesFromApp(appDir) {
  const routes = new Set(['/'])
  for (const f of walk(appDir)) {
    if (!/[/\\]page\.tsx?$/.test(f)) continue
    let r = f.slice(appDir.length).replace(/[/\\]page\.tsx?$/, '')
    r = r.replace(/[/\\]\([^)]+\)/g, '')           // groupes (public)
    r = r.replace(/\\/g, '/')
    routes.add(r === '' ? '/' : r)
  }
  return routes
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ROOT = new URL('../../', import.meta.url).pathname
  const known = knownRoutesFromApp(join(ROOT, 'src/app'))
  const issues = []
  for (const f of walk(join(ROOT, 'src'))) {
    issues.push(...findDeadUi(f.slice(ROOT.length), readFileSync(f, 'utf8'), known))
  }
  if (issues.length === 0) console.log('✅ UI : 0 route/bouton mort détecté.')
  else {
    console.log(`❌ ${issues.length} signalement(s) UI :\n`)
    for (const v of issues) console.log(`  ${v.file}:${v.line} — ${v.reason}`)
    process.exitCode = 1
  }
}
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run: `node --test scripts/integrity/scan-ui.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5 : Lancer le scanner en réel**

Run: `node scripts/integrity/scan-ui.mjs`
Expected: une liste de signalements (routes mortes, `localStorage`, `href="#"`). Vérifier qu'il signale bien `/activites` et la lecture `localStorage` du badge source pipeline (calibration vs audit). Toute sortie non-erreur est valide.

- [ ] **Step 6 : Commit**

```bash
git add scripts/integrity/scan-ui.mjs scripts/integrity/scan-ui.test.mjs
git commit -m "feat(integrity): scanner UI morte (routes/boutons/localStorage)"
```

---

## Task 7 : Extracteur de candidats (étape 0.0) + cohérence d'API

**Files:**
- Create: `scripts/integrity/extract-candidates.mjs`

> Aide à *compléter* la carte des invariants : liste les liens candidats du schéma. Pas de test unitaire (utilitaire de génération, sortie lue par un humain).

- [ ] **Step 1 : Écrire l'extracteur**

Créer `scripts/integrity/extract-candidates.mjs` :
```js
// Étape 0.0 — extraction AUTOMATIQUE des liens candidats depuis le schéma Convex.
// Sortie = liste à trier à la main pour enrichir invariant-map.mjs.
// Usage : node scripts/integrity/extract-candidates.mjs
import { readFileSync } from 'node:fs'

const schema = readFileSync(new URL('../../convex/schema.ts', import.meta.url), 'utf8')

// Découpe naïve par table : "<name>: defineTable({ ... })".
const candidates = []
const tableRe = /(\w+):\s*defineTable\(\{/g
let m
const tableStarts = []
while ((m = tableRe.exec(schema))) tableStarts.push({ name: m[1], idx: m.index })
for (let i = 0; i < tableStarts.length; i++) {
  const { name, idx } = tableStarts[i]
  const end = i + 1 < tableStarts.length ? tableStarts[i + 1].idx : schema.length
  const body = schema.slice(idx, end)
  // refs typées : champ: v.id("table")
  for (const r of body.matchAll(/(\w+):\s*v\.(?:optional\(\s*)?v?\.?id\("(\w+)"\)/g)) {
    candidates.push({ type: 'ref-typé', table: name, field: r[1], target: r[2] })
  }
  // refs "molles" : champ se terminant par Id/contactId/clientId… en v.string()
  for (const r of body.matchAll(/(\w*[Ii]d):\s*v\.(?:optional\(\s*)?v?\.?string\(\)/g)) {
    if (r[1] === 'workspaceId' || r[1] === 'clerkUserId' || r[1] === 'id') continue
    candidates.push({ type: 'ref-molle', table: name, field: r[1], target: '???' })
  }
}

console.log(`# Liens candidats (${candidates.length}) — à trier dans invariant-map.mjs\n`)
for (const c of candidates) {
  console.log(`- [${c.type}] ${c.table}.${c.field} → ${c.target}`)
}
console.log('\nNB : les "ref-molle" avec target "???" sont les plus à risque (string non validé). Compléter la cible à la main, puis (si pertinent) typer en v.id() lors de la Vague 2.')
```

- [ ] **Step 2 : Lancer l'extracteur**

Run: `node scripts/integrity/extract-candidates.mjs`
Expected: une liste de candidats incluant `pipeline_clients.ghl_contact_id → ???`, `os_tasks.assigneeId → ???`, `os_activities.entityId → ???`, et les refs typées (`crm_leads.contactId → crm_contacts`). Confirme que l'auto-extraction repère bien les liens « mous » à risque.

- [ ] **Step 3 : Vérifier la cohérence de toute la suite de tests**

Run: `node --test scripts/integrity/`
Expected: PASS — tous les fichiers `*.test.mjs` verts (check, invariant-map, scan-ui).

- [ ] **Step 4 : Commit**

```bash
git add scripts/integrity/extract-candidates.mjs
git commit -m "feat(integrity): extracteur de liens candidats (étape 0.0)"
```

---

## Task 8 : README + script npm + calibration documentée

**Files:**
- Create: `scripts/integrity/README.md`
- Modify: `package.json` (ajout d'un script `integrity`)

- [ ] **Step 1 : Écrire le README**

Créer `scripts/integrity/README.md` :
```markdown
# Vérificateur d'intégrité du Data OS (Vague 0)

Rend l'audit répétable. Voir le spec `docs/superpowers/specs/2026-06-11-convex-single-source-of-truth-design.md`.

## Lancer
- Données (orphelins + désync, lecture seule prod) : `node scripts/integrity/scan-data.mjs`
- UI (routes/boutons/localStorage morts) : `node scripts/integrity/scan-ui.mjs`
- Tests unitaires de la logique : `node --test scripts/integrity/`
- Découvrir des liens candidats : `node scripts/integrity/extract-candidates.mjs`

## La carte des invariants
`invariant-map.mjs` est la source de vérité : 2 types de règles (référentiel = pas d'orphelin ; cohérence = pas de désync, ex. card pipeline source vs contact). Ajouter un lien dans le SaaS = ajouter sa règle ici.

## Calibration (0.2)
Le scanner doit retrouver les findings du corpus `docs/superpowers/specs/2026-06-10-audit-corpus.md`. S'il en rate, la carte est incomplète → l'enrichir via `extract-candidates.mjs` + revue.

## Lecture seule
`scan-data` lit la prod via les `list` queries déjà déployées. Aucune écriture, aucun déploiement Convex.
```

- [ ] **Step 2 : Ajouter le script npm**

Dans `package.json`, ajouter aux `scripts` la ligne `integrity` (après `"lint"`) :
```json
    "lint": "next lint",
    "integrity": "node --test scripts/integrity/ && node scripts/integrity/scan-ui.mjs && node scripts/integrity/scan-data.mjs",
```

- [ ] **Step 3 : Lancer la suite complète**

Run: `npm run integrity`
Expected: les tests passent, puis les deux scanners s'exécutent et impriment leurs rapports (UI puis données). La commande peut sortir en code ≠ 0 s'il reste des violations réelles — c'est attendu à ce stade (Vague 0 produit la liste, les Vagues suivantes corrigent).

- [ ] **Step 4 : Commit**

```bash
git add scripts/integrity/README.md package.json
git commit -m "docs(integrity): README + script npm run integrity"
```

---

## Self-review (rempli par l'auteur du plan)

- **Couverture spec §2 :** carte des invariants (Task 3), scanner données référentiel+cohérence (Tasks 1,2,5), scanner UI (Task 6), où ça vit / réutilisable (Task 8). ✓
- **Couverture spec §2.a (hub contact) :** la règle de cohérence `crm_leads.stage↔contact.statut` illustre la dérivation depuis le hub contact ; la carte est extensible (Task 7 extrait les candidats pour la compléter). ✓
- **Étape 0.0 (cartographie) :** extract-candidates (Task 7) = extraction auto ; la passe de découverte multi-agents reste une activité d'exécution qui enrichit `invariant-map.mjs` (documentée README). ✓
- **Étape 0.2 (calibration) :** documentée (README) + vérifications réelles aux Tasks 5 & 6 (le scanner doit retrouver `/activites`, le localStorage du badge source, la relique GHL). ✓
- **Chirurgical (§1bis) :** aucun déploiement Convex, lecture seule, scripts isolés sous `scripts/integrity/`, rien touché dans `src/` ni `convex/`. ✓
- **Pas de placeholder :** tout le code est complet ; commandes et sorties attendues explicites. ✓
- **Cohérence des types :** `checkReferential`/`checkConsistency` (signatures identiques entre check.mjs, tests, scan-data) ; forme « violation » commune ; `ALL_TABLES`/`TABLE_QUERY` alignés. ✓
