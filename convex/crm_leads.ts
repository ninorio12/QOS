import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { moveStage, markLost } from "./leadSync"
import { normalizeLeadSource } from "./lib/leadSource"

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("crm_leads").order("desc").collect()
  },
})

export const listByPipeline = query({
  args: { pipelineId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("crm_leads")
      .withIndex("by_pipeline", q => q.eq("pipelineId", args.pipelineId))
      .collect()
  },
})

export const create = mutation({
  args: {
    contactId:  v.optional(v.id("crm_contacts")),
    name:       v.string(),
    email:      v.optional(v.string()),
    phone:      v.optional(v.string()),
    company:    v.optional(v.string()),
    pipelineId: v.string(),
    stageId:    v.string(),
    stageName:  v.optional(v.string()),
    value:      v.number(),
    source:     v.optional(v.string()),
    initials:   v.string(),
  },
  handler: async (ctx, args) => {
    const { stageName, ...rest } = args
    if (rest.source !== undefined) rest.source = normalizeLeadSource(rest.source)
    const id = await ctx.db.insert("crm_leads", {
      ...rest,
      status:    "open",
      createdAt: new Date().toISOString(),
    })
    // Record initial stage entry
    await ctx.db.insert("lead_stage_history", {
      leadId:    id,
      stageId:   args.stageId,
      stageName: stageName ?? args.stageId,
      enteredAt: new Date().toISOString().split('T')[0],
      source:    rest.source,
      contactId: args.contactId,
    })
    return id
  },
})

export const updateStage = mutation({
  args: { id: v.id("crm_leads"), stageId: v.string(), stageName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id)
    // Évite une ligne d'historique dupliquée sur un déplacement no-op (même colonne)
    if (lead && lead.stageId !== args.stageId) {
      await ctx.db.patch(args.id, { stageId: args.stageId })
      await ctx.db.insert("lead_stage_history", {
        leadId:    args.id,
        stageId:   args.stageId,
        stageName: args.stageName ?? args.stageId,
        enteredAt: new Date().toISOString().split('T')[0],
        source:    lead.source,
        contactId: lead.contactId,
      })
    }
    // Reverse sync Pipeline → Prospection : miroir de la colonne / record (idempotent)
    if (lead?.contactId) await moveStage(ctx, lead.contactId, args.stageId)
  },
})

export const updateStatus = mutation({
  args: { id: v.id("crm_leads"), status: v.string(), reason: v.optional(v.string()), stage: v.optional(v.string()), objection: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status })
    // Reverse sync : perte depuis le Pipeline → propage à la Prospection/Contact.
    // Raison/étape/objection RÉELLES portées en 1 seul appel (plus de PUT séparé qui écrasait par "autre").
    if (args.status === "lost") {
      const lead = await ctx.db.get(args.id)
      if (lead?.contactId) await markLost(ctx, lead.contactId, { reason: args.reason ?? "autre", stage: args.stage, objection: args.objection })
    }
  },
})

export const get = query({
  args: { id: v.id("crm_leads") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
})

export const update = mutation({
  args: {
    id: v.id("crm_leads"),
    name: v.optional(v.string()), email: v.optional(v.string()), phone: v.optional(v.string()),
    company: v.optional(v.string()), value: v.optional(v.number()), source: v.optional(v.string()),
    stageId: v.optional(v.string()), status: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const patch: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(fields)) if (val !== undefined) patch[k] = val
    if (patch.source !== undefined) patch.source = normalizeLeadSource(patch.source as string)
    await ctx.db.patch(id, patch)
  },
})

export const remove = mutation({
  args: { id: v.id("crm_leads") },
  handler: async (ctx, args) => ctx.db.delete(args.id),
})

// Backfill one-shot : remplit source + contactId des lignes lead_stage_history existantes
// à partir du lead encore vivant. Les leads convertis (supprimés) restent sans source : on ne
// peut pas les reconstituer. Idempotent (skip les lignes déjà renseignées). Cf. funnel FLUX.
export const backfillStageHistoryMeta = mutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("lead_stage_history").collect()
    let updated = 0, orphans = 0
    for (const r of rows) {
      if (r.source !== undefined && r.contactId !== undefined) continue
      const lead = await ctx.db.get(r.leadId)
      if (!lead) { orphans++; continue }
      const patch: Record<string, unknown> = {}
      if (r.source === undefined && lead.source !== undefined) patch.source = lead.source
      if (r.contactId === undefined && lead.contactId !== undefined) patch.contactId = lead.contactId
      if (Object.keys(patch).length) { await ctx.db.patch(r._id, patch); updated++ }
    }
    return { rows: rows.length, updated, orphans }
  },
})
