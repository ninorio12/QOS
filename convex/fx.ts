import { action, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"

// Devises suivies (en plus du CHF qui vaut toujours 1).
const TRACKED = ["EUR", "USD", "GBP"]

// Source de vérité des taux de change vers CHF.
// Rafraîchie par cron quotidien via frankfurter.app (taux BCE, gratuit, sans clé).
// reconcileMoney + les modules argent convertissent chaque montant en CHF via cette table.
export const syncRates = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; rates?: Record<string, number>; error?: string }> => {
    // base CHF → on récupère CHF→{EUR,USD,GBP} puis on inverse pour obtenir X→CHF.
    const res = await fetch(`https://api.frankfurter.app/latest?from=CHF&to=${TRACKED.join(",")}`)
    if (!res.ok) return { ok: false, error: `frankfurter ${res.status}` }
    const json = await res.json()
    const chfTo = (json?.rates ?? {}) as Record<string, number>
    const out: Record<string, number> = { chf: 1 }
    for (const cur of TRACKED) {
      const r = chfTo[cur]
      if (r && r > 0) out[cur.toLowerCase()] = 1 / r   // 1 cur = (1 / (CHF→cur)) CHF
    }
    await ctx.runMutation(internal.fx.saveRates, { rates: out })
    return { ok: true, rates: out }
  },
})

export const saveRates = internalMutation({
  args: { rates: v.any() },
  handler: async (ctx, { rates }) => {
    const now = new Date().toISOString()
    for (const [currency, rate] of Object.entries(rates as Record<string, number>)) {
      const existing = await ctx.db.query("fx_rates").withIndex("by_currency", q => q.eq("currency", currency)).first()
      if (existing) await ctx.db.patch(existing._id, { rate, updatedAt: now })
      else await ctx.db.insert("fx_rates", { currency, rate, updatedAt: now })
    }
    return { ok: true }
  },
})

// Map { currency(min) -> rate vers CHF } consommée par les modules argent. chf=1 garanti.
export const map = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("fx_rates").collect()
    const out: Record<string, number> = { chf: 1 }
    for (const r of rows) out[r.currency] = r.rate
    return out
  },
})
