import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

export const list = query({
  args: { contactId: v.optional(v.string()), leadId: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, f) => {
    let rows = await ctx.db.query("os_outreach").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    if (f.contactId) rows = rows.filter(r => r.contactId === f.contactId)
    if (f.leadId)    rows = rows.filter(r => r.leadId === f.leadId)
    if (f.status)    rows = rows.filter(r => r.status === f.status)
    return rows.map(r => ({ ...r, id: r._id })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
})

export const create = mutation({
  args: {
    channel: v.string(), contactId: v.optional(v.string()), leadId: v.optional(v.string()),
    message: v.optional(v.string()), status: v.optional(v.string()), sentAt: v.optional(v.string()),
    nextFollowUpAt: v.optional(v.string()), notes: v.optional(v.string()), createdBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    return await ctx.db.insert("os_outreach", {
      workspaceId: WORKSPACE, channel: a.channel, contactId: a.contactId, leadId: a.leadId, message: a.message,
      status: a.status ?? "draft", sentAt: a.sentAt, nextFollowUpAt: a.nextFollowUpAt, notes: a.notes,
      createdBy: a.createdBy ?? "agent:chief_of_staff", createdAt: now, updatedAt: now,
    })
  },
})

export const update = mutation({
  args: { id: v.id("os_outreach"), status: v.optional(v.string()), message: v.optional(v.string()), sentAt: v.optional(v.string()), nextFollowUpAt: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, { id, ...fields }) => {
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(fields)) if (val !== undefined) patch[k] = val
    await ctx.db.patch(id, patch)
  },
})

export const followupDue = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const rows = await ctx.db.query("os_outreach").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.filter(r => r.nextFollowUpAt && r.nextFollowUpAt <= now && r.status !== "done" && r.status !== "replied").map(r => ({ ...r, id: r._id }))
  },
})

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const rows = await ctx.db.query("os_outreach").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return {
      total: rows.length,
      sent: rows.filter(r => r.status === "sent").length,
      replied: rows.filter(r => r.status === "replied").length,
      followupDue: rows.filter(r => r.nextFollowUpAt && r.nextFollowUpAt <= now && r.status !== "done" && r.status !== "replied").length,
    }
  },
})
