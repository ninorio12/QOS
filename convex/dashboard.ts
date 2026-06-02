import { v } from "convex/values"
import { query } from "./_generated/server"

export const getMetrics = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const { from, to } = args

    // ─── Pipeline Clients ───────────────────────────────────────
    const allClients = await ctx.db.query("pipeline_clients").collect()
    const periodClients = allClients.filter(c => c.createdAt >= from && c.createdAt <= to)
    const clientsCount = periodClients.length
    const caEncaisse   = periodClients.reduce((s, c) => s + (c.value ?? 0), 0)

    // ─── Leads ─────────────────────────────────────────────────
    const allLeads = await ctx.db.query("crm_leads").collect()
    const periodLeads = allLeads.filter(l => l.createdAt.split('T')[0] >= from && l.createdAt.split('T')[0] <= to)
    const leadsCount = periodLeads.length

    // ─── Stage counts from history ──────────────────────────────
    const allHistory = await ctx.db.query("lead_stage_history").collect()
    const periodHistory = allHistory.filter(h => h.enteredAt >= from && h.enteredAt <= to)
    const r1Count = new Set(periodHistory.filter(h => h.stageId === 'r1').map(h => h.leadId.toString())).size
    const r2Count = new Set(periodHistory.filter(h => h.stageId === 'r2').map(h => h.leadId.toString())).size

    // ─── Client timeline (daily cumulative) ────────────────────
    const dayMap = new Map<string, number>()
    for (const c of allClients) {
      const d = c.createdAt
      if (d >= from && d <= to) dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
    }
    // Fill days with 0 if missing
    const clientTimeline: { date: string; value: number; ca: number }[] = []
    const start = new Date(from); const end = new Date(to)
    const caMap = new Map<string, number>()
    for (const c of allClients) {
      if (c.createdAt >= from && c.createdAt <= to) caMap.set(c.createdAt, (caMap.get(c.createdAt) ?? 0) + (c.value ?? 0))
    }
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      clientTimeline.push({ date: key, value: dayMap.get(key) ?? 0, ca: caMap.get(key) ?? 0 })
    }

    // ─── Métier breakdown (clients only) ────────────────────────
    const allContacts = await ctx.db.query("crm_contacts").collect()
    const clientContacts = allContacts.filter(c => c.statut === 'client')
    const metierMap = new Map<string, { count: number; niche: string; contacts: { name: string; company: string }[] }>()
    for (const c of clientContacts) {
      const m = c.metier || 'Non renseigné'
      const n = c.niche  || 'Autre'
      const name = `${c.firstName} ${c.lastName ?? ''}`.trim()
      if (!metierMap.has(m)) metierMap.set(m, { count: 0, niche: n, contacts: [] })
      const entry = metierMap.get(m)!
      entry.count++
      entry.contacts.push({ name, company: c.companyName ?? '' })
    }
    const total = clientContacts.length || 1
    const COLORS = ['#FF4D00','#3462EE','#22c55e','#EFE347','#4A91A8','#EC4899','#8896AB','#F97316']
    const metierBreakdown = [...metierMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, d], i) => ({
        label, niche: d.niche,
        count: d.count,
        pct:   Math.round((d.count / total) * 100),
        color: COLORS[i % COLORS.length],
        contacts: d.contacts,
      }))

    // ─── Niche breakdown for modal ───────────────────────────────
    const nicheMap = new Map<string, { metiers: Map<string, { count: number; contacts: { name: string; company: string }[] }> }>()
    for (const c of clientContacts) {
      const n = c.niche  || 'Autre'
      const m = c.metier || 'Non renseigné'
      const name = `${c.firstName} ${c.lastName ?? ''}`.trim()
      if (!nicheMap.has(n)) nicheMap.set(n, { metiers: new Map() })
      const nicheEntry = nicheMap.get(n)!
      if (!nicheEntry.metiers.has(m)) nicheEntry.metiers.set(m, { count: 0, contacts: [] })
      const metierEntry = nicheEntry.metiers.get(m)!
      metierEntry.count++
      metierEntry.contacts.push({ name, company: c.companyName ?? '' })
    }
    const nicheBreakdown = [...nicheMap.entries()].map(([niche, d]) => ({
      niche,
      metiers: [...d.metiers.entries()].map(([metier, md]) => ({
        metier, count: md.count, contacts: md.contacts,
      })),
    }))

    // ─── Recent leads ────────────────────────────────────────────
    const recentLeads = allLeads
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map(l => ({ id: l._id, name: l.name, stageId: l.stageId, createdAt: l.createdAt.split('T')[0], value: l.value, source: l.source ?? 'inbound' }))

    return {
      clientsCount, caEncaisse, leadsCount, r1Count, r2Count,
      clientTimeline, metierBreakdown, nicheBreakdown, recentLeads,
      totalContactsCount: allContacts.length,
    }
  },
})
