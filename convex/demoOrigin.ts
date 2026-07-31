// Démonstration : habiller une carte existante comme si le lead venait de Meta.
//
// Sert à VOIR le rendu des puces (origine Facebook + étape du tunnel) sur une
// carte réelle, sans attendre un vrai lead publicitaire. Entièrement réversible
// par `clear`, qui remet la carte dans son état d'origine.
import { internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const now = () => new Date().toISOString()

export const dress = internalMutation({
  args: { recordId: v.id("prospection_records"), step: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const rec = await ctx.db.get(a.recordId)
    if (!rec) throw new Error("Carte introuvable")
    await ctx.db.patch(a.recordId, { origin: "facebook", cadrage: true, updatedAt: now() })

    const contact = await ctx.db.get(rec.contactId as never)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email = (contact as any)?.email as string | undefined
    const step = a.step ?? "rdv_pris"
    const ORDER = ["formulaire", "quiz_ouvert", "quiz_termine", "rdv_pris"]
    const steps = ORDER.slice(0, ORDER.indexOf(step) + 1).map((s) => ({ step: s, at: now(), meta: undefined }))

    const existing = (await ctx.db.query("os_lead_journey").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect())
      .find((j) => j.contactId === String(rec.contactId))
    if (existing) await ctx.db.patch(existing._id, { steps, updatedAt: now() })
    else {
      await ctx.db.insert("os_lead_journey", {
        workspaceId: WORKSPACE,
        token: `demo${String(rec.contactId).slice(-6)}`,
        contactId: String(rec.contactId),
        leadId: rec.leadId,
        funnel: "quiz",
        email,
        name: "démonstration",
        steps,
        createdAt: now(), updatedAt: now(),
      })
    }
    return { ok: true, step }
  },
})

export const clear = internalMutation({
  args: { recordId: v.id("prospection_records") },
  handler: async (ctx, a) => {
    const rec = await ctx.db.get(a.recordId)
    if (!rec) throw new Error("Carte introuvable")
    await ctx.db.patch(a.recordId, { origin: undefined, updatedAt: now() })
    const j = (await ctx.db.query("os_lead_journey").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect())
      .find((x) => x.contactId === String(rec.contactId) && x.name === "démonstration")
    if (j) await ctx.db.delete(j._id)
    return { ok: true }
  },
})
