import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Cerveau réel des agents = SOUL.md synchronisé depuis le runtime VPS.
// Lecture seule côté Data OS : la source de vérité reste le fichier SOUL.md du profil Hermes.
// Le script de sync VPS appelle `upsert` (mutation publique, même pattern que recordNotes).

export const upsert = mutation({
  args: {
    slug:          v.string(),
    soul:          v.string(),
    name:          v.optional(v.string()),
    vpsProfile:    v.optional(v.string()),
    soulUpdatedAt: v.optional(v.string()),
    mdSoul:        v.optional(v.string()),
    mdPersonnalite: v.optional(v.string()),
    mdRole:        v.optional(v.string()),
    mdOutils:      v.optional(v.string()),
  },
  handler: async (ctx, { slug, soul, name, vpsProfile, soulUpdatedAt, mdSoul, mdPersonnalite, mdRole, mdOutils }) => {
    const now = new Date().toISOString()
    const existing = await ctx.db
      .query("agent_brains")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first()
    const doc = { slug, soul, name, vpsProfile, soulUpdatedAt, syncedAt: now, mdSoul, mdPersonnalite, mdRole, mdOutils }
    if (existing) await ctx.db.patch(existing._id, doc)
    else await ctx.db.insert("agent_brains", doc)
  },
})

// Cerveau d'un agent par slug (ex "agent-operations"). Renvoie null si pas encore synchronisé.
export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("agent_brains")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first()
    if (!row) return null
    return {
      slug: row.slug, soul: row.soul, name: row.name ?? "",
      vpsProfile: row.vpsProfile ?? "", soulUpdatedAt: row.soulUpdatedAt ?? "", syncedAt: row.syncedAt,
      mdSoul: row.mdSoul ?? "", mdPersonnalite: row.mdPersonnalite ?? "", mdRole: row.mdRole ?? "", mdOutils: row.mdOutils ?? "",
    }
  },
})

// Purge le cerveau d'un agent (ex retirer un profil perso/sensible de la sync).
export const remove = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("agent_brains")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first()
    if (row) await ctx.db.delete(row._id)
  },
})

// Tous les cerveaux, indexés par slug.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("agent_brains").collect()
    const map: Record<string, { soul: string; name: string; vpsProfile: string; soulUpdatedAt: string; syncedAt: string }> = {}
    for (const r of rows) map[r.slug] = { soul: r.soul, name: r.name ?? "", vpsProfile: r.vpsProfile ?? "", soulUpdatedAt: r.soulUpdatedAt ?? "", syncedAt: r.syncedAt }
    return map
  },
})
