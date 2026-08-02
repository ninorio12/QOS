import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"
import { localDay } from "./timeLib"
import { partitionCohort } from "./performance"
import { funnelCohort } from "./funnelCohort"
import { funnelCampaignFilter } from "./mediaBuyer"

/**
 * Rapport quotidien d'acquisition, écrit chaque matin dans la Synthèse du
 * module Meta Ads (décision Jonathan 2026-08-02 : dans le Data OS, pas par
 * email). Il couvre la journée écoulée : publicité, entonnoir du parcours,
 * créas, et ce qui demande une action.
 *
 * Aucun chiffre inventé : une source absente s'écrit « pas de donnée ».
 */

const CHF = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} CHF`
const pct = (n: number) => `${(Math.round(n * 10) / 10).toString().replace(".", ",")} %`

/** Rassemble les chiffres de la veille (query : lecture seule). */
export const gather = internalQuery({
  args: { day: v.string(), funnel: v.string() },
  handler: async (ctx, a) => {
    const dayOf = (iso: string) => localDay(iso, 120)
    const contacts = await ctx.db.query("crm_contacts").collect()
    const leads = await ctx.db.query("crm_leads").collect()
    const { cohortContacts, cohortLeads } = partitionCohort(contacts, leads, a.funnel)
    const salesCalls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    const fcDay = funnelCohort(cohortContacts, cohortLeads, a.day, a.day, dayOf, salesCalls)
    const fcAll = funnelCohort(cohortContacts, cohortLeads, "2000-01-01", a.day, dayOf, salesCalls)

    // Publicité du jour, restreinte aux campagnes du parcours.
    const flt = await funnelCampaignFilter(ctx, a.funnel)
    const day = flt.funnelDaily.find((d) => d.date === a.day)
    // Détail par créa (niveau publicité) sur la journée.
    const creaRows = (await ctx.db.query("meta_object_daily")
      .withIndex("by_ws_level_date", (q) => q.eq("workspaceId", WORKSPACE).eq("level", "creative")).collect())
      .filter((r) => r.date === a.day && flt.allowedCampaignNames.has(r.campaign ?? ""))
    const byCrea = new Map<string, { name: string; spend: number; leads: number }>()
    for (const r of creaRows) {
      const g = byCrea.get(r.name) ?? { name: r.name, spend: 0, leads: 0 }
      g.spend += r.spend; g.leads += r.leads
      byCrea.set(r.name, g)
    }

    // À traiter : cartes en attente d'appel de clarté.
    const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    const clarte = recs.filter((r) => r.cadrage && r.status !== "archived" && r.status !== "lost").length

    const obj = await ctx.db.query("prospection_objectives").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    const cplCible = obj.find((o) => o.funnel === a.funnel)?.cpl ?? obj.find((o) => !o.funnel)?.cpl ?? null

    return {
      pub: day ?? null,
      creas: [...byCrea.values()].sort((x, y) => y.spend - x.spend),
      jour: { leads: fcDay.leadsTotal, r1: fcDay.r1Booked, shows: fcDay.showsR1, ventes: fcDay.ventes },
      total: { leads: fcAll.leadsTotal, r1: fcAll.r1Booked, shows: fcAll.showsR1, ventes: fcAll.ventes, tauxLeadsR1: fcAll.tauxLeadsR1, tauxShow: fcAll.tauxShow },
      clarte, cplCible,
    }
  },
})

/** Compose le texte et l'écrit dans la Synthèse du module Meta Ads. */
export const write = internalMutation({
  args: { day: v.string(), body: v.string() },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("os_syntheses").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    // Idempotent : un seul rapport par journée, même si le cron rejoue.
    const already = rows.find((r) => r.auto && r.body.startsWith(`Rapport du ${a.day}`))
    if (already) { await ctx.db.patch(already._id, { body: a.body, updatedAt: Date.now() }); return { updated: true } }
    await ctx.db.insert("os_syntheses", {
      workspaceId: WORKSPACE, body: a.body, updatedBy: "Data OS", auto: true,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
    return { created: true }
  },
})

/** Met en forme le rapport à partir des chiffres rassemblés. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatReport(day: string, d: any): string {
  const L: string[] = [`Rapport du ${day}`, ""]
  if (d.pub) {
    const cpl = d.pub.leads > 0 ? d.pub.spend / d.pub.leads : null
    L.push(`PUBLICITÉ — ${CHF(d.pub.spend)} dépensés · ${d.pub.leads} lead(s) · ${cpl != null ? `CPL ${CHF(cpl)}` : "aucun lead"}`)
    if (cpl != null && d.cplCible) {
      L.push(cpl <= d.cplCible ? `  Sous la cible de ${CHF(d.cplCible)}.` : `  Au-dessus de la cible de ${CHF(d.cplCible)}.`)
    }
    L.push(`  ${d.pub.impressions} impressions · ${d.pub.clicks} clics`)
  } else {
    L.push("PUBLICITÉ — aucune diffusion hier.")
  }
  L.push("")
  L.push(`ENTONNOIR (hier) — ${d.jour.leads} lead(s) · ${d.jour.r1} R1 · ${d.jour.shows} présent(s) · ${d.jour.ventes} vente(s)`)
  L.push(`DEPUIS LE DÉBUT — ${d.total.leads} leads · ${d.total.r1} R1 (${pct(d.total.tauxLeadsR1)}) · show ${pct(d.total.tauxShow)} · ${d.total.ventes} vente(s)`)
  if (d.creas.length) {
    L.push("")
    L.push("CRÉAS")
    const tot = d.creas.reduce((s: number, c: { spend: number }) => s + c.spend, 0) || 1
    for (const c of d.creas) {
      const cpl = c.leads > 0 ? `CPL ${CHF(c.spend / c.leads)}` : "aucun lead"
      L.push(`  ${c.name} — ${Math.round((c.spend / tot) * 100)} % du budget · ${c.leads} lead(s) · ${cpl}`)
    }
    const affamee = d.creas.find((c: { spend: number }) => c.spend / tot < 0.15)
    if (affamee && d.creas.length > 1) L.push(`  À surveiller : « ${affamee.name} » reçoit moins de 15 % du budget.`)
  }
  L.push("")
  L.push(`À TRAITER — ${d.clarte} appel(s) de clarté en attente.`)
  return L.join("\n")
}

/** Le cron du matin : compose le rapport de la veille et l'écrit dans la Synthèse. */
export const daily = internalAction({
  args: { funnel: v.optional(v.string()), day: v.optional(v.string()) },
  handler: async (ctx, a): Promise<{ day: string }> => {
    const funnel = a.funnel ?? "quiz"
    const day = a.day ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const d = await ctx.runQuery(internal.dailyReport.gather, { day, funnel })
    await ctx.runMutation(internal.dailyReport.write, { day, body: formatReport(day, d) })
    return { day }
  },
})


/** La boîte de réception des rapports : liste + nombre de non-lus (pastille). */
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const rows = (await ctx.db.query("os_syntheses").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect())
      .filter((r) => r.auto)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 60)
    return {
      unread: rows.filter((r) => !r.readAt).length,
      reports: rows.map((r) => ({
        id: r._id,
        title: r.body.split("\n")[0] || "Rapport",
        body: r.body,
        createdAt: r.createdAt,
        read: !!r.readAt,
      })),
    }
  },
})

/** Marque un rapport comme lu (éteint la pastille). */
export const markRead = mutation({
  args: { id: v.id("os_syntheses") },
  handler: async (ctx, a) => {
    const row = await ctx.db.get(a.id)
    if (row && !row.readAt) await ctx.db.patch(a.id, { readAt: Date.now() })
    return { ok: true }
  },
})
