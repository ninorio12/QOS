import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Réponses du formulaire de confirmation (page /confirmation, post-booking R1).
// `create` est appelée par la route Next /api/confirmation. On tente de lier le
// prospect à sa fiche contact par email (sinon il reste non-lié, rattachable à la main).

const norm = (s?: string) => (s ?? "").trim().toLowerCase()

export const create = mutation({
  args: {
    email:             v.optional(v.string()),
    fullName:          v.string(),
    company:           v.optional(v.string()),
    companyType:       v.optional(v.string()),
    headcount:         v.optional(v.string()),
    monthlyRevenue:    v.optional(v.string()),
    costliestFunction: v.optional(v.string()),
    repetitiveCost:    v.optional(v.string()),
    whyNow:            v.optional(v.string()),
    timing:            v.optional(v.string()),
    budget:            v.optional(v.string()),
    answersJson:       v.optional(v.string()),
    raw:               v.optional(v.any()),
  },
  handler: async (ctx, a) => {
    // Auto-lien à la fiche contact par email (best-effort).
    let contactId: string | undefined
    if (a.email) {
      const target = norm(a.email)
      const contacts = await ctx.db.query("crm_contacts").collect()
      const match = contacts.find((c: any) => norm(c.email) === target)
      if (match) contactId = match._id
    }
    const id = await ctx.db.insert("confirmation_intake", {
      workspaceId: WORKSPACE,
      contactId: contactId as any,
      email: a.email,
      fullName: a.fullName,
      company: a.company,
      companyType: a.companyType,
      headcount: a.headcount,
      monthlyRevenue: a.monthlyRevenue,
      costliestFunction: a.costliestFunction,
      repetitiveCost: a.repetitiveCost,
      whyNow: a.whyNow,
      timing: a.timing,
      budget: a.budget,
      answersJson: a.answersJson,
      raw: a.raw,
      source: "confirmation-form",
      createdAt: new Date().toISOString(),
    })
    return { ok: true, id, linked: !!contactId }
  },
})

// Dernière soumission pour un contact (par contactId, sinon par email).
export const listForContact = query({
  args: { contactId: v.optional(v.id("crm_contacts")), email: v.optional(v.string()) },
  handler: async (ctx, { contactId, email }) => {
    let rows: any[] = []
    if (contactId) {
      rows = await ctx.db.query("confirmation_intake").withIndex("by_contact", q => q.eq("contactId", contactId)).collect()
    } else if (email) {
      rows = await ctx.db.query("confirmation_intake").withIndex("by_email", q => q.eq("workspaceId", WORKSPACE).eq("email", email)).collect()
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return rows[0] ?? null
  },
})

// Rattacher manuellement une soumission non-liée à une fiche contact.
export const linkToContact = mutation({
  args: { id: v.id("confirmation_intake"), contactId: v.id("crm_contacts") },
  handler: async (ctx, { id, contactId }) => {
    await ctx.db.patch(id, { contactId })
    return { ok: true }
  },
})
