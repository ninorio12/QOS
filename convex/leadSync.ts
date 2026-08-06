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

// ── Mapping canonique colonnes Prospection ⇄ stages Pipeline Leads (leads outbound) ──
// Source unique pour les DEUX sens, évite toute dérive entre osProspection et leadSync.
export const NRP_COLUMNS = ["nrp1", "nrp2", "nrp3", "nrp4"]
// Sens Prospection → Leads : une colonne = un stage.
export const LEAD_STAGE_FOR_COLUMN: Record<string, string> = {
  leads_a_traiter: "nouveau-lead",
  leads_interne: "nouveau-lead",   // ancienne colonne, conservée pour les enregistrements d'avant la fusion
  nrp1: "conversation", nrp2: "conversation", nrp3: "conversation", nrp4: "conversation",
  // Un rendez-vous booké ne fait PAS avancer le lead : il a réservé, personne ne
  // lui a encore parlé. Il reste donc en « Nouveaux leads », et c'est l'appel de
  // clarté du setter qui le fait entrer en R1 (voir clarityDone).
  rdv_booke: "nouveau-lead",
  a_suivre: "conversation",   // lead parqué (à reprendre plus tard) → reste ouvert en conversation
  perdu: "conversation",
}
// Sens Leads → Prospection : un stage = une colonne.
// "conversation" garde la NRP courante si déjà en NRP, sinon NRP 1 (1ʳᵉ relance).
// R1/R2 → RDV booké (post-handoff). nouveau-client/inconnu → null = ne pas déplacer la colonne.
export function columnForLeadStage(stageId: string, currentCol?: string): string | null {
  // Les deux colonnes d'entrée n'en font plus qu'une.
  if (stageId === "nouveau-lead") {
    if (currentCol && (currentCol === "rdv_booke" || currentCol === "a_suivre" || NRP_COLUMNS.includes(currentCol))) return currentCol
    return "leads_a_traiter"
  }
  if (stageId === "conversation") {
    if (currentCol && (NRP_COLUMNS.includes(currentCol) || currentCol === "rdv_booke" || currentCol === "a_suivre")) return currentCol
    return "nrp1"
  }
  // Un lead ramené en « Nouveaux leads » alors que sa carte est déjà au
  // rendez-vous ou en suivi ne redescend pas : la colonne dit ce qui s'est
  // passé, l'étape du pipeline dit ce qui est validé.
  if (stageId === "r1" || stageId === "r2") return "rdv_booke"
  return null
}

// Déplace le lead Pipeline + miroir colonne Prospection. stageId: 'nouveau-lead'|'conversation'|'r1'|'r2'
// Idempotent : ne patch/insère l'historique du lead que si le stage change réellement ;
// le miroir prospection (status + boardColumn) s'exécute toujours → la carte Prospection suit la
// carte Leads (et inversement via osProspection.setColumn).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function moveStage(ctx: any, contactId: string, stageId: string) {
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && lead.status === "open" && lead.stageId !== stageId) {
    await ctx.db.patch(lead._id, { stageId })
    await ctx.db.insert("lead_stage_history", { leadId: lead._id, stageId, stageName: stageId, enteredAt: today() })
  }
  const rec = await prospForContact(ctx, contactId)
  if (rec) {
    const patch: Record<string, unknown> = {}
    const status = stageId === "r1" || stageId === "r2" ? "handoff" : "active"
    if (rec.status !== status) patch.status = status
    // Miroir de COLONNE (avant : seul le status était synchronisé → carte Prospection figée).
    const targetCol = columnForLeadStage(stageId, rec.boardColumn)
    if (targetCol && rec.boardColumn !== targetCol) patch.boardColumn = targetCol
    if (Object.keys(patch).length) await ctx.db.patch(rec._id, { ...patch, updatedAt: now() })
  }
}

// Marque perdu partout. stage = stade au moment de la perte ('nouveau-lead'|'conversation') ; dérivé si non fourni.
// Idempotent sur le lead et le record (ne repatch pas si déjà lost).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function markLost(ctx: any, contactId: string, opts: { reason?: string; stage?: string; objection?: string; by?: string }) {
  const by = opts.by ?? "human:thomas"
  const rec = await prospForContact(ctx, contactId)
  const stage = opts.stage ?? (rec && (rec.phase1Status || rec.phase2Status || rec.phase3Status) ? "conversation" : "nouveau-lead")
  const lead = await ctx.db.query("crm_leads").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (lead && lead.status !== "lost") await ctx.db.patch(lead._id, { status: "lost" })
  // Contact = source de vérité : statut + ÉTAPE de perte + raison/objection RÉELLES (quand fournies).
  const contactPatch: Record<string, unknown> = { statut: "perdu", leadStatus: "non_qualifie", lostStage: stage, updatedAt: now() }
  if (opts.reason !== undefined) contactPatch.lostReason = opts.reason
  if (opts.objection !== undefined) contactPatch.lostObjection = opts.objection
  await ctx.db.patch(contactId as Id<"crm_contacts">, contactPatch)
  if (rec && rec.status !== "lost") {
    await ctx.db.patch(rec._id, { status: "lost", lostReason: opts.reason ?? "autre", lostStage: stage, updatedAt: now() })
    await ctx.db.insert("prospection_events", { workspaceId: WORKSPACE, prospectionRecordId: rec._id, contactId, eventType: "perdu", phase: stage, createdBy: by, createdAt: now() })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = await ctx.db.get(contactId as Id<"crm_contacts">) as any
  const cName = c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "contact"
  await logActivity(ctx, { actorType: by.startsWith("agent") ? "agent" : "human", actorId: by, eventType: "lead.lost", summary: `Perdu (${stage}) — ${cName}`, entityType: "prospection", entityId: rec?._id ?? contactId, source: "leadSync" })
}
