import { v } from "convex/values"
import { query } from "./_generated/server"

const COLORS = ['#FF4D00','#3462EE','#22c55e','#EFE347','#4A91A8','#EC4899','#8896AB','#F97316']

export const getMetrics = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const { from, to } = args
    const inPeriod = (isoOrDate: string) => {
      const d = isoOrDate.split('T')[0]
      return d >= from && d <= to
    }

    // ─── Source of truth: contacts ──────────────────────────────
    const allContacts = await ctx.db.query("crm_contacts").collect()
    const contactById = new Map(allContacts.map(c => [c._id.toString(), c]))

    // ─── Clients = pipeline_clients (1 row = 1 client with deal value) ──
    const allClients   = await ctx.db.query("pipeline_clients").collect()
    const periodClients = allClients.filter(c => inPeriod(c.createdAt))
    const clientsCount  = periodClients.length
    const caEncaisse    = periodClients.reduce((s, c) => s + (c.value ?? 0), 0)

    // ─── Leads = active (open) leads in the Leads pipeline ──────
    const allLeads    = await ctx.db.query("crm_leads").collect()
    const periodLeads = allLeads.filter(l => l.status !== 'lost' && inPeriod(l.createdAt))
    const leadsCount  = periodLeads.length

    // ─── R1 / R2 = distinct leads that entered those stages in period ──
    const allHistory    = await ctx.db.query("lead_stage_history").collect()
    const periodHistory = allHistory.filter(h => h.enteredAt >= from && h.enteredAt <= to)
    const r1Count = new Set(periodHistory.filter(h => h.stageId === 'r1').map(h => h.leadId.toString())).size
    const r2Count = new Set(periodHistory.filter(h => h.stageId === 'r2').map(h => h.leadId.toString())).size

    // ─── Client timeline (per day, count + CA) ──────────────────
    const dayCount = new Map<string, number>()
    const dayCA    = new Map<string, number>()
    for (const c of periodClients) {
      const key = c.createdAt.split('T')[0]
      dayCount.set(key, (dayCount.get(key) ?? 0) + 1)
      dayCA.set(key, (dayCA.get(key) ?? 0) + (c.value ?? 0))
    }
    const clientTimeline: { date: string; value: number; ca: number }[] = []
    for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      clientTimeline.push({ date: key, value: dayCount.get(key) ?? 0, ca: dayCA.get(key) ?? 0 })
    }

    // ─── Métier / Niche breakdown — SAME set as clientsCount ────
    // For each period client, resolve its contact's métier/niche (coherent with the count above)
    const metierMap = new Map<string, { count: number; niche: string; contacts: { name: string; company: string }[] }>()
    const nicheMap  = new Map<string, Map<string, { count: number; contacts: { name: string; company: string }[] }>>()
    for (const client of periodClients) {
      const contact = client.ghl_contact_id ? contactById.get(client.ghl_contact_id) : undefined
      const metier  = contact?.metier || 'Non renseigné'
      const niche   = contact?.niche  || 'Autre'
      const name    = client.name || (contact ? `${contact.firstName} ${contact.lastName ?? ''}`.trim() : '—')
      const company = client.company || contact?.companyName || ''

      // métier breakdown
      if (!metierMap.has(metier)) metierMap.set(metier, { count: 0, niche, contacts: [] })
      const me = metierMap.get(metier)!
      me.count++; me.contacts.push({ name, company })

      // niche → métiers breakdown (for modal)
      if (!nicheMap.has(niche)) nicheMap.set(niche, new Map())
      const nm = nicheMap.get(niche)!
      if (!nm.has(metier)) nm.set(metier, { count: 0, contacts: [] })
      const nme = nm.get(metier)!
      nme.count++; nme.contacts.push({ name, company })
    }
    const total = clientsCount || 1
    const metierBreakdown = [...metierMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, d], i) => ({
        label, niche: d.niche, count: d.count,
        pct: Math.round((d.count / total) * 100),
        color: COLORS[i % COLORS.length],
        contacts: d.contacts,
      }))
    const nicheBreakdown = [...nicheMap.entries()].map(([niche, metiers]) => ({
      niche,
      metiers: [...metiers.entries()].map(([metier, md]) => ({ metier, count: md.count, contacts: md.contacts })),
    }))

    // ─── Recent activity = latest leads created (open + lost) ───
    const recentLeads = [...allLeads]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map(l => ({ id: l._id, name: l.name, stageId: l.status === 'lost' ? 'perdu' : l.stageId, createdAt: l.createdAt.split('T')[0], value: l.value, source: l.source ?? 'inbound' }))

    return {
      clientsCount, caEncaisse, leadsCount, r1Count, r2Count,
      clientTimeline, metierBreakdown, nicheBreakdown, recentLeads,
      totalContactsCount: allContacts.length,
    }
  },
})
