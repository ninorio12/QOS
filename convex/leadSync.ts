// convex/leadSync.ts
import { type Id } from "./_generated/dataModel"
import { WORKSPACE, logActivity } from "./osLib"
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().split("T")[0]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function prospForContact(ctx: any, contactId: string) {
  return (await ctx.db.query("prospection_records").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
    .find((r: any) => r.contactId === contactId && r.status !== "archived")
}

// Déplace le lead Pipeline + miroir colonne Prospection. stageId: 'nouveau-lead'|'conversation'|'r1'
// Idempotent : ne patch/insère l'historique du lead que si le stage change réellement ;
// le miroir prospection s'exécute toujours (sert aussi quand l'appel vient du Kanban après patch).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function moveStage(ctx: any, contactId: string, stageId: string) {
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && lead.status === "open" && lead.stageId !== stageId) {
    await ctx.db.patch(lead._id, { stageId })
    await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId, stageName: stageId, enteredAt: today() })
  }
  const rec = await prospForContact(ctx, contactId)
  if (rec) {
    const status = stageId === "r1" ? "handoff" : "active"
    if (rec.status !== status) await ctx.db.patch(rec._id, { status, updatedAt: now() })
  }
}

// Marque perdu partout. stage = stade au moment de la perte ('nouveau-lead'|'conversation') ; dérivé si non fourni.
// Idempotent sur le lead et le record (ne repatch pas si déjà lost).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markLost(ctx: any, contactId: string, opts: { reason?: string; stage?: string; by?: string }) {
  const by = opts.by ?? "human:thomas"
  const rec = await prospForContact(ctx, contactId)
  const stage = opts.stage ?? (rec && (rec.phase1Status || rec.phase2Status || rec.phase3Status) ? "conversation" : "nouveau-lead")
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && lead.status !== "lost") await ctx.db.patch(lead._id, { status: "lost" })
  await ctx.db.patch(contactId as Id<"crm_contacts">, { statut: "perdu", leadStatus: "non_qualifie", updatedAt: now() })
  if (rec && rec.status !== "lost") {
    await ctx.db.patch(rec._id, { status: "lost", lostReason: opts.reason ?? "autre", lostStage: stage, updatedAt: now() })
    await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: rec._id, contactId, eventType: "perdu", phase: stage, createdBy: by, createdAt: now() })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = await ctx.db.get(contactId as Id<"crm_contacts">) as any
  const cName = c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "contact"
  await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "lead.lost", summary: `Perdu (${stage}) — ${cName}`, entityType: "prospection", entityId: rec?._id ?? contactId, source: "leadSync" })
}
