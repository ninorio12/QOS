// Synthèse du cockpit Media Buyer : UNE note libre à la fois.
//
// Règle scellée : la note du jour reste éditable 24 h ; passé ce délai, si elle
// est remplie elle bascule dans l'historique et une zone vierge prend la place.
// Une note expirée VIDE ne pollue pas l'historique. L'agent peut écrire (pas de
// session Clerk → « Media Buyer »).
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const WINDOW_MS = 24 * 3600_000

async function whoami(ctx: QueryCtx | MutationCtx): Promise<{ name: string; avatarUrl?: string } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkUserId", identity.subject))
    .first()
  return user ? { name: user.name, avatarUrl: user.avatarUrl ?? undefined } : null
}

/** La note en cours (moins de 24 h), ou null si la zone doit être vierge. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("os_syntheses")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const latest = rows.sort((a, b) => b.createdAt - a.createdAt)[0]
    if (!latest || Date.now() - latest.createdAt >= WINDOW_MS) return null
    return { id: latest._id, body: latest.body, updatedBy: latest.updatedBy, avatarUrl: latest.avatarUrl, updatedAt: latest.updatedAt }
  },
})

/** L'historique : les notes remplies de plus de 24 h, récentes d'abord. */
export const history = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("os_syntheses")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const cutoff = Date.now() - WINDOW_MS
    return rows
      .filter((r) => r.createdAt <= cutoff && r.body.trim().length > 0)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 60)
  },
})

/** Sauver la note : patch de la note en cours, sinon nouvelle note. */
export const save = mutation({
  args: { body: v.string() },
  handler: async (ctx, a) => {
    const me = await whoami(ctx)
    const name = me?.name ?? "Media Buyer"
    const rows = await ctx.db
      .query("os_syntheses")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const latest = rows.sort((x, y) => y.createdAt - x.createdAt)[0]
    if (latest && Date.now() - latest.createdAt < WINDOW_MS) {
      await ctx.db.patch(latest._id, { body: a.body, updatedBy: name, avatarUrl: me?.avatarUrl, updatedAt: Date.now() })
      return latest._id
    }
    // Une note expirée restée vide ne sert à rien : on la retire en passant.
    if (latest && latest.body.trim().length === 0) await ctx.db.delete(latest._id)
    return await ctx.db.insert("os_syntheses", {
      workspaceId: WORKSPACE, body: a.body, updatedBy: name, avatarUrl: me?.avatarUrl,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  },
})
