import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("os_agents").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.map(r => ({ ...r, id: r._id })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  },
})

export const upsert = mutation({
  args: {
    id:       v.optional(v.id("os_agents")),
    name:     v.string(),
    role:     v.string(),
    status:   v.optional(v.string()),
    lane:     v.optional(v.string()),
    autonomy: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
    tools:    v.optional(v.array(v.string())),
    health:   v.optional(v.string()),
    order:    v.optional(v.number()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const now = new Date().toISOString()
    if (id) { await ctx.db.patch(id, { ...rest, updatedAt: now }); return id }
    return await ctx.db.insert("os_agents", {
      workspaceId: WORKSPACE,
      name: rest.name, role: rest.role,
      status: rest.status ?? "active",
      lane: rest.lane, autonomy: rest.autonomy ?? "suggest",
      channels: rest.channels ?? ["dataos"], tools: rest.tools ?? [],
      health: rest.health ?? "ok", order: rest.order ?? 0, updatedAt: now,
    })
  },
})

export const updateStatus = mutation({
  args: { id: v.id("os_agents"), status: v.string() },
  handler: async (ctx, { id, status }) => { await ctx.db.patch(id, { status, lastActiveAt: new Date().toISOString(), updatedAt: new Date().toISOString() }) },
})

export const setEmail = mutation({
  args: { id: v.id("os_agents"), email: v.string() },
  handler: async (ctx, { id, email }) => { await ctx.db.patch(id, { email: email.trim() || undefined, updatedAt: new Date().toISOString() }) },
})

export const remove = mutation({
  args: { id: v.id("os_agents") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id) },
})

// Seed the 4 operational agents if none exist yet
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("os_agents").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    if (existing) return { seeded: false }
    const now = new Date().toISOString()
    const seeds = [
      { name: "COO",          role: "Coordination opérationnelle",      lane: "Direction", autonomy: "execute",   channels: ["slack", "telegram", "dataos"], tools: ["tasks", "activities", "knowledge"], order: 0 },
      { name: "CSM",          role: "Suivi client",                     lane: "Clients",   autonomy: "suggest",   channels: ["dataos", "telegram"],          tools: ["tasks", "activities"],              order: 1 },
      { name: "KB Executor",  role: "Bibliothécaire mémoire / Data OS", lane: "Mémoire",   autonomy: "suggest",   channels: ["dataos"],                      tools: ["knowledge", "activities"],          order: 2 },
      { name: "Ops Executor", role: "Exécution opérationnelle",         lane: "Ops",       autonomy: "execute",   channels: ["dataos", "slack"],             tools: ["tasks", "activities"],              order: 3 },
      { name: "Data Analyst", role: "Analyse & scraping",               lane: "Data",      autonomy: "suggest",   channels: ["dataos"],                      tools: ["activities"],                       order: 4 },
    ]
    for (const s of seeds) {
      await ctx.db.insert("os_agents", { workspaceId: WORKSPACE, status: "active", health: "ok", updatedAt: now, ...s })
    }
    return { seeded: true, count: seeds.length }
  },
})
