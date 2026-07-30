// Creative Intelligence — le moteur de verdicts du cockpit Media Buyer.
//
// Principe : des règles DÉTERMINISTES et explicables, jamais un avis vague.
// Chaque proposition porte sa raison chiffrée ; l'humain valide, refuse ou
// modifie ; tout reste dans os_ads_decisions. L'agent Slack Media Buyer peut
// déposer ses propres propositions par `propose` : même table, même circuit.
//
// Garde-fous :
//  - kill/scale/watch ne visent que les pubs ACTIVES : couper une pub déjà
//    arrêtée depuis des mois n'est pas une décision, c'est du bruit.
//  - `variant` (leçons de créa) s'autorise l'historique : un hook faible d'il y
//    a six mois reste une leçon pour la prochaine production.
//  - un couple (pub, verdict) n'est proposé qu'UNE fois : un refus humain n'est
//    jamais re-proposé à l'identique.
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const r1 = (n: number) => Math.round(n * 10) / 10
const chf = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("fr-CH")} CHF`

// Seuils métier (les mêmes que le playbook média : rien d'inventé, rien de caché).
const KILL_MIN_SPEND = 20      // CHF dépensés sans résultat avant de proposer la coupe
const SCALE_MIN_RESULTS = 2
const SCALE_CPA_RATIO = 0.7    // CPA ≤ 70 % de la médiane du compte
const KILL_CPA_RATIO = 2       // CPA ≥ 200 % de la médiane
const FATIGUE_FREQUENCY = 2.5
const HOOK_FLOOR = 20          // % : sous ça, l'accroche ne retient pas
const HOLD_FLOOR = 15          // % : sous ça (avec bon hook), le corps perd les gens
const VARIANT_MIN_SPEND = 10

export const analyze = mutation({
  args: {},
  handler: async (ctx) => {
    const creatives = await ctx.db
      .query("meta_creatives")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const existing = await ctx.db
      .query("os_ads_decisions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const seen = new Set(existing.map((d) => `${d.refId}|${d.verdict}`))

    // Médiane du CPA sur les créas qui ont produit : la référence du compte.
    const cpas = creatives.filter((c) => (c.results ?? 0) > 0 && c.cpa).map((c) => c.cpa!).sort((a, b) => a - b)
    const medianCpa = cpas.length ? cpas[Math.floor(cpas.length / 2)] : null

    let proposed = 0
    const push = async (c: (typeof creatives)[number], verdict: "scale" | "kill" | "watch" | "variant", reason: string, action: string) => {
      if (seen.has(`${c.adId}|${verdict}`)) return
      seen.add(`${c.adId}|${verdict}`)
      await ctx.db.insert("os_ads_decisions", {
        workspaceId: WORKSPACE, scope: "ad" as const, refId: c.adId, refName: c.name,
        verdict, reason, action, status: "proposed" as const, proposedBy: "engine", createdAt: Date.now(),
      })
      proposed++
    }

    for (const c of creatives) {
      const spend = c.spend ?? 0
      if (spend <= 0) continue
      const live = c.status === "ACTIVE"
      const results = c.results ?? 0

      if (live) {
        if (results === 0 && spend >= KILL_MIN_SPEND) {
          await push(c, "kill",
            `${chf(spend)} dépensés, 0 résultat${c.ctrOutbound != null ? ` (CTR sortant ${r1(c.ctrOutbound)} %)` : ""}.`,
            "Couper cette publicité.")
        } else if (medianCpa && c.cpa && results > 0 && c.cpa >= medianCpa * KILL_CPA_RATIO && spend >= KILL_MIN_SPEND) {
          await push(c, "kill",
            `CPA ${chf(c.cpa)} : ${r1((c.cpa / medianCpa) * 100)} % de la médiane du compte (${chf(medianCpa)}).`,
            "Couper, réallouer le budget aux créas sous la médiane.")
        } else if (medianCpa && c.cpa && results >= SCALE_MIN_RESULTS && c.cpa <= medianCpa * SCALE_CPA_RATIO) {
          await push(c, "scale",
            `CPA ${chf(c.cpa)}, ${r1((1 - c.cpa / medianCpa) * 100)} % sous la médiane (${chf(medianCpa)}), ${results} résultats.`,
            "Monter le budget par paliers de 15 % max, un palier par 48 h.")
        }
        if ((c.frequency ?? 0) >= FATIGUE_FREQUENCY) {
          await push(c, "watch",
            `Fréquence ${r1(c.frequency!)} : l'audience revoit trop souvent la même créa.`,
            "Préparer la rotation : nouvelle créa ou élargir l'audience.")
        }
      }

      // Leçons de créa (historique compris) : où la variante doit travailler.
      if (spend >= VARIANT_MIN_SPEND && c.hookRate != null) {
        if (c.hookRate < HOOK_FLOOR) {
          await push(c, "variant",
            `Hook ${r1(c.hookRate)} % (plancher sain ${HOOK_FLOOR} %) : l'accroche ne retient pas.`,
            "Produire une variante en ne changeant QUE les 3 premières secondes.")
        } else if (c.holdRate != null && c.holdRate < HOLD_FLOOR) {
          await push(c, "variant",
            `Hook ${r1(c.hookRate)} % mais hold ${r1(c.holdRate)} % : l'accroche tient, le corps perd les gens.`,
            "Garder l'accroche, resserrer le corps (rythme, promesse plus tôt).")
        } else if ((c.ctrOutbound ?? 0) >= 1 && results === 0 && c.cvr == null) {
          await push(c, "variant",
            `CTR sortant ${r1(c.ctrOutbound!)} % mais aucune conversion mesurée : le problème est après le clic.`,
            "Vérifier la page d'atterrissage et l'offre avant de refaire la créa.")
        }
      }
    }
    return { proposed, analyzed: creatives.filter((c) => (c.spend ?? 0) > 0).length, medianCpa }
  },
})

/** Dépôt d'une proposition par l'agent (ou un humain) : même circuit que le moteur. */
export const propose = mutation({
  args: {
    scope: v.union(v.literal("ad"), v.literal("adset"), v.literal("campaign")),
    refId: v.string(), refName: v.string(),
    verdict: v.union(v.literal("scale"), v.literal("kill"), v.literal("watch"), v.literal("variant")),
    reason: v.string(), action: v.string(),
    proposedBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const dup = await ctx.db
      .query("os_ads_decisions")
      .withIndex("by_ws_ref", (q) => q.eq("workspaceId", WORKSPACE).eq("refId", a.refId))
      .collect()
    if (dup.some((d) => d.verdict === a.verdict && d.status === "proposed")) return { duplicated: true }
    await ctx.db.insert("os_ads_decisions", {
      workspaceId: WORKSPACE, scope: a.scope, refId: a.refId, refName: a.refName,
      verdict: a.verdict, reason: a.reason, action: a.action,
      status: "proposed" as const, proposedBy: a.proposedBy ?? "agent", createdAt: Date.now(),
    })
    return { duplicated: false }
  },
})

/** L'humain tranche : valider, refuser, ou modifier l'action avant validation. */
export const decide = mutation({
  args: {
    id: v.id("os_ads_decisions"),
    decision: v.union(v.literal("approved"), v.literal("rejected"), v.literal("modified")),
    action: v.optional(v.string()),  // requis quand decision = modified
    note: v.optional(v.string()),
    decidedBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const row = await ctx.db.get(a.id)
    if (!row || row.workspaceId !== WORKSPACE) throw new Error("Décision introuvable")
    await ctx.db.patch(a.id, {
      status: a.decision,
      ...(a.decision === "modified" && a.action ? { action: a.action } : {}),
      note: a.note,
      decidedBy: a.decidedBy ?? "humain",
      decidedAt: Date.now(),
    })
  },
})

/** Propositions ouvertes, plus récentes d'abord. */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("os_ads_decisions")
      .withIndex("by_ws_status", (q) => q.eq("workspaceId", WORKSPACE).eq("status", "proposed"))
      .collect()
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },
})

/** Historique des décisions tranchées (50 dernières). */
export const history = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("os_ads_decisions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    return rows
      .filter((r) => r.status !== "proposed")
      .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))
      .slice(0, 50)
  },
})
