import { v } from "convex/values"
import { query } from "./_generated/server"
import { localDay } from "./timeLib"
import { reconcileMoney } from "./moneyReconciliation"

// Period-aware payment overview + conversion rates
export const overview = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()), allContacts: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { from, to } = args
    const dOf = (s: string) => localDay(s, args.tzOffset)
    const inWin = (s: string) => { const d = dOf(s); return d >= from && d <= to }

    const obs      = await ctx.db.query("onboarding").collect()
    const clients  = await ctx.db.query("pipeline_clients").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    const leads = await ctx.db.query("crm_leads").collect()
    const stripePayments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
    const externalPayments = await ctx.db.query("external_payments").collect()
    const fxRows = await ctx.db.query("fx_rates").collect()
    const fxToChf: Record<string, number> = { chf: 1 }; for (const r of fxRows) fxToChf[r.currency] = r.rate

    // ── Argent : source UNIQUE de vérité (réconciliation partagée avec dashboard.getMetrics) ──
    const money = reconcileMoney({ obs, clients, contacts, stripePayments, externalPayments, from, to, tzOffset: args.tzOffset, fxToChf })
    const { encaisse, attente, rembourse, enRetard, pending, failed, disputes, transactions } = money

    // ── États (cumulatif ≤ to, définition CRM — identique au dashboard) ──
    const contactStatut = new Map(contacts.map(c => [c._id.toString(), c.statut]))
    const statutOf = (cl: typeof clients[number]) => contactStatut.get((cl.contactId ?? cl.ghl_contact_id)?.toString() ?? '')
    const inWinD = (s: string) => { const d = dOf(s); return d >= from && d <= to }
    // caTotal = valeur contractée des clients de la PÉRIODE ; clients/leads = TOTAL ACTUEL (cohérent dashboard + clic).
    const periodClients = clients.filter(c => inWinD(c.createdAt) && statutOf(c) === 'client')
    const caTotal       = periodClients.reduce((s, c) => s + (c.value ?? 0), 0)
    const clientsCount  = clients.filter(c => statutOf(c) === 'client').length
    const leadsCount    = leads.filter(l => l.status === 'open').length

    // ── Conversion rates ───────────
    // allContacts=true → dénominateur = total du module Contacts (pas seulement la période).
    // Dénominateur = TOUS les contacts de la source (leads + clients + perdus). Conversion = clients / contacts.
    const winContacts = args.allContacts ? contacts : contacts.filter(c => inWin(c.createdAt))
    function rate(filterFn: (c: typeof contacts[number]) => boolean) {
      const subset = winContacts.filter(filterFn)
      const clientsN = subset.filter(c => c.statut === 'client').length
      const total = subset.length
      return { clients: clientsN, total, pct: total ? Math.round((clientsN / total) * 100) : 0 }
    }
    const convGlobal   = rate(() => true)
    const convInbound  = rate(c => c.source === 'inbound')
    const convOutbound = rate(c => c.source === 'outbound')
    // Recommandation = catch-all (tout ce qui n'est ni inbound ni outbound, source vide incluse)
    // → garantit Inbound + Outbound + Recommandation = Global (réconciliation des segments).
    const convReco     = rate(c => c.source !== 'inbound' && c.source !== 'outbound')

    return {
      encaisse, attente, rembourse, enRetard, pending, failed, disputes, net: encaisse - rembourse, transactions,
      clientsCount, caTotal, leadsCount,
      conversions: { global: convGlobal, inbound: convInbound, outbound: convOutbound, recommandation: convReco },
    }
  },
})
