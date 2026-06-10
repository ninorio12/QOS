// Indexe les dossiers mémoire RÉELS du VPS → public/memory-fs/ (déployable).
//   Second Brain : /home/hermes/vividflow-second-brain  (familles par sous-dossier, contenu .md/.txt bundlé)
//   GBrain       : /home/hermes/gbrain                  (fichiers .md récents, métadonnées + contenu récent)
// Lancer : node scripts/gen-memory-fs.mjs
import { promises as fs } from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('public/memory-fs')
const SB = '/home/hermes/vividflow-second-brain'
const GB = '/home/hermes/gbrain'
const EXCLUDE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

const SB_FAMILY = (seg) => {
  const s = (seg || '').toLowerCase()
  if (s === 'wiki') return 'Wiki'
  if (s === 'raw') return 'Raw'
  if (/archive/.test(s)) return 'Archives'
  if (/proof|preuve/.test(s)) return 'Preuves'
  if (/decision|décision/.test(s)) return 'Décisions'
  if (/note/.test(s)) return 'Notes'
  if (/compte|^cr$|rendu/.test(s)) return 'Comptes rendus'
  return 'Autres'
}

async function walk(dir, depth = 0) {
  const out = []
  let entries = []
  try { entries = await fs.readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name.startsWith('.') || EXCLUDE.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (depth < 6) out.push(...await walk(p, depth + 1)) }
    else if (/\.(md|txt|json)$/i.test(e.name)) out.push(p)
  }
  return out
}

const slug = (rel) => rel.replace(/\\/g, '/').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80)

await fs.rm(OUT, { recursive: true, force: true })
await fs.mkdir(path.join(OUT, 'sb'), { recursive: true })

// ── Second Brain ──
let sbIndex = []
try {
  const files = await walk(SB)
  for (const f of files) {
    const rel = path.relative(SB, f)
    const seg = rel.split(path.sep)[0]
    const st = await fs.stat(f)
    const id = slug(rel)
    const ext = path.extname(f).slice(1).toLowerCase()
    // contenu bundlé pour .md/.txt (cap 200 Ko)
    let hasContent = false
    if (/^(md|txt)$/.test(ext) && st.size < 200_000) {
      await fs.writeFile(path.join(OUT, 'sb', id + '.txt'), await fs.readFile(f, 'utf8')); hasContent = true
    }
    sbIndex.push({ id, name: path.basename(rel), family: SB_FAMILY(seg), path: 'vividflow-second-brain/' + rel.replace(/\\/g, '/'), ext, size: st.size, mtime: st.mtimeMs, hasContent })
  }
  sbIndex.sort((a, b) => b.mtime - a.mtime)
} catch { /* absent */ }

// ── GBrain (fichiers .md récents, cap 40) ──
let gbIndex = []
let gbExists = false
try {
  await fs.access(GB); gbExists = true
  const files = (await walk(GB)).filter(f => /\.md$/i.test(f))
  const withStat = []
  for (const f of files) { const st = await fs.stat(f); withStat.push({ f, st }) }
  withStat.sort((a, b) => b.st.mtimeMs - a.st.mtimeMs)
  await fs.mkdir(path.join(OUT, 'gb'), { recursive: true })
  for (const { f, st } of withStat.slice(0, 40)) {
    const rel = path.relative(GB, f); const id = slug(rel)
    let hasContent = false
    if (st.size < 200_000) { await fs.writeFile(path.join(OUT, 'gb', id + '.txt'), await fs.readFile(f, 'utf8')); hasContent = true }
    gbIndex.push({ id, name: path.basename(rel), path: 'gbrain/' + rel.replace(/\\/g, '/'), size: st.size, mtime: st.mtimeMs, hasContent })
  }
} catch { /* absent */ }

await fs.writeFile(path.join(OUT, 'second-brain.json'), JSON.stringify({ root: SB, count: sbIndex.length, files: sbIndex }, null, 0))
await fs.writeFile(path.join(OUT, 'gbrain.json'), JSON.stringify({ root: GB, exists: gbExists, count: gbIndex.length, files: gbIndex }, null, 0))

const sbFam = sbIndex.reduce((m, x) => ((m[x.family] = (m[x.family] || 0) + 1), m), {})
console.log(`✓ Second Brain: ${sbIndex.length} fichiers`, sbFam)
console.log(`✓ GBrain: ${gbExists ? gbIndex.length + ' fichiers récents indexés' : 'absent'}`)
