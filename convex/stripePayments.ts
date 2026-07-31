import { v } from "convex/values"
import { mutation, internalMutation, query } from "./_generated/server"

// Upsert d'un paiement/remboursement Stripe (dédup par stripeId). Matche le contact
// par email si trouvé. INTERNE : appelée uniquement par le webhook signé (http.ts) + le backfill
// (stripeSync). Jamais exposée au client → impossible d'injecter un faux CA via l'URL Convex.
export const upsertFromStripe = internalMutation({
  args: {
    stripeId: v.string(),
    type: v.string(),                 // 'payment' | 'refund'
    status: v.string(),               // 'succeeded' | 'pending' | 'failed'
    amount: v.number(),               // unités majeures
    currency: v.string(),
    customerId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    description: v.optional(v.string()),
    created: v.string(),
    invoiceId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    livemode: v.optional(v.boolean()),
    source: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), contactMatched: v.boolean() }),
  handler: async (ctx, a) => {
    const iso = new Date().toISOString()
    // matching contact par email (normalisé)
    let contactId: import("./_generated/dataModel").Id<"crm_contacts"> | undefined
    if (a.customerEmail) {
      const email = a.customerEmail.toLowerCase().trim()
      const match = await ctx.db.query("crm_contacts").withIndex("by_email", q => q.eq("email", email)).first()
      contactId = match?._id
    }
    const fields = {
      type: a.type, status: a.status, amount: a.amount, currency: a.currency.toLowerCase(),
      customerId: a.customerId, customerEmail: a.customerEmail, contactId,
      description: a.description, created: a.created,
      invoiceId: a.invoiceId, paymentIntentId: a.paymentIntentId,
      livemode: a.livemode, source: a.source ?? "webhook",
    }
    const existing = await ctx.db.query("stripe_payments").withIndex("by_stripe_id", q => q.eq("stripeId", a.stripeId)).first()
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert("stripe_payments", { stripeId: a.stripeId, ...fields, createdAt: iso })
    return { ok: true, contactMatched: !!contactId }
  },
})

// Liste récente (UI éventuelle / debug).
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = (await ctx.db.query("stripe_payments").withIndex("by_created").collect())
      .sort((x, y) => (x.created < y.created ? 1 : -1))
      .slice(0, limit ?? 100)
    return rows.map(r => ({
      id: r._id, stripeId: r.stripeId, type: r.type, status: r.status,
      amount: r.amount, currency: r.currency, email: r.customerEmail ?? null,
      contactId: r.contactId ?? null, description: r.description ?? null, created: r.created,
    }))
  },
})

// Supprime les paiements de TEST (source === 'test') — nettoyage après démo.
export const purgeTest = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("stripe_payments").collect()
    let deleted = 0
    for (const r of rows) if (r.source === "test") { await ctx.db.delete(r._id); deleted++ }
    return { deleted }
  },
})

// Statut de connexion Stripe (lecture du vault d'intégrations, sans secret).
export const connectionStatus = query({
  args: {},
  returns: v.object({ connected: v.boolean(), account: v.union(v.string(), v.null()), count: v.number(), lastCreated: v.union(v.string(), v.null()) }),
  handler: async (ctx) => {
    const integ = await ctx.db.query("integrations").withIndex("by_key", q => q.eq("key", "stripe")).first()
    const payments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
    const lastCreated = payments.length ? payments.reduce((m, p) => (p.created > m ? p.created : m), payments[0].created) : null
    return {
      connected: integ?.status === "connected" || payments.length > 0,
      account: integ?.account ?? null,
      count: payments.length,
      lastCreated,
    }
  },
})
