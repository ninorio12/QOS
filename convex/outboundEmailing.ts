import { v } from "convex/values"
import { query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// KPIs de la card « Emailing Outbound » du cockpit Performance.
// Funnel : sourcés → qualifiés A → decks → emails envoyés → RDV R1.
// V1 : données réelles de la loop (table outbound_leads + pipeline). Ouverture/clic/réponse = V2 (tracking à instrumenter).
const ENVOYE = ["email_envoye", "relance", "importe"]
const NON_VALIDE = ["a_auditer", "a_corriger", "rejete"]

export const summary = query({
  args: { from: v.string(), to: v.string(), tzOffset: v.optional(v.number()) },
  handler: async (ctx, { from, to }) => {
    const rows = (await ctx.db.query("outbound_leads")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
      .filter(r => { const d = r.createdAt.slice(0, 10); return d >= from && d <= to }) // borné à la période (cohérent avec le reste du cockpit)

    const sourced   = rows.length
    const validated = rows.filter(r => !NON_VALIDE.includes(r.etape)).length
    const decks     = rows.filter(r => !!r.deckUrl).length
    const envois    = rows.filter(r => ENVOYE.includes(r.etape)).length
    const reponses  = rows.filter(r => !!r.repondu_le).length   // leads ayant répondu au mail
    const aCorriger = rows.filter(r => r.etape === "a_corriger").length
    const rejetes   = rows.filter(r => r.etape === "rejete").length

    // RDV R1 issus de l'outbound (pipeline)
    const leads = await ctx.db.query("crm_leads").collect()
    const r1 = leads.filter(l => l.source === "outbound").length

    const tauxValideEnvoi = validated > 0 ? Math.round((envois / validated) * 100) : 0
    const tauxReponse = envois > 0 ? Math.round((reponses / envois) * 100) : 0   // réponses ÷ emails envoyés

    // Score = atteinte de TON objectif de taux de réponse (réglé dans le bouton Objectif, défaut 30%).
    // C'est le résultat qui compte : 0% de réponse → 0. Pas d'envoi → 0.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objDoc = await ctx.db.query("prospection_objectives").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).first()
    const objReponse = objDoc?.tauxReponse ?? 30
    // Aucun email envoyé = pas de données → N/A (null), pas un score trompeur.
    const score = envois > 0 ? Math.max(0, Math.min(100, Math.round((tauxReponse / (objReponse || 1)) * 100))) : null
    const tone: "bon" | "surveillance" | "critique" | "vide" = score === null ? "vide" : score >= 70 ? "bon" : score >= 40 ? "surveillance" : "critique"

    const diagnostic = sourced === 0
      ? `Pas encore de prospection outbound lancée.`
      : envois === 0
      ? `Les leads sont prêts, il ne reste plus qu'à envoyer les emails.`
      : `Les emails partent bien, la prospection outbound est en route.`

    return { sourced, validated, decks, envois, reponses, aCorriger, rejetes, r1, tauxValideEnvoi, tauxReponse, score, tone, diagnostic }
  },
})
