import { internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

/**
 * Reprise d'historique : marquer un lead comme ayant eu son R1 AVANT le Data OS
 * (décision Jonathan 2026-08-02 : les leads de recommandation ont tous eu un R1,
 * même quand il s'est tenu hors du système). On avance le stage du lead et on
 * enregistre l'appel comme TENU, sinon le taux de show le compterait absent.
 */
export const markPastR1 = internalMutation({
  args: { leadId: v.id("crm_leads"), date: v.string(), title: v.string() },
  handler: async (ctx, a) => {
    const lead = await ctx.db.get(a.leadId)
    if (!lead) return { ok: false, reason: "lead introuvable" }
    if (lead.stageId !== "nouveau-lead" && lead.stageId !== "conversation") {
      return { ok: false, reason: `déjà au stade ${lead.stageId}` }
    }
    await ctx.db.patch(a.leadId, { stageId: "r1" })
    await ctx.db.insert("os_sales_calls", {
      workspaceId: WORKSPACE, title: a.title, contactId: lead.contactId ? String(lead.contactId) : undefined,
      stage: "R1", status: "done", date: new Date(a.date + "T10:00:00.000Z").toISOString(),
      createdBy: "reprise-historique", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    return { ok: true }
  },
})

/**
 * Même reprise d'historique pour un R2 TENU avant le Data OS : on enregistre
 * l'appel comme fait, ce qui le compte à la fois en « R2 bookés » et en
 * « Shows en R2 » (décision Jonathan 2026-08-02 pour Gallo et Rafaela).
 */
export const markPastR2 = internalMutation({
  args: { contactId: v.string(), date: v.string(), title: v.string() },
  handler: async (ctx, a) => {
    const existing = (await ctx.db.query("os_sales_calls").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect())
      .find((c) => String(c.contactId) === a.contactId && c.stage === "R2")
    if (existing) return { ok: false, reason: "un R2 existe déjà" }
    await ctx.db.insert("os_sales_calls", {
      workspaceId: WORKSPACE, title: a.title, contactId: a.contactId,
      stage: "R2", status: "done", date: new Date(a.date + "T10:00:00.000Z").toISOString(),
      createdBy: "reprise-historique", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    return { ok: true }
  },
})
