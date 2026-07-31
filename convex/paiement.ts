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

    // ── Dépenses de la période : abonnements du module Budget + dépense publicitaire ──
    // Bénéfice = encaissé net des remboursements, moins ce que l'activité a coûté.
    // Un abonnement mensuel est proratisé sur la fenêtre (sinon un mois complet
    // s'imputerait sur une semaine), une dépense ponctuelle compte le jour où elle tombe.
    const USD_TO_CHF = 0.7961   // même taux que le module Budget
    const budgetItems = await ctx.db.query("budget_items").collect()
    const jours = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400_000) + 1)
    let coutsFixes = 0, coutsPonctuels = 0
    for (const it of budgetItems) {
      const montant = it.currency === "USD" ? it.amount * USD_TO_CHF : it.amount
      if (it.recurrence === "ponctuel") {
        if (it.date && dOf(it.date) >= from && dOf(it.date) <= to) coutsPonctuels += montant
      } else {
        coutsFixes += (montant / 30) * jours
      }
    }
    const metaRows = await ctx.db.query("meta_daily").collect()
    const depensePub = metaRows
      .filter((r) => r.date >= from && r.date <= to)
      .reduce((s, r) => s + (r.spend ?? 0), 0)
    const depenses = Math.round(coutsFixes + coutsPonctuels + depensePub)
    const benefice = Math.round(encaisse - rembourse - depenses)

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
      benefice,
      depenses: {
        total: depenses,
        abonnements: Math.round(coutsFixes),
        ponctuelles: Math.round(coutsPonctuels),
        publicite: Math.round(depensePub),
      },
      marge: encaisse > 0 ? Math.round((benefice / encaisse) * 100) : null,
      clientsCount, caTotal, leadsCount,
      conversions: { global: convGlobal, inbound: convInbound, outbound: convOutbound, recommandation: convReco },
    }
  },
})
