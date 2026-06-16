// Usage: DATAOS_TOKEN=dos_... node scripts/agent-e2e/anchor-lead-move.mjs
// Vérifie le critère d'acceptation ancre : tools/call leads_create puis pipeline_move
// vers stageId 'conversation' ("En conversation"), sans {status:'pending'}.
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
  const data = txt ? JSON.parse(txt) : j.result
  if (data && data.status === 'pending') throw new Error(`${name}: action coincée en pending (zéro-autorisation cassé)`)
  return data
}

const stamp = Date.now()
const created = await call('leads_create', { name: `E2E Test ${stamp}`, email: `e2e+${stamp}@vividflow.co`, source: 'agent-e2e' })
console.log('lead créé:', created)
const moved = await call('pipeline_move', { id: created.leadId, stageId: 'conversation', stageName: 'En conversation' })
console.log('lead déplacé:', moved)
console.log('OK ✅ — lead créé puis déplacé en "En conversation" sans pending')
