import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any

const now = () => new Date().toISOString()
const norm = (s?: string | null) => (s ?? "").toLowerCase().trim()

// Matche le client par email puis par nom complet (contrepartie du virement).
async function matchContact(ctx: Any, counterparty?: string, email?: string): Promise<string | undefined> {
  const contacts = await ctx.db.query("crm_contacts").collect()
  if (email) { const m = contacts.find((c: Any) => norm(c.email) === norm(email)); if (m) return m._id }
  if (counterparty) {
    const m = contacts.find((c: Any) => norm(`${c.firstName} ${c.lastName ?? ""}`) === norm(counterparty))
    if (m) return m._id
  }
  return undefined
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("external_payments").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows.sort((a: Any, b: Any) => String(b.date).localeCompare(String(a.date)))
  },
})

// Statut connexion Revolut (badge du module Paiement).
export const revolutStatus = query({
  args: {},
  handler: async (ctx) => {
    const conn = await ctx.db.query("revolut_connection").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).first()
    const rows = await ctx.db.query("external_payments").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const count = rows.filter((p: Any) => p.method === "revolut").length
    return { connected: !!conn?.accessToken || count > 0, accountName: conn?.accountName ?? null, count }
  },
})

// Saisie manuelle d'un virement reçu (Revolut Pro ou autre), utilisable tout de suite.
export const createManual = mutation({
  args: {
    amount: v.number(), currency: v.optional(v.string()), counterparty: v.optional(v.string()),
    reference: v.optional(v.string()), date: v.optional(v.string()), method: v.optional(v.string()),
    contactId: v.optional(v.string()), note: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const contactId = a.contactId ?? await matchContact(ctx, a.counterparty)
    const id = await ctx.db.insert("external_payments", {
      workspaceId: WORKSPACE, method: a.method ?? "virement", amount: a.amount, currency: a.currency ?? "CHF",
      counterparty: a.counterparty, reference: a.reference, contactId: contactId as Any, date: a.date ?? now(),
      state: "completed", note: a.note, createdBy: "manual", createdAt: now(),
    })
    return { id }
  },
})

// Enregistrement d'un virement Revolut (appelé par le webhook /api/webhooks/revolut). Dédup par externalId.
export const recordRevolut = mutation({
  args: {
    externalId: v.string(), amount: v.number(), currency: v.optional(v.string()),
    counterparty: v.optional(v.string()), reference: v.optional(v.string()), date: v.string(), state: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const contactId = await matchContact(ctx, a.counterparty)
    const existing = await ctx.db.query("external_payments").withIndex("by_external", q => q.eq("externalId", a.externalId)).first()
    const patch = {
      amount: a.amount, currency: a.currency ?? "CHF", counterparty: a.counterparty, reference: a.reference,
      date: a.date, state: a.state ?? "completed", contactId: contactId as Any,
    }
    if (existing) { await ctx.db.patch(existing._id, patch); return { id: existing._id, created: false } }
    const id = await ctx.db.insert("external_payments", {
      workspaceId: WORKSPACE, method: "revolut", externalId: a.externalId, ...patch, createdBy: "revolut-webhook", createdAt: now(),
    })
    return { id, created: true }
  },
})

export const remove = mutation({
  args: { id: v.id("external_payments") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id); return { ok: true } },
})
