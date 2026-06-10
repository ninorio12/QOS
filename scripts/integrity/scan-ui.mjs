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
