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
