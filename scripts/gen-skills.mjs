// Bibliothèque de skills réelle (VPS) → public/agentic-skills/ (index.json + un .md par skill).
// 3 familles : Nos skills / Skills importés / Skills Hermes (classées par chemin).
// Sources : /root/.claude/skills (nos skills + imports) puis /root/.hermes/skills (Hermes génériques).
// Lancer : node scripts/gen-skills.mjs
import { promises as fs } from 'node:fs'
import path from 'node:path'

// Profil actif COO/chief_of_staff en premier (skills internes), puis lib Hermes + repo Hermes.
const SOURCES = [
  { root: '/home/hermes/.hermes/profiles/chief_of_staff/skills', origin: 'profiles/chief_of_staff/skills' },
  { root: '/home/hermes/.hermes/skills', origin: 'skills' },
  { root: '/home/hermes/.hermes/hermes-agent/skills', origin: 'hermes-agent/skills' },
]
const OUT = path.resolve('public/agentic-skills')

function familyOf(rel, id) {
  const s = (rel + ' ' + id).toLowerCase()
  // 2. Importés = chemins imported-*
  if (/(^|[/])imported-/.test(s)) return 'Skills importés'
  // 1. Internes = profil chief_of_staff lié business/VividFlow/Brvndlab/jonathan/rafaela/COO
  if (/(^|[/])business[/]|vividflow|brvndlab|jonathan|rafaela|(^|[/-])coo([/-]|$)/.test(s)) return 'Skills internes'
  // 3. Natifs = génériques Hermes / système
  return 'Skills natifs'
}
function prettyCat(seg) {
  if (!seg) return ''
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { meta: {}, body: raw }
  const lines = m[1].split('\n')
  const meta = {}
  for (let i = 0; i < lines.length; i++) {
    const mm = lines[i].match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!mm) continue
    const key = mm[1]
    let val = mm[2].trim()
    // Scalaires bloc YAML multiline : >, >-, |, |- … → lire les lignes indentées suivantes
    if (/^[|>][+-]?$/.test(val)) {
      const fold = val[0] === '>'
      const collected = []
      let j = i + 1
      while (j < lines.length && (lines[j].trim() === '' || /^\s/.test(lines[j]))) {
        collected.push(lines[j].replace(/^\s{1,4}/, ''))
        j++
      }
      i = j - 1
      val = fold ? collected.join(' ').replace(/\s+/g, ' ').trim() : collected.join('\n').trim()
    } else {
      val = val.replace(/^["']|["']$/g, '')
    }
    meta[key] = val
  }
  return { meta, body: raw.slice(m[0].length) }
}

async function walk(dir) {
  const out = []
  let entries = []
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...await walk(p))
    else if (/^skill\.md$/i.test(e.name)) out.push(p)
  }
  return out
}

await fs.rm(OUT, { recursive: true, force: true })
await fs.mkdir(OUT, { recursive: true })

const index = []
const seen = new Set()
for (const src of SOURCES) {
  for (const file of await walk(src.root)) {
    const raw = await fs.readFile(file, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const rel = path.relative(src.root, file)
    const parts = rel.split(path.sep)
    let id = (meta.name || parts[parts.length - 2] || parts[0]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!id || seen.has(id)) { if (seen.has(id)) continue }
    seen.add(id)
    const family = familyOf(rel, id)
    const category = parts.length > 2 ? prettyCat(parts[0]) : ''
    // Nom : on garde le name du frontmatter verbatim (ex. "brainstorm-profond") sinon on embellit le slug.
    const name = meta.name ? meta.name.trim() : id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    let description = (meta.description || '').replace(/\s+/g, ' ').trim()
    if (description.length > 200) description = description.slice(0, 197) + '…'
    const tags = (meta.tags || '').replace(/[[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean)
    // Snapshot FIDÈLE = fichier intégral (frontmatter + corps, ordre exact). Sert de fallback ;
    // la lecture live du vrai fichier (sourcePath) est prioritaire à l'affichage.
    await fs.writeFile(path.join(OUT, id + '.md'), raw)
    index.push({ id, name, description, family, category, path: src.origin + '/' + rel.replace(/\\/g, '/'), sourcePath: file, tags })
  }
}

const FAM_ORDER = { 'Skills internes': 0, 'Skills importés': 1, 'Skills natifs': 2 }
index.sort((a, b) => (FAM_ORDER[a.family] - FAM_ORDER[b.family]) || a.name.localeCompare(b.name))
await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(index, null, 0))
const byFam = index.reduce((m, s) => ((m[s.family] = (m[s.family] || 0) + 1), m), {})
console.log(`✓ ${index.length} skills →`, byFam)
