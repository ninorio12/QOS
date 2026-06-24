"use node"

import Stripe from "stripe"
import { v } from "convex/values"
import { action } from "./_generated/server"
import { api, internal } from "./_generated/api"

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"])
const toMajor = (amount: number, currency: string) => ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100
const iso = (unixSec: number) => new Date(unixSec * 1000).toISOString()

// Backfill de l'historique Stripe (charges + remboursements) → stripe_payments.
// Lit la clé depuis le vault Convex (jamais exposée). Bouton « Sync Stripe ».
export const syncStripe = action({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }): Promise<{ ok: boolean; error?: string; payments?: number; refunds?: number }> => {
    // Sécurité : action user-only (pas de cron), réservée aux admins.
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return { ok: false, error: "Authentification requise." }
    const isAdmin = await ctx.runQuery(internal.stripe._isAdmin, { clerkUserId: identity.subject })
    if (!isAdmin) return { ok: false, error: "Action réservée aux administrateurs." }
    const conn = await ctx.runQuery(internal.stripe._connection, {})
    if (!conn) return { ok: false, error: "Aucun compte Stripe connecté." }

    const stripe = new Stripe(conn.secretKey, { typescript: true })
    const gte = Math.floor(Date.now() / 1000) - ((days ?? 365) * 86400)
    let payments = 0, refunds = 0

    try {
      for await (const c of stripe.charges.list({ created: { gte }, limit: 100, expand: ["data.refunds"] })) {
        if (c.status === "succeeded") {
          await ctx.runMutation(api.stripePayments.upsertFromStripe, {
            stripeId: c.id, type: "payment", status: "succeeded",
            amount: toMajor(c.amount, c.currency), currency: c.currency,
            customerId: typeof c.customer === "string" ? c.customer : c.customer?.id,
            customerEmail: c.billing_details?.email ?? c.receipt_email ?? undefined,
            description: c.description ?? undefined, created: iso(c.created),
            paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : undefined,
            livemode: c.livemode, source: "backfill",
          })
          payments++
        }
        for (const r of c.refunds?.data ?? []) {
          await ctx.runMutation(api.stripePayments.upsertFromStripe, {
            stripeId: r.id, type: "refund", status: r.status === "succeeded" ? "succeeded" : (r.status ?? "pending"),
            amount: toMajor(r.amount, r.currency), currency: r.currency,
            customerId: typeof c.customer === "string" ? c.customer : c.customer?.id,
            customerEmail: c.billing_details?.email ?? c.receipt_email ?? undefined,
            description: r.reason ?? "Remboursement", created: iso(r.created),
            paymentIntentId: typeof c.payment_intent === "string" ? c.payment_intent : undefined,
            livemode: c.livemode, source: "backfill",
          })
          refunds++
        }
      }
      await ctx.runMutation(internal.stripe._touch, {})
      return { ok: true, payments, refunds }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Erreur de synchronisation Stripe" }
    }
  },
})
