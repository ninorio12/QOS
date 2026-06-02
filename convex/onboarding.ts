import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const getByContact = query({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", args.contactId))
      .first()
  },
})

export const list = query({
  handler: async (ctx) => ctx.db.query("onboarding").collect(),
})

// Payment control tower — aggregate every client's installments & refunds
export const paymentsOverview = query({
  handler: async (ctx) => {
    const obs      = await ctx.db.query("onboarding").collect()
    const clients  = await ctx.db.query("pipeline_clients").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    const clientByContact = new Map(clients.map(c => [c.ghl_contact_id ?? '', c]))
    const contactById = new Map(contacts.map(c => [c._id.toString(), c]))

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
        if (isPaid) encaisse += amt; else attente += amt
        transactions.push({
          contactId: ob.contactId, client: name, company,
          label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement',
          amount: amt, date: dates[i] || '', type: 'payment',
          status: isPaid ? 'encaissé' : 'attente',
        })
      })
      for (const r of ob.refunds ?? []) {
        rembourse += r.amount
        transactions.push({ contactId: ob.contactId, client: name, company, label: r.note || 'Remboursement', amount: -r.amount, date: r.date, type: 'refund', status: 'encaissé' })
      }
    }

    // Clients without onboarding doc yet → all their value is "en attente"
    for (const cl of clients) {
      if (!obs.find(o => o.contactId === (cl.ghl_contact_id ?? ''))) {
        attente += cl.value
        transactions.push({ contactId: cl.ghl_contact_id ?? '', client: cl.name, company: cl.company ?? '', label: 'Paiement', amount: cl.value, date: '', type: 'payment', status: 'attente' })
      }
    }

    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return { encaisse, attente, rembourse, net: encaisse - rembourse, transactions }
  },
})

// Upsert a partial patch for a contact's onboarding
export const patch = mutation({
  args: {
    contactId:       v.string(),
    tasks:           v.optional(v.any()),
    payment:         v.optional(v.object({ installments: v.number(), amounts: v.array(v.number()) })),
    paidStatus:      v.optional(v.array(v.boolean())),
    paidDates:       v.optional(v.array(v.string())),
    refunds:         v.optional(v.array(v.object({ amount: v.number(), date: v.string(), note: v.optional(v.string()) }))),
    signedContract:  v.optional(v.object({ fileName: v.string(), storageId: v.optional(v.string()), dataUrl: v.optional(v.string()), uploadedAt: v.string() })),
    form:            v.optional(v.any()),
    kickoffEventId:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contactId, ...rest } = args
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", contactId))
      .first()
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert("onboarding", { contactId, ...patch } as never)
  },
})
