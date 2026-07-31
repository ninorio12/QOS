// Module Budget — les postes de dépense sont désormais des données, pas du code.
// On peut corriger un montant, ajouter un abonnement ou une dépense ponctuelle
// sans redéployer. Le premier chargement recopie la liste historique pour ne
// rien perdre.
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const SEED = [
  { label: "Claude Code",   details: "Anthropic — abonnement Max", amount: 200, currency: "USD", color: "#D97757" },
  { label: "Codex",         details: "OpenAI",                     amount: 100, currency: "USD", color: "#111111" },
  { label: "Convex",        details: "Pro — compte partagé",       amount: 25,  currency: "USD", color: "#EE342F" },
  { label: "Vercel",        details: "Pro — compte partagé",       amount: 20,  currency: "USD", color: "#111111" },
  { label: "Hermes Tools",  details: "Agents & serveur MCP",       amount: 20,  currency: "USD", color: "#FF4D00" },
  { label: "VPS Hostinger", details: "KVM",                        amount: 12,  currency: "USD", color: "#673DE6" },
  { label: "Clerk",         details: "Gratuit ≤ 50k utilisateurs", amount: 0,   currency: "USD", color: "#6C47FF" },
  { label: "Supermemory",   details: "Free tier",                  amount: 0,   currency: "USD", color: "#8B5CF6" },
]

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("budget_items")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    return rows.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.label.localeCompare(b.label))
  },
})

/** Recopie la liste historique au premier chargement, une seule fois. */
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("budget_items")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .first()
    if (existing) return { seeded: 0 }
    const now = new Date().toISOString()
    let i = 0
    for (const s of SEED) {
      await ctx.db.insert("budget_items", { workspaceId: WORKSPACE, ...s, recurrence: "mensuel", order: i++, updatedAt: now })
    }
    return { seeded: SEED.length }
  },
})

export const add = mutation({
  args: {
    label: v.string(), details: v.optional(v.string()),
    amount: v.number(), currency: v.optional(v.string()),
    recurrence: v.optional(v.string()), date: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const identity = await ctx.auth.getUserIdentity()
    const rows = await ctx.db
      .query("budget_items")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    return await ctx.db.insert("budget_items", {
      workspaceId: WORKSPACE,
      label: a.label.trim() || "Sans nom",
      details: a.details?.trim() || undefined,
      amount: a.amount,
      currency: a.currency ?? "CHF",
      recurrence: a.recurrence ?? "mensuel",
      date: a.date,
      order: rows.length,
      updatedBy: identity?.name ?? undefined,
      updatedAt: new Date().toISOString(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("budget_items"),
    label: v.optional(v.string()), details: v.optional(v.string()),
    amount: v.optional(v.number()), currency: v.optional(v.string()),
    recurrence: v.optional(v.string()), date: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const row = await ctx.db.get(a.id)
    if (!row || row.workspaceId !== WORKSPACE) throw new Error("Poste introuvable")
    const identity = await ctx.auth.getUserIdentity()
    const { id, ...patch } = a
    await ctx.db.patch(id, {
      ...Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined)),
      updatedBy: identity?.name ?? row.updatedBy,
      updatedAt: new Date().toISOString(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id("budget_items") },
  handler: async (ctx, a) => {
    const row = await ctx.db.get(a.id)
    if (!row || row.workspaceId !== WORKSPACE) throw new Error("Poste introuvable")
    await ctx.db.delete(a.id)
  },
})
