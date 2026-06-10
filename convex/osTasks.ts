import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE, logActivity } from "./osLib"

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const rows = status
      ? await ctx.db.query("os_tasks").withIndex("by_status", q => q.eq("workspaceId", WORKSPACE).eq("status", status)).collect()
      : await ctx.db.query("os_tasks").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.map(r => ({ ...r, id: r._id })).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  },
})

export const get = query({
  args: { id: v.id("os_tasks") },
  handler: async (ctx, { id }) => { const r = await ctx.db.get(id); return r ? { ...r, id: r._id } : null },
})

export const create = mutation({
  args: {
    title:           v.string(),
    description:     v.optional(v.string()),
    status:          v.optional(v.string()),
    priority:        v.optional(v.string()),
    assigneeType:    v.optional(v.string()),
    assigneeId:      v.optional(v.string()),
    source:          v.optional(v.string()),
    sourceRef:       v.optional(v.string()),
    linkedClientId:  v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    linkedMissionId: v.optional(v.string()),
    order:           v.optional(v.number()),
    createdBy:       v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    const createdBy = a.createdBy ?? "human:thomas"
    const id = await ctx.db.insert("os_tasks", {
      workspaceId: WORKSPACE,
      title: a.title,
      description: a.description,
      status: a.status ?? "todo",
      priority: a.priority ?? "normal",
      assigneeType: a.assigneeType ?? "human",
      assigneeId: a.assigneeId,
      source: a.source ?? "dataos",
      sourceRef: a.sourceRef,
      linkedClientId: a.linkedClientId,
      linkedProjectId: a.linkedProjectId,
      linkedMissionId: a.linkedMissionId,
      order: a.order ?? Date.now(),
      comments: [],
      createdBy,
      updatedBy: createdBy,
      createdAt: now,
      updatedAt: now,
    })
    await logActivity(ctx, { actorType: createdBy.startsWith("agent") ? "agent" : "human", actorId: createdBy, eventType: "task.created", entityType: "task", entityId: id, summary: `Tâche créée : ${a.title}`, source: a.source })
    return id
  },
})

export const update = mutation({
  args: {
    id:             v.id("os_tasks"),
    title:          v.optional(v.string()),
    description:    v.optional(v.string()),
    status:         v.optional(v.string()),
    priority:       v.optional(v.string()),
    assigneeType:   v.optional(v.string()),
    assigneeId:     v.optional(v.string()),
    blockerReason:  v.optional(v.string()),
    linkedClientId: v.optional(v.string()),
    linkedProjectId:v.optional(v.string()),
    order:          v.optional(v.number()),
    updatedBy:      v.optional(v.string()),
  },
  handler: async (ctx, { id, updatedBy, ...rest }) => {
    const existing = await ctx.db.get(id)
    if (!existing) return
    const by = updatedBy ?? "human:thomas"
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: by }
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val
    await ctx.db.patch(id, patch)
    const summary = rest.status ? `Tâche → ${rest.status} : ${existing.title}` : `Tâche mise à jour : ${existing.title}`
    await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "task.updated", entityType: "task", entityId: id, summary, metadata: rest })
  },
})

export const addComment = mutation({
  args: { id: v.id("os_tasks"), authorType: v.string(), authorId: v.string(), authorName: v.optional(v.string()), authorAvatar: v.optional(v.string()), text: v.string() },
  handler: async (ctx, { id, authorType, authorId, authorName, authorAvatar, text }) => {
    const existing = await ctx.db.get(id)
    if (!existing) return
    const comments = [...(existing.comments ?? []), { authorType, authorId, authorName, authorAvatar, text, at: new Date().toISOString() }]
    await ctx.db.patch(id, { comments, updatedAt: new Date().toISOString() })
    await logActivity(ctx, { actorType: authorType, actorId: authorId, eventType: "task.comment", entityType: "task", entityId: id, summary: `Commentaire sur : ${existing.title}` })
  },
})

export const editComment = mutation({
  args: { id: v.id("os_tasks"), index: v.number(), text: v.string() },
  handler: async (ctx, { id, index, text }) => {
    const existing = await ctx.db.get(id)
    if (!existing) return
    const comments = [...(existing.comments ?? [])]
    if (index < 0 || index >= comments.length) return
    comments[index] = { ...comments[index], text }
    await ctx.db.patch(id, { comments, updatedAt: new Date().toISOString() })
  },
})

export const deleteComment = mutation({
  args: { id: v.id("os_tasks"), index: v.number() },
  handler: async (ctx, { id, index }) => {
    const existing = await ctx.db.get(id)
    if (!existing) return
    const comments = (existing.comments ?? []).filter((_, i) => i !== index)
    await ctx.db.patch(id, { comments, updatedAt: new Date().toISOString() })
  },
})

export const remove = mutation({
  args: { id: v.id("os_tasks") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})
