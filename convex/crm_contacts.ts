import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("crm_contacts").order("desc").collect()
  },
})

export const get = query({
  args: { id: v.id("crm_contacts") },
  handler: async (ctx, args) => ctx.db.get(args.id),
})

// Distinct métiers + niches (for dropdowns in the contact modal)
export const distinctMetiersNiches = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("crm_contacts").collect()
    const metiers = [...new Set(all.map(c => c.metier).filter(Boolean) as string[])].sort()
    const niches  = [...new Set(all.map(c => c.niche).filter(Boolean) as string[])].sort()
    return { metiers, niches }
  },
})

export const create = mutation({
  args: {
    firstName:   v.string(),
    lastName:    v.optional(v.string()),
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    companyName: v.optional(v.string()),
    address1:    v.optional(v.string()),
    city:        v.optional(v.string()),
    postalCode:  v.optional(v.string()),
    website:     v.optional(v.string()),
    source:      v.optional(v.string()),
    statut:      v.optional(v.string()),
    canton:      v.optional(v.string()),
    metier:      v.optional(v.string()),
    niche:       v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    notes:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("crm_contacts", {
      ...args,
      tags:      args.tags ?? [],
      createdAt: new Date().toISOString(),
    })
  },
})

export const update = mutation({
  args: {
    id:          v.id("crm_contacts"),
    firstName:   v.optional(v.string()),
    lastName:    v.optional(v.string()),
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    companyName: v.optional(v.string()),
    address1:    v.optional(v.string()),
    city:        v.optional(v.string()),
    postalCode:  v.optional(v.string()),
    website:     v.optional(v.string()),
    source:      v.optional(v.string()),
    statut:      v.optional(v.string()),
    canton:      v.optional(v.string()),
    metier:      v.optional(v.string()),
    niche:       v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    notes:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) patch[k] = v
    }
    await ctx.db.patch(id, patch)
  },
})

export const remove = mutation({
  args: { id: v.id("crm_contacts") },
  handler: async (ctx, args) => {
    // Cascade: remove associated lead + client + stage history
    const leads = await ctx.db.query("crm_leads").withIndex("by_contact", q => q.eq("contactId", args.id)).collect()
    for (const l of leads) {
      const hist = await ctx.db.query("lead_stage_history").withIndex("by_lead", q => q.eq("leadId", l._id)).collect()
      for (const h of hist) await ctx.db.delete(h._id)
      await ctx.db.delete(l._id)
    }
    const cid = args.id.toString()
    const clients = await ctx.db.query("pipeline_clients").withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", cid)).collect()
    for (const c of clients) await ctx.db.delete(c._id)
    await ctx.db.delete(args.id)
  },
})
