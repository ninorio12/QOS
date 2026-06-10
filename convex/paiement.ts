import { v } from "convex/values"
import { query } from "./_generated/server"
import { localDay } from "./timeLib"

// Period-aware payment overview + conversion rates
export const overview = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { from, to } = args
    const dOf = (s: string) => localDay(s, args.tzOffset)
    const inWin = (s: string) => { const d = dOf(s); return d >= from && d <= to }
    // User-entered date-only fields (paidDates, refund.date) have no time component → compare as-is.
    const inWinDate = (s: string) => { const d = s.slice(0, 10); return d >= from && d <= to }

    const obs      = await ctx.db.query("onboarding").collect()
    const clients  = await ctx.db.query("pipeline_clients").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    const clientByContact = new Map(clients.map(c => [c.ghl_contact_id ?? '', c]))
    const contactById = new Map(contacts.map(c => [c._id.toString(), c]))
    const leads = await ctx.db.query("crm_leads").collect()

    // ── Payments ────────────────────────────────────────────────
    type Txn = { contactId: string; client: string; company: string; label: string; amount: number; date: string; type: 'payment' | 'refund'; status: 'encaissé' | 'attente' }
    const transactions: Txn[] = []
    let encaisse = 0, attente = 0, rembourse = 0

    for (const ob of obs) {
      const client = clientByContact.get(ob.contactId)
      const contact = contactById.get(ob.contactId)
      const name = client?.name || (contact ? `${contact.firstName} ${contact.lastName ?? ''}`.trim() : '—')
      const company = client?.company || contact?.companyName || ''
      const amounts = ob.payment?.amounts ?? (client ? [client.value] : [])
      const paid = ob.paidStatus ?? []
      const dates = ob.paidDates ?? []
      amounts.forEach((amt, i) => {
        const isPaid = paid[i] === true
        const pdate = dates[i] || ''
        if (isPaid) {
          if (pdate && inWinDate(pdate)) { encaisse += amt; transactions.push({ contactId: ob.contactId, client: name, company, label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement', amount: amt, date: pdate, type: 'payment', status: 'encaissé' }) }
        } else {
          attente += amt
          transactions.push({ contactId: ob.contactId, client: name, company, label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement', amount: amt, date: '', type: 'payment', status: 'attente' })
        }
      })
      for (const r of ob.refunds ?? []) {
        if (inWinDate(r.date)) { rembourse += r.amount; transactions.push({ contactId: ob.contactId, client: name, company, label: r.note || 'Remboursement', amount: -r.amount, date: r.date, type: 'refund', status: 'encaissé' }) }
      }
    }
    // Clients without onboarding doc → fully pending
    for (const cl of clients) {
      if (!obs.find(o => o.contactId === (cl.ghl_contact_id ?? ''))) {
        attente += cl.value
        transactions.push({ contactId: cl.ghl_contact_id ?? '', client: cl.name, company: cl.company ?? '', label: 'Paiement', amount: cl.value, date: '', type: 'payment', status: 'attente' })
      }
    }
    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    // ── Period KPIs (same logic as dashboard, cumulative ≤ to) ──
    const periodClients = clients.filter(c => dOf(c.createdAt) <= to)
    const clientsCount  = periodClients.length
    const caTotal       = periodClients.reduce((s, c) => s + (c.value ?? 0), 0)
    const openLeads     = leads.filter(l => l.status !== 'lost' && dOf(l.createdAt) <= to)
    const leadsCount    = openLeads.length

    // ── Conversion rates (contacts created in window) ───────────
    const winContacts = contacts.filter(c => inWin(c.createdAt))
    function rate(filterFn: (c: typeof contacts[number]) => boolean) {
      const subset = winContacts.filter(filterFn)
      const clientsN = subset.filter(c => c.statut === 'client').length
      const total = subset.length
      return { clients: clientsN, total, pct: total ? Math.round((clientsN / total) * 100) : 0 }
    }
    const convGlobal   = rate(() => true)
    const convInbound  = rate(c => c.source === 'inbound')
    const convOutbound = rate(c => c.source === 'outbound')

    return {
      encaisse, attente, rembourse, net: encaisse - rembourse, transactions,
      clientsCount, caTotal, leadsCount,
      conversions: { global: convGlobal, inbound: convInbound, outbound: convOutbound },
    }
  },
})
