import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

type Meta = { synthesis: string; tags: string[]; name: string; linkedContactId: string; linkedLeadId: string; synthesisBy: string; synthesisAt: string }

// All per-record metadata, keyed by tl;dv record id
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("record_notes").collect()
    const map: Record<string, Meta> = {}
    for (const r of rows) map[r.recordId] = {
      synthesis: r.synthesis ?? "", tags: r.tags ?? [], name: r.name ?? "",
      linkedContactId: r.linkedContactId ?? "", linkedLeadId: r.linkedLeadId ?? "",
      synthesisBy: r.synthesisBy ?? "", synthesisAt: r.synthesisAt ?? "",
    }
    return map
  },
})

export const get = query({
  args: { recordId: v.string() },
  handler: async (ctx, { recordId }) => {
    const row = await ctx.db
      .query("record_notes")
      .withIndex("by_record", q => q.eq("recordId", recordId))
      .first()
    return {
      synthesis: row?.synthesis ?? "", tags: row?.tags ?? [], name: row?.name ?? "",
      linkedContactId: row?.linkedContactId ?? "", linkedLeadId: row?.linkedLeadId ?? "",
      synthesisBy: row?.synthesisBy ?? "", synthesisAt: row?.synthesisAt ?? "",
    }
  },
})

// Merge-patch metadata (synthesis / tags / name / liens CRM). Row is removed only when everything is empty.
export const patch = mutation({
  args: {
    recordId:  v.string(),
    synthesis: v.optional(v.string()),
    tags:      v.optional(v.array(v.string())),
    name:      v.optional(v.string()),
    linkedContactId: v.optional(v.string()),
    linkedLeadId:    v.optional(v.string()),
    synthesisBy:     v.optional(v.string()),   // auteur (ex "agent:agent-kb") — posé quand une synthèse est écrite
  },
  handler: async (ctx, { recordId, synthesis, tags, name, linkedContactId, linkedLeadId, synthesisBy }) => {
    const existing = await ctx.db
      .query("record_notes")
      .withIndex("by_record", q => q.eq("recordId", recordId))
      .first()
    const merged = {
      synthesis: (synthesis ?? existing?.synthesis ?? "").trim(),
      tags:      (tags ?? existing?.tags ?? []),
      name:      (name ?? existing?.name ?? "").trim(),
      linkedContactId: (linkedContactId ?? existing?.linkedContactId ?? "").trim(),
      linkedLeadId:    (linkedLeadId ?? existing?.linkedLeadId ?? "").trim(),
    }
    const isEmpty = !merged.synthesis && merged.tags.length === 0 && !merged.name && !merged.linkedContactId && !merged.linkedLeadId
    if (isEmpty) {
      if (existing) await ctx.db.delete(existing._id)
      return
    }
    // Trace d'auteur : posée uniquement quand CET appel écrit une synthèse (sinon on garde l'auteur existant).
    const now = new Date().toISOString()
    const wroteSynthesis = synthesis !== undefined && synthesis.trim().length > 0
    const authorPatch = wroteSynthesis && synthesisBy
      ? { synthesisBy, synthesisAt: now }
      : {}
    if (existing) {
      await ctx.db.patch(existing._id, { ...merged, ...authorPatch, updatedAt: now })
    } else {
      await ctx.db.insert("record_notes", { recordId, ...merged, ...authorPatch, updatedAt: now })
    }
  },
})

export const remove = mutation({
  args: { recordId: v.string() },
  handler: async (ctx, { recordId }) => {
    const existing = await ctx.db
      .query("record_notes")
      .withIndex("by_record", q => q.eq("recordId", recordId))
      .first()
    if (existing) await ctx.db.delete(existing._id)
  },
})
