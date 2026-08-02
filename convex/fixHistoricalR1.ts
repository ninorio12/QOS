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
