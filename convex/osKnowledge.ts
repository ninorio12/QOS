import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE, logActivity } from "./osLib"

export const list = query({
  args: { kind: v.optional(v.string()) },
  handler: async (ctx, { kind }) => {
    const rows = kind
      ? await ctx.db.query("os_knowledge").withIndex("by_kind", q => q.eq("workspaceId", WORKSPACE).eq("kind", kind)).collect()
      : await ctx.db.query("os_knowledge").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.map(r => ({ ...r, id: r._id })).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  },
})

export const create = mutation({
  args: {
    kind: v.string(),
    title: v.string(),
    body: v.optional(v.string()),
    status: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    linkedClientId: v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    source: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    const createdBy = a.createdBy ?? "human:thomas"
    const id = await ctx.db.insert("os_knowledge", {
      workspaceId: WORKSPACE, kind: a.kind, title: a.title, body: a.body,
      status: a.status ?? (createdBy.startsWith("agent") ? "to_validate" : "active"),
      tags: a.tags ?? [], linkedClientId: a.linkedClientId, linkedProjectId: a.linkedProjectId,
      source: a.source, createdBy, createdAt: now, updatedAt: now,
    })
    await logActivity(ctx, { actorType: createdBy.startsWith("agent") ? "agent" : "human", actorId: createdBy, eventType: "memory.update", entityType: "knowledge", entityId: id, summary: `Connaissance ajoutée : ${a.title}`, source: a.source })
    return id
  },
})

export const update = mutation({
  args: { id: v.id("os_knowledge"), title: v.optional(v.string()), body: v.optional(v.string()), kind: v.optional(v.string()), status: v.optional(v.string()), tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { id, ...rest }) => {
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val
    await ctx.db.patch(id, patch)
  },
})

export const approve = mutation({
  args: { id: v.id("os_knowledge") },
  handler: async (ctx, { id }) => {
    const k = await ctx.db.get(id)
    await ctx.db.patch(id, { status: "active", updatedAt: new Date().toISOString() })
    if (k) await logActivity(ctx, { actorType: "human", actorId: "human:thomas", eventType: "approval", entityType: "knowledge", entityId: id, summary: `Validé : ${k.title}` })
  },
})

export const archive = mutation({
  args: { id: v.id("os_knowledge") },
  handler: async (ctx, { id }) => { await ctx.db.patch(id, { status: "archived", updatedAt: new Date().toISOString() }) },
})

export const remove = mutation({
  args: { id: v.id("os_knowledge") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})
