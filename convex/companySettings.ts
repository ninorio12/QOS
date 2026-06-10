import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

const WORKSPACE = "vividflow"

// Défauts — garantit que get()/update() renvoient TOUJOURS un objet complet
// (aucun champ undefined côté UI → plus de crash hexToRgb(undefined).replace).
const DEFAULTS = {
  name:        "VividFlow",
  tagline:     "",
  address:     "",
  phone:       "",
  email:       "",
  siret:       "",
  capital:     "",
  tva_intra:   "",
  assurance:   "",
  brand_color: "#FF4D00",
  logo_svg:    "",
  website_url: "",
}

const FIELDS = {
  name:        v.optional(v.string()),
  tagline:     v.optional(v.string()),
  address:     v.optional(v.string()),
  phone:       v.optional(v.string()),
  email:       v.optional(v.string()),
  siret:       v.optional(v.string()),
  capital:     v.optional(v.string()),
  tva_intra:   v.optional(v.string()),
  assurance:   v.optional(v.string()),
  brand_color: v.optional(v.string()),
  logo_svg:    v.optional(v.string()),
  website_url: v.optional(v.string()),
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("company_settings")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE))
      .first()
    return { ...DEFAULTS, ...(row ?? {}) }
  },
})

export const update = mutation({
  args: FIELDS,
  handler: async (ctx, args) => {
    const patch = { ...args, updatedAt: new Date().toISOString() }
    const existing = await ctx.db
      .query("company_settings")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert("company_settings", { workspaceId: WORKSPACE, ...DEFAULTS, ...patch })
    }
    const row = await ctx.db
      .query("company_settings")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE))
      .first()
    return { ...DEFAULTS, ...(row ?? {}) }
  },
})
