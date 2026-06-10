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
