import { v } from "convex/values"
import { query } from "./_generated/server"
import { localDay } from "./timeLib"

const COLORS = ['#FF4D00','#3462EE','#22c55e','#EFE347','#4A91A8','#EC4899','#8896AB','#F97316']

export const getMetrics = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { from, to } = args
    // Counts reflect the pipeline state AS OF the end of the period (cumulative ≤ to):
    // a client/lead created earlier still exists today. The window [from,to] drives the timeline.
    const dateOf = (isoOrDate: string) => localDay(isoOrDate, args.tzOffset)
    const inWindow = (isoOrDate: string) => { const d = dateOf(isoOrDate); return d >= from && d <= to }

    // ─── Source of truth: contacts ──────────────────────────────
    const allContacts = await ctx.db.query("crm_contacts").collect()
    const contactById = new Map(allContacts.map(c => [c._id.toString(), c]))
    // statut lookup: crm_contacts._id(string) → statut
    const contactStatut = new Map(allContacts.map(c => [c._id.toString(), c.statut]))

    // ─── Clients = pipeline_clients whose linked contact has statut='client'
    //     AND the client was created within [from,to] (intersection + flux) ──
    const allClients   = await ctx.db.query("pipeline_clients").collect()
    // Clé de jointure : contactId (Convex, source unique) avec repli sur ghl_contact_id
    // le temps de la migration Vague 2. Les deux valeurs sont identiques après backfill.
    const periodClients = allClients.filter(c => {
      const key = c.contactId ?? c.ghl_contact_id
      return key != null &&
        contactStatut.get(key) === 'client' &&
        inWindow(c.createdAt)
    })
    const clientsCount  = periodClients.length

    // ─── Leads = open leads, contact statut='lead', created within [from,to] ──
    const allLeads    = await ctx.db.query("crm_leads").collect()
    const periodLeads = allLeads.filter(l =>
      l.status === 'open' &&
      l.contactId != null &&
      contactStatut.get(l.contactId.toString()) === 'lead' &&
      inWindow(l.createdAt)
    )
    const leadsCount  = periodLeads.length

    // ─── R1 / R2 = LIVE count of open leads currently in those stages
    //     (no period filter — current column state) ──
    const r1Count = allLeads.filter(l => l.status === 'open' && l.stageId === 'r1').length
    const r2Count = allLeads.filter(l => l.status === 'open' && l.stageId === 'r2').length

    // ─── CA encaissé / CA à collecter — ported from paiement.overview ──
    // User-entered date-only fields (paidDates, refund.date) → compare first 10 chars.
    const inWinDate = (s: string) => { const d = s.slice(0, 10); return d >= from && d <= to }
    const obs = await ctx.db.query("onboarding").collect()
    const clientByContact = new Map(allClients.map(c => [c.ghl_contact_id ?? '', c]))
    let caEncaisse = 0, caACollecter = 0, rembourse = 0
    for (const ob of obs) {
      const client = clientByContact.get(ob.contactId)
      const amounts = ob.payment?.amounts ?? (client ? [client.value] : [])
      const paid    = ob.paidStatus ?? []
      const dates   = ob.paidDates ?? []
      amounts.forEach((amt, i) => {
        const isPaid = paid[i] === true
        const pdate  = dates[i] || ''
        if (isPaid) { if (pdate && inWinDate(pdate)) caEncaisse += amt }
        else caACollecter += amt
      })
      for (const r of ob.refunds ?? []) {
        if (inWinDate(r.date)) rembourse += r.amount
      }
    }
    // Clients without onboarding doc → fully pending
    for (const cl of allClients) {
      if (!obs.find(o => o.contactId === (cl.ghl_contact_id ?? ''))) caACollecter += cl.value
    }
    // CA encaissé = brut reçu sur la période (cohérent avec le libellé "Montant encaissé" de la page Paiement).
    // Les remboursements sont exposés séparément (clé rembourse), pas soustraits ici.

    // ─── Client timeline (per day within the window, count + CA) ──
    // Aligned to the new Client definition (intersection: statut='client' + in window).
    const dayCount = new Map<string, number>()
    const dayCA    = new Map<string, number>()
    for (const c of periodClients) {
      const key = dateOf(c.createdAt)
      dayCount.set(key, (dayCount.get(key) ?? 0) + 1)
      dayCA.set(key, (dayCA.get(key) ?? 0) + (c.value ?? 0))
    }
    const clientTimeline: { date: string; value: number; ca: number }[] = []
    for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) {
      const key = localDay(d.toISOString(), args.tzOffset)
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

    // ─── Distinct non-empty métier / niche counts among period clients ──
    const metiersSet = new Set<string>()
    const nichesSet  = new Set<string>()
    for (const client of periodClients) {
      const contact = client.ghl_contact_id ? contactById.get(client.ghl_contact_id) : undefined
      const m = (contact?.metier ?? '').trim()
      const n = (contact?.niche  ?? '').trim()
      if (m) metiersSet.add(m)
      if (n) nichesSet.add(n)
    }
    const metiersCount = metiersSet.size
    const nichesCount  = nichesSet.size

    // ─── Recent activity = latest leads created (open + lost) ───
    const recentLeads = [...allLeads]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map(l => ({ id: l._id, name: l.name, stageId: l.status === 'lost' ? 'perdu' : l.stageId, createdAt: dateOf(l.createdAt), value: l.value, source: l.source ?? 'inbound' }))

    return {
      clientsCount, caEncaisse, caACollecter, rembourse, leadsCount, r1Count, r2Count,
      metiersCount, nichesCount,
      clientTimeline, metierBreakdown, nicheBreakdown, recentLeads,
      totalContactsCount: allContacts.length,
    }
  },
})
