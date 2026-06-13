import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// ───────────────────────────────────────────────────────────────────────────
// Handoffs — transfert de responsabilité entre agents. Un handoff NE DONNE PAS
// de droit : le receveur doit déjà posséder le scope sur l'entité pour agir.
// L'autorisation (qui peut create/accept/route) est vérifiée en amont par enforce().
// ───────────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

export const create = mutation({
  args: {
    fromAgentId: v.id("os_agents"), toAgentSlug: v.string(), entityType: v.string(), entityId: v.string(),
    reason: v.string(), context: v.optional(v.any()), priority: v.optional(v.string()), slaDueAt: v.optional(v.string()), createdBy: v.string(),
  },
  handler: async (ctx, a) => {
    const id = await ctx.db.insert("os_handoffs", { workspaceId: WORKSPACE, ...a, status: "pending", createdAt: now() })
    await ctx.db.insert("os_activities", {
      workspaceId: WORKSPACE, actorType: "agent", actorId: a.createdBy, source: "dataos",
      eventType: "handoff.created", entityType: a.entityType, entityId: a.entityId,
      summary: `Handoff → ${a.toAgentSlug} : ${a.reason}`, createdAt: now(),
    })
    return { ok: true, handoffId: id }
  },
})

export const accept = mutation({
  args: { handoffId: v.id("os_handoffs"), acceptedBy: v.string() },
  handler: async (ctx, { handoffId, acceptedBy }) => {
    const h = await ctx.db.get(handoffId)
    if (!h) throw new Error("handoff introuvable")
    if (h.status !== "pending") throw new Error(`handoff déjà ${h.status}`)
    await ctx.db.patch(handoffId, { status: "accepted", acceptedBy, acceptedAt: now() })
    // Réassigne l'entité quand c'est une tâche.
    if (h.entityType === "task") { try { await ctx.db.patch(h.entityId as never, { assigneeType: "agent", assigneeId: h.toAgentSlug, updatedAt: now() }) } catch { /* entité non patchable */ } }
    await ctx.db.insert("os_activities", {
      workspaceId: WORKSPACE, actorType: "agent", actorId: acceptedBy, source: "dataos",
      eventType: "handoff.accepted", entityType: h.entityType, entityId: h.entityId,
      summary: `Handoff accepté par ${acceptedBy}`, createdAt: now(),
    })
    return { ok: true }
  },
})

export const complete = mutation({
  args: { handoffId: v.id("os_handoffs"), note: v.optional(v.string()) },
  handler: async (ctx, { handoffId, note }) => {
    const h = await ctx.db.get(handoffId)
    if (!h) throw new Error("handoff introuvable")
    await ctx.db.patch(handoffId, { status: "completed", completedAt: now(), note })
    return { ok: true }
  },
})

export const list = query({
  args: { toAgentSlug: v.optional(v.string()), status: v.optional(v.string()) },
  handler: async (ctx, { toAgentSlug, status }) => {
    if (toAgentSlug) {
      const rows = await ctx.db.query("os_handoffs").withIndex("by_to", q => q.eq("toAgentSlug", toAgentSlug)).collect()
      return rows.filter(r => !status || r.status === status).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    }
    const rows = await ctx.db.query("os_handoffs").collect()
    return rows.filter(r => !status || r.status === status).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
})
