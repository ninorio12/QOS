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
