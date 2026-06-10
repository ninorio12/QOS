import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

export const list = query({
  args: { contactId: v.optional(v.string()), leadId: v.optional(v.string()), clientId: v.optional(v.string()) },
  handler: async (ctx, f) => {
    let rows = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    if (f.contactId) rows = rows.filter(r => r.contactId === f.contactId)
    if (f.leadId)    rows = rows.filter(r => r.leadId === f.leadId)
    if (f.clientId)  rows = rows.filter(r => r.clientId === f.clientId)
    return rows.map(r => ({ ...r, id: r._id })).sort((a, b) => ((b.date ?? b.createdAt) < (a.date ?? a.createdAt) ? -1 : 1))
  },
})

export const get = query({
  args: { id: v.id("os_sales_calls") },
  handler: async (ctx, { id }) => { const r = await ctx.db.get(id); return r ? { ...r, id: r._id } : null },
})

export const create = mutation({
  args: {
    title: v.string(), contactId: v.optional(v.string()), leadId: v.optional(v.string()), clientId: v.optional(v.string()),
    date: v.optional(v.string()), status: v.optional(v.string()), outcome: v.optional(v.string()),
    notes: v.optional(v.string()), summary: v.optional(v.string()), nextStep: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    return await ctx.db.insert("os_sales_calls", {
      workspaceId: WORKSPACE, title: a.title, contactId: a.contactId, leadId: a.leadId, clientId: a.clientId,
      date: a.date ?? now, status: a.status ?? "done", outcome: a.outcome, notes: a.notes, summary: a.summary,
      objections: [], nextStep: a.nextStep, createdBy: a.createdBy ?? "agent:chief_of_staff", createdAt: now, updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("os_sales_calls"), title: v.optional(v.string()), status: v.optional(v.string()), outcome: v.optional(v.string()),
    notes: v.optional(v.string()), summary: v.optional(v.string()), nextStep: v.optional(v.string()),
    objections: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...fields }) => {
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(fields)) if (val !== undefined) patch[k] = val
    await ctx.db.patch(id, patch)
  },
})

export const addObjection = mutation({
  args: { id: v.id("os_sales_calls"), objection: v.string() },
  handler: async (ctx, { id, objection }) => {
    const c = await ctx.db.get(id); if (!c) return
    await ctx.db.patch(id, { objections: [...(c.objections ?? []), objection], updatedAt: new Date().toISOString() })
  },
})

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return {
      total: rows.length,
      done: rows.filter(r => r.status === "done").length,
      planned: rows.filter(r => r.status === "planned").length,
      withObjections: rows.filter(r => (r.objections ?? []).length > 0).length,
    }
  },
})
