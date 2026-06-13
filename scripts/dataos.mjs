#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// dataos — CLI complet du VividFlow Data OS (Hermes Agent)
//
// Client universel du serveur MCP déployé sur data-os.vividflow.co/api/mcp.
// Auto-découvre les 56 outils (contacts, pipeline, leads, clients, sales calls,
// outreach, tâches, activités, mémoire, process, prospection, performance, état COO).
// Aucune dépendance (Node 18+, fetch natif). Sert au terminal, aux scripts et
// aux agents non-MCP. Reste toujours en phase avec le serveur (tools/list).
//
//   dataos state                          # vue COO complète (dataos_state)
//   dataos tools [filtre]                 # liste les outils
//   dataos describe contacts_create       # schéma d'un outil
//   dataos contacts_list                  # appel direct
//   dataos leads_create --name "Jean Dup" --email j@x.ch --value 5000
//   dataos call prospection_summary       # forme explicite
//   dataos prospection_summary --raw      # JSON brut
//
// Env :
//   DATAOS_URL    défaut https://data-os.vividflow.co/api/mcp
//   DATAOS_TOKEN  (ou HERMES_API_SECRET) — Bearer pour les écritures si verrouillé
// ───────────────────────────────────────────────────────────────────────────

const URL = process.env.DATAOS_URL || 'https://data-os.vividflow.co/api/mcp'
const TOKEN = process.env.DATAOS_TOKEN || process.env.HERMES_API_SECRET || ''

const C = process.stdout.isTTY
  ? { dim: s => `\x1b[2m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m`, g: s => `\x1b[32m${s}\x1b[0m`, c: s => `\x1b[36m${s}\x1b[0m`, y: s => `\x1b[33m${s}\x1b[0m`, r: s => `\x1b[31m${s}\x1b[0m` }
  : { dim: s => s, b: s => s, g: s => s, c: s => s, y: s => s, r: s => s }

function die(msg, code = 1) { console.error(C.r(msg)); process.exit(code) }

// Coerce une string en bool / number quand c'est sans ambiguïté.
function coerce(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null') return null
  if (/^-?\d+$/.test(v)) return Number(v)
  if (/^-?\d*\.\d+$/.test(v)) return Number(v)
  return v
}

// Parse `--key value`, `--key=value`, flags booléens, `--key` répété → tableau,
// `--json '{...}'` → fusionné. Renvoie { args, flags }.
function parseArgs(argv) {
  const args = {}
  const flags = { raw: false }
  for (let i = 0; i < argv.length; i++) {
    let tok = argv[i]
    if (!tok.startsWith('--')) { die(`Argument inattendu: ${tok}  (les arguments d'outil prennent la forme --clé valeur)`) }
    tok = tok.slice(2)
    if (tok === 'raw') { flags.raw = true; continue }
    if (tok === 'url') { flags.url = argv[++i]; continue }
    let key, val
    const eq = tok.indexOf('=')
    if (eq !== -1) { key = tok.slice(0, eq); val = tok.slice(eq + 1) }
    else {
      key = tok
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) val = true        // flag booléen
      else { val = argv[++i] }
    }
    if (key === 'json') { Object.assign(args, JSON.parse(val)); continue }
    const cv = val === true ? true : coerce(val)
    if (key in args) { args[key] = [].concat(args[key], cv) }              // répété → tableau
    else args[key] = cv
  }
  return { args, flags }
}

async function rpc(method, params, urlOverride) {
  const headers = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  let res
  try {
    res = await fetch(urlOverride || URL, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
  } catch (e) { die(`Réseau: ${e.message}  (endpoint: ${urlOverride || URL})`) }
  if (!res.ok) die(`HTTP ${res.status} ${res.statusText}`)
  const json = await res.json()
  if (json.error) die(`RPC ${json.error.code}: ${json.error.message}`)
  return json.result
}

async function listTools(urlOverride) {
  const r = await rpc('tools/list', {}, urlOverride)
  return r.tools || []
}

// Le serveur renvoie le résultat encapsulé MCP { content:[{type:'text',text}] }.
// On déballe le JSON pour un affichage propre.
function unwrap(result) {
  const t = result?.content?.[0]?.text
  if (typeof t !== 'string') return result
  try { return JSON.parse(t) } catch { return t }
}

function out(data, raw) {
  if (raw) { process.stdout.write(JSON.stringify(data)); process.stdout.write('\n'); return }
  process.stdout.write(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
  process.stdout.write('\n')
}

function help() {
  console.log(`${C.b('dataos')} — CLI du VividFlow Data OS  ${C.dim('(' + URL + ')')}

${C.b('USAGE')}
  dataos <commande|outil> [--clé valeur ...] [--raw]

${C.b('COMMANDES')}
  ${C.c('state')}                      Vue COO complète (raccourci dataos_state)
  ${C.c('tools')} [filtre]             Liste les outils (filtre sur le nom)
  ${C.c('describe')} <outil>           Schéma d'entrée d'un outil
  ${C.c('call')} <outil> [--k v ...]   Appel explicite d'un outil
  ${C.c('<outil>')} [--k v ...]        Appel direct (ex: dataos contacts_list)

${C.b('FLAGS')}
  --json '{...}'   Passe l'objet d'arguments complet en JSON
  --raw            Sortie JSON brute (1 ligne, pour les scripts)
  --url <url>      Surcharge l'endpoint
  -h, --help

${C.b('EXEMPLES')}
  dataos state
  dataos tools prospection
  dataos describe leads_create
  dataos leads_create --name "Jean Dupont" --email jean@x.ch --value 5000
  dataos prospection_summary --raw
  dataos tasks_create --title "Relancer R1" --priority high

${C.b('ENV')}
  DATAOS_URL    endpoint MCP (défaut ${URL})
  DATAOS_TOKEN  / HERMES_API_SECRET — Bearer pour les écritures verrouillées`)
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help' || argv[0] === 'help') return help()

  // --url peut apparaître n'importe où
  const cmd = argv[0]
  const rest = argv.slice(1)

  if (cmd === 'tools') {
    const filter = rest.find(a => !a.startsWith('--'))
    const tools = await listTools()
    const shown = filter ? tools.filter(t => t.name.includes(filter)) : tools
    if (process.stdout.isTTY) {
      const w = Math.max(...shown.map(t => t.name.length))
      for (const t of shown) console.log(`${C.g(t.name.padEnd(w))}  ${C.dim(t.description)}`)
      console.log(C.dim(`\n${shown.length}/${tools.length} outils`))
    } else out(shown.map(t => ({ name: t.name, description: t.description })))
    return
  }

  if (cmd === 'describe') {
    const name = rest.find(a => !a.startsWith('--'))
    if (!name) die('Usage: dataos describe <outil>')
    const tools = await listTools()
    const t = tools.find(x => x.name === name)
    if (!t) die(`Outil inconnu: ${name}  (dataos tools)`)
    console.log(`${C.b(t.name)}\n${t.description}\n`)
    const props = t.inputSchema?.properties || {}
    const req = new Set(t.inputSchema?.required || [])
    if (Object.keys(props).length === 0) { console.log(C.dim('Aucun argument.')); return }
    for (const [k, v] of Object.entries(props)) {
      const type = v.type || (v.items ? `array<${v.items.type}>` : '?')
      console.log(`  ${C.c('--' + k)} ${C.dim(type)}${req.has(k) ? C.y('  (requis)') : ''}`)
    }
    return
  }

  // Forme explicite: `call <outil> ...`
  let toolName, toolArgv
  if (cmd === 'call') {
    toolName = rest.find(a => !a.startsWith('--'))
    if (!toolName) die('Usage: dataos call <outil> [--clé valeur ...]')
    toolArgv = rest.filter(a => a !== toolName)
  } else if (cmd === 'state') {
    toolName = 'dataos_state'; toolArgv = rest
  } else {
    // Forme directe: le 1er token est le nom d'outil
    toolName = cmd; toolArgv = rest
  }

  const { args, flags } = parseArgs(toolArgv)
  const result = await rpc('tools/call', { name: toolName, arguments: args }, flags.url)
  if (result?.isError) die(unwrap(result), 2)
  out(unwrap(result), flags.raw)
}

main().catch(e => die(e.stack || String(e)))
