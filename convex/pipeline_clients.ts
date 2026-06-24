import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { type Id } from "./_generated/dataModel"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("pipeline_clients").order("desc").collect()
  },
})

// Fiche client (montant du deal) — récupère la ligne client liée à un contact.
export const getByContact = query({
  args: { contactId: v.id("crm_contacts") },
  handler: async (ctx, { contactId }) =>
    await ctx.db.query("pipeline_clients").withIndex("by_contact", q => q.eq("contactId", contactId)).first(),
})

// Backfill one-shot (Vague 2, Phase 2.0) : remplit contactId à partir de ghl_contact_id
// lorsqu'il correspond à un crm_contacts existant. Idempotent (ignore les rows déjà migrées).
export const backfillContactId = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pipeline_clients").collect()
    let migrated = 0, skippedNoMatch = 0
    for (const r of rows) {
      if (r.contactId) continue
      const gid = r.ghl_contact_id
      if (!gid) { skippedNoMatch++; continue }
      const contact = await ctx.db.get(gid as Id<"crm_contacts">)
      if (contact) { await ctx.db.patch(r._id, { contactId: gid as Id<"crm_contacts"> }); migrated++ }
      else { skippedNoMatch++ }
    }
    return { scanned: rows.length, migrated, skippedNoMatch }
  },
})

export const create = mutation({
  args: {
    ghl_contact_id: v.optional(v.string()),
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    value: v.number(),
    stageId: v.string(),
    initials: v.string(),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipeline_clients", args)
  },
})

export const updateStage = mutation({
  args: { id: v.id("pipeline_clients"), stageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stageId: args.stageId })
  },
})

export const updateValue = mutation({
  args: { id: v.id("pipeline_clients"), value: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { value: args.value })
  },
})

// One-shot : normalise les id de colonne legacy vers les colonnes réelles du board Clients.
// "onboarding" (ancien fallback) → "onboarding-envoye" (sinon la card n'apparaît dans aucune colonne).
export const normalizeLegacyStages = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("pipeline_clients").collect()
    const VALID = ["nouveau-client", "onboarding-envoye", "onboarding-complet", "kickoff-booke", "setup-cree", "consulting"]
    let fixed = 0
    for (const r of rows) {
      if (VALID.includes(r.stageId)) continue
      const next = r.stageId === "onboarding" ? "onboarding-envoye" : "nouveau-client"
      await ctx.db.patch(r._id, { stageId: next })
      fixed++
    }
    return { scanned: rows.length, fixed }
  },
})

export const remove = mutation({
  args: { id: v.id("pipeline_clients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})
