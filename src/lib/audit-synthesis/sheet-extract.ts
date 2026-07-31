// Extracteur : Google Sheet d'audit VividFlow → objet DATA du livrable Profit Map.
// Lecture SANS auth via l'export gviz CSV par onglet (le sheet doit être « accessible via le lien »).
// Renvoie null si illisible → le caller retombe sur les données par défaut (Bold Shift).
//
// ⚠️ Draft : les onglets structurés (Contexte, Rôles/tâches, Process, Opportunités) s'extraient
// proprement ; la feuille de route (§3) et la chaîne de valeur (Annexe A) viennent de cellules
// libres et restent à polir. Mapping documenté dans PROFIT-MAP-SPEC.md.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function extractSheetId(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (m) return m[1]
  const t = url.trim()
  return /^[a-zA-Z0-9-_]{20,}$/.test(t) ? t : null
}

// CSV → 2D array (gère guillemets, virgules et retours ligne dans les cellules).
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

async function fetchTab(id: string, names: string[]): Promise<string[][] | null> {
  for (const name of names) {
    const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) continue
      const txt = await res.text()
      if (txt.trimStart().startsWith('<')) continue // page HTML = non public / mauvais onglet
      const grid = parseCsv(txt)
      if (grid.length) return grid
    } catch { /* onglet suivant */ }
  }
  return null
}

const norm = (s: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const cell = (g: string[][], r: number, c: number) => (g[r]?.[c] ?? '').trim()
const num = (s: string) => { const n = parseFloat((s ?? '').replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? 0 : n }
const round1 = (n: number) => Math.round(n * 10) / 10
function findRowContains(g: string[][], needle: string): number {
  const t = norm(needle)
  return g.findIndex(r => norm(r[0] ?? '').includes(t))
}
// Normalise une réponse tri-valeur (Oui / Non / À creuser…)
function tri(s: string): string {
  const n = norm(s)
  if (n.startsWith('oui')) return 'Oui'
  if (n.startsWith('non')) return 'Non'
  if (!s.trim()) return 'Non'
  return 'À creuser'
}
// Découpe une cellule libre en liste (retours ligne, puces, « ; », numérotation).
function splitList(s: string): string[] {
  if (!s) return []
  return s.split(/\n|;|•|•|(?:^|\s)\d+[.)]\s+/).map(x => x.trim().replace(/^[-–*]\s*/, '')).filter(x => x.length > 1)
}
function monthYear(): string {
  // Sans Date fiable côté worker on garde un libellé neutre ; le mois est posé à la génération.
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const d = new Date()
  return `${mois[d.getMonth()]} ${d.getFullYear()}`.replace(/^./, c => c.toUpperCase())
}

export async function extractProfitMapData(sheetUrl: string): Promise<any | null> {
  const id = extractSheetId(sheetUrl)
  if (!id) return null

  const ctx = await fetchTab(id, ['1 - Contexte', '1 – Contexte'])
  const biz = await fetchTab(id, ['2 - Carte business', '2 – Carte business'])
  const roles = await fetchTab(id, ['3 - Rôles et tâches', '3 – Rôles et tâches', '3 - Roles et taches'])
  const proc = await fetchTab(id, ['4 - Process et data', '4 – Process et data', '4 - Process & data'])
  const opp = await fetchTab(id, ['5 - Opportunités IA', '5 – Opportunités IA', '5 - Opportunites IA'])
  const cdc = await fetchTab(id, ['6 - Synthèse CDC', '6 – Synthèse CDC', '6 - Synthese CDC'])

  if (!roles && !ctx) return null

  // ── Contexte ──
  const contexte: [string, string][] = []
  if (ctx) for (let r = 0; r < ctx.length; r++) {
    const label = cell(ctx, r, 0), val = cell(ctx, r, 1)
    if (!label || !val) continue
    if (/mode d.utilisation|^champ$|contexte client/.test(norm(label))) continue
    contexte.push([label, val])
  }
  const ctxVal = (needle: string) => (contexte.find(([l]) => norm(l).includes(norm(needle))) ?? ['', ''])[1]
  const clientName = ctxVal('client') || ctxVal('societe') || 'Client'
  const sector = ctxVal('secteur') || ctxVal('niche') || ''

  // ── Rôles & tâches (section B) ──
  const tasks: any[] = []
  let founder = ''
  if (roles) {
    for (let r = 0; r < roles.length; r++) {
      const person = cell(roles, r, 2)
      const blob = norm(person + ' ' + cell(roles, r, 3))
      if (person && /(ceo|dirigeant|fondat|gerant|founder|owner)/.test(blob)) { founder = person; break }
    }
    let hb = roles.findIndex(r => /id role|id rôle/.test(norm(r[0] ?? '')))
    // heuristique : le 2e header (section B tâches) ; sinon on cherche « tâche » dans la ligne
    if (hb < 0) hb = roles.findIndex(r => r.some(c => norm(c) === 'tache' || norm(c) === 'tâche'))
    if (hb >= 0) {
      for (let r = hb + 1; r < roles.length; r++) {
        const task = cell(roles, r, 3)          // D = Tâche
        if (!task || !/^r\d+/i.test(cell(roles, r, 0))) continue
        tasks.push({
          t: task,
          min: num(cell(roles, r, 4)),
          h: round1(num(cell(roles, r, 6))),    // G = H/mois auto
          e: Math.round(num(cell(roles, r, 8))),// I = Coût/mois auto
          rep: tri(cell(roles, r, 9)),          // J = Répétitif ?
          gou: tri(cell(roles, r, 10)),         // K = Goulot ?
          auto: tri(cell(roles, r, 11)),        // L = Automatisable ?
        })
      }
    }
    tasks.sort((a, b) => b.e - a.e)
  }
  if (!tasks.length) return null

  // ── Process & data (Annexe C) ──
  const procdata: string[][] = []
  if (proc) {
    const h = findRowContains(proc, 'process')
    for (let r = (h >= 0 ? h + 1 : 1); r < proc.length; r++) {
      const p = cell(proc, r, 0)
      if (!p || /mode d.utilisation|process et data/.test(norm(p))) continue
      const qual = cell(proc, r, 4)
      if (/faible \/ moyenne \/ bonne/.test(norm(qual))) continue // ligne légende
      procdata.push([p, cell(proc, r, 3), qual, cell(proc, r, 5), cell(proc, r, 7), cell(proc, r, 8)])
    }
  }

  // ── Opportunités IA (Annexe D) ──
  const opps: any[] = []
  if (opp) {
    const h = opp.findIndex(r => /probleme|problème|money leak/.test(norm(r[0] ?? '')))
    for (let r = (h >= 0 ? h + 1 : 1); r < opp.length; r++) {
      const p = cell(opp, r, 0)
      if (!p || /^exemple/.test(norm(p)) || /mode d.utilisation|opportunites ia/.test(norm(p))) continue
      opps.push({
        p, ag: cell(opp, r, 2), gain: cell(opp, r, 3),
        i: num(cell(opp, r, 4)), f: num(cell(opp, r, 5)), ef: num(cell(opp, r, 6)),
        score: num(cell(opp, r, 7)) || (num(cell(opp, r, 4)) + num(cell(opp, r, 5)) + num(cell(opp, r, 6))),
        phase: cell(opp, r, 8) || 'Phase 1',
        dec: cell(opp, r, 9) || 'À l’étude',
      })
    }
  }

  // ── Carte business → business + funnel (Annexe A, best effort) ──
  const business: [string, string][] = []
  if (biz) for (let r = 0; r < biz.length; r++) {
    const bloc = cell(biz, r, 0)
    if (!bloc || /mode d.utilisation|carte business|^bloc$|lien lucid/.test(norm(bloc))) continue
    const note = cell(biz, r, 3) || cell(biz, r, 1)
    if (note) business.push([bloc, note])
  }
  const funnel = business.filter(([b]) => !/outils/.test(norm(b))).map(([t, n]) => ({ t, tool: '', n }))

  // ── Synthèse CDC (§3, cellules libres → listes) ──
  const syn = (needle: string) => { const i = cdc ? findRowContains(cdc, needle) : -1; return i >= 0 ? cell(cdc!, i, 1) : '' }
  const top3leaks = splitList(syn('top 3 money leaks')).slice(0, 3)

  // ── Priorités VividFlow (standard, client substitué) ──
  const priorities = [
    { t: 'Centralisation des données (micro-SaaS)', d: 'Consolidation de tous les outils sur une source unique, via le Data OS' },
    { t: 'Intégration agentique avec la mémoire métier', d: `Un agent qui comprend et exploite le contexte métier de ${clientName}` },
    { t: 'Reporting en continu', d: 'Analyse et pilotage en temps réel depuis le Data OS' },
  ]

  const synth = {
    p1_prio: splitList(syn('systèmes') || syn('agents phase 1')),
    p1_qw: splitList(syn('quick win')),
    p2_prio: [] as string[],
    controle: splitList(syn('validation humaine') || syn('rester en validation')),
    accompagnement: '',
    access: syn('acces a demander') || syn('accès à demander'),
    next: syn('prochaine decision') || syn('prochaine décision') || syn('next step'),
  }

  return {
    client: { name: clientName, founder, sector, date: monthYear() },
    contexte, funnel, business, tasks, top3leaks, procdata, opps, priorities, synth,
  }
}
