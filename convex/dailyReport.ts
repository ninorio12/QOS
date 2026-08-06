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
    // Une créa se juge sur la même chaîne que le compte : coût des impressions,
    // accroche, conversion du formulaire. D'où impressions et clics par créa.
    const byCrea = new Map<string, { name: string; spend: number; leads: number; impressions: number; clicks: number }>()
    for (const r of creaRows) {
      const g = byCrea.get(r.name) ?? { name: r.name, spend: 0, leads: 0, impressions: 0, clicks: 0 }
      g.spend += r.spend; g.leads += r.leads; g.impressions += r.impressions; g.clicks += r.clicks
      byCrea.set(r.name, g)
    }

    // À traiter : cartes en attente d'appel de clarté.
    const recs = await ctx.db.query("prospection_records").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    const clarte = recs.filter((r) => r.cadrage && r.status !== "archived" && r.status !== "lost").length

    const obj = await ctx.db.query("prospection_objectives").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    const cplCible = obj.find((o) => o.funnel === a.funnel)?.cpl ?? obj.find((o) => !o.funnel)?.cpl ?? null

    // Cumul côté PUBLICITÉ (toutes les journées du parcours). C'est lui qui dit
    // si le CPL est déjà lisible : le cumul du pipeline peut être plus bas (lead
    // de test purgé, doublon fusionné) et donnait une phrase contradictoire.
    const pubTotal = flt.funnelDaily.reduce(
      (s: { leads: number; spend: number; impressions: number; clicks: number }, r: { leads: number; spend: number; impressions: number; clicks: number }) =>
        ({ leads: s.leads + r.leads, spend: s.spend + r.spend, impressions: s.impressions + r.impressions, clicks: s.clicks + r.clicks }),
      { leads: 0, spend: 0, impressions: 0, clicks: 0 },
    )

    // Jours de DIFFUSION réelle (budget consommé). Une campagne se juge à son
    // temps de vie, pas au nombre de jours depuis sa création.
    const joursDiffuses = flt.funnelDaily.filter((r: { spend: number }) => r.spend > 0).length

    return {
      pub: day ?? null,
      pubTotal,
      joursDiffuses,
      creas: [...byCrea.values()].sort((x, y) => y.spend - x.spend),
      jour: { leads: fcDay.leadsTotal, r1: fcDay.r1Booked, shows: fcDay.showsR1, ventes: fcDay.ventes },
      total: { leads: fcAll.leadsTotal, r1: fcAll.r1Booked, shows: fcAll.showsR1, ventes: fcAll.ventes, tauxLeadsR1: fcAll.tauxLeadsR1, tauxShow: fcAll.tauxShow },
      clarte, cplCible,
    }
  },
})

/** Compose le texte et l'écrit dans la Synthèse du module Meta Ads. */
export const write = internalMutation({
  args: { day: v.string(), body: v.string(), dataJson: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const rows = await ctx.db.query("os_syntheses").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    // Idempotent : un seul rapport par journée, même si le cron rejoue.
    const already = rows.find((r) => r.auto && r.body.startsWith(`Rapport du ${a.day}`))
    if (already) { await ctx.db.patch(already._id, { body: a.body, dataJson: a.dataJson, updatedAt: Date.now() }); return { updated: true } }
    await ctx.db.insert("os_syntheses", {
      workspaceId: WORKSPACE, body: a.body, dataJson: a.dataJson, updatedBy: "Data OS", auto: true,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
    return { created: true }
  },
})

/**
 * Rapport structuré : les chiffres d'un côté, la lecture de l'autre.
 *
 * Ton visé : un média buyer qui parle simplement et ne dit que ce que les
 * chiffres montrent. Pas d'IA ici, donc pas de phrase inventée : chaque verdict
 * découle d'une règle explicite, et « pas de donnée » se dit tel quel.
 */
export type Maillon = {
  cle: "cpm" | "ctr" | "cvr" | "cpl"
  label: string
  valeur: string
  lecture: string          // ce que ce maillon dit, en français simple
  ecart: string | null     // écart à la moyenne de la campagne
}

export type RapportPayload = {
  day: string
  verdict: string
  etat: "sans_diffusion" | "apprentissage" | "sans_lead" | "sous_cible" | "au_dessus"
  kpis: { label: string; value: string; hint?: string }[]
  chaine: Maillon[]
  maillonFaible: string | null
  creas: { name: string; part: number; spend: string; impressions: number; ctr: string; cpm: string; leads: number; cpl: string }[]
  actions: string[]
  cplCible: string | null
}

const MIN_LEADS_FIABLE = 5
/** « 1 lead », « 3 leads » : jamais de « lead(s) » dans un texte qu'on lit. */
const nb = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`

/**
 * Synthèse du jour, lue comme Meta la lit.
 *
 * Un coût par lead n'est jamais bon ou mauvais en soi : il est le produit de
 * trois choses, et une seule casse à la fois. Le CPM dit ce que coûte
 * l'attention (enchère, audience). Le CTR dit si la créa accroche. Le taux de
 * conversion du formulaire dit si la promesse tient après le clic. On affiche
 * donc la chaîne dans cet ordre, et on nomme le maillon qui décroche.
 *
 * Aucun étalon extérieur inventé : chaque maillon se compare à la MOYENNE DE LA
 * CAMPAGNE elle-même. Tant qu'il n'y a pas assez de matière, on le dit.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildPayload(day: string, d: any): RapportPayload {
  const pub = d.pub as { spend: number; leads: number; impressions: number; clicks: number } | null
  const cum = (d.pubTotal ?? { spend: 0, leads: 0, impressions: 0, clicks: 0 }) as { spend: number; leads: number; impressions: number; clicks: number }
  const cible = d.cplCible as number | null

  const cpm = (spend: number, imp: number) => (imp > 0 ? (spend / imp) * 1000 : null)
  const ctr = (clicks: number, imp: number) => (imp > 0 ? (clicks / imp) * 100 : null)
  const cvr = (leads: number, clicks: number) => (clicks > 0 ? (leads / clicks) * 100 : null)
  const cpl = (spend: number, leads: number) => (leads > 0 ? spend / leads : null)

  const jCpm = pub ? cpm(pub.spend, pub.impressions) : null
  const jCtr = pub ? ctr(pub.clicks, pub.impressions) : null
  const jCvr = pub ? cvr(pub.leads, pub.clicks) : null
  const jCpl = pub ? cpl(pub.spend, pub.leads) : null

  const rCpm = cpm(cum.spend, cum.impressions)
  const rCtr = ctr(cum.clicks, cum.impressions)
  const rCvr = cvr(cum.leads, cum.clicks)

  // Assez de matière pour comparer ? Sous ce seuil, on montre les chiffres mais
  // on ne désigne personne : un seul jour de diffusion ne prouve rien.
  const comparable = cum.impressions >= 1000 && cum.clicks >= 20

  const ecart = (jour: number | null, ref: number | null, sensPositif: boolean): { texte: string | null; score: number } => {
    if (jour == null || ref == null || ref === 0) return { texte: null, score: 0 }
    const delta = ((jour - ref) / ref) * 100
    if (!comparable) return { texte: null, score: 0 }
    const signe = delta >= 0 ? "+" : ""
    // score = à quel point ce maillon dégrade le résultat (positif = il dégrade)
    const score = sensPositif ? -delta : delta
    return { texte: `${signe}${Math.round(delta)} % vs moyenne`, score }
  }

  const eCpm = ecart(jCpm, rCpm, false)   // un CPM qui monte dégrade
  const eCtr = ecart(jCtr, rCtr, true)    // un CTR qui monte améliore
  const eCvr = ecart(jCvr, rCvr, true)

  const chaine: Maillon[] = [
    {
      cle: "cpm", label: "Coût pour mille impressions",
      valeur: jCpm != null ? CHF(jCpm) : "pas de donnée",
      lecture: "Ce que coûte l'attention : enchère et audience.",
      ecart: eCpm.texte,
    },
    {
      cle: "ctr", label: "Taux de clic",
      valeur: jCtr != null ? pct(jCtr) : "pas de donnée",
      lecture: "Est-ce que la créa accroche.",
      ecart: eCtr.texte,
    },
    {
      cle: "cvr", label: "Clic vers lead",
      valeur: jCvr != null ? pct(jCvr) : "pas de donnée",
      lecture: "Est-ce que le formulaire tient la promesse de l'annonce.",
      ecart: eCvr.texte,
    },
    {
      cle: "cpl", label: "Coût par lead",
      valeur: jCpl != null ? CHF(jCpl) : "aucun lead",
      lecture: cible ? `Résultat final, à comparer à la cible de ${CHF(cible)}.` : "Résultat final. Aucune cible posée.",
      ecart: null,
    },
  ]

  // Maillon faible = celui qui dégrade le plus par rapport à la campagne.
  let maillonFaible: string | null = null
  if (comparable && pub && pub.spend > 0) {
    const candidats = [
      { nom: "le coût des impressions", score: eCpm.score },
      { nom: "l'accroche de la créa", score: eCtr.score },
      { nom: "la conversion du formulaire", score: eCvr.score },
    ].sort((x, y) => y.score - x.score)
    if (candidats[0].score > 15) maillonFaible = candidats[0].nom
  }

  const jours = (d.joursDiffuses ?? 0) as number
  const enApprentissage = cum.leads < MIN_LEADS_FIABLE

  let etat: RapportPayload["etat"] = "sans_diffusion"
  let verdict = "La campagne n'a rien diffusé hier : le budget n'a pas été consommé, il n'y a donc rien à lire."

  if (pub && pub.spend > 0) {
    // Une phrase porte une idée. Ce qui s'est passé, puis ce que ça vaut. Les
    // chiffres détaillés vivent dans les indicateurs juste en dessous, pas ici.
    const age = jours <= 1 ? "Premier jour de diffusion." : `${jours}e jour de diffusion.`

    if (enApprentissage) {
      etat = "apprentissage"
      const manque = MIN_LEADS_FIABLE - cum.leads
      const recolte = pub.leads > 0
        ? `La journée a rapporté ${nb(pub.leads, "lead")} pour ${CHF(pub.spend)}.`
        : `La journée a coûté ${CHF(pub.spend)} sans rapporter de lead, ce qui est banal à ce stade.`
      verdict = `${age} ${recolte} La campagne est encore en apprentissage : il lui manque ${nb(manque, "lead")} avant qu'un coût par lead veuille dire quelque chose, donc rien de ce qu'on voit aujourd'hui ne justifie de changer quoi que ce soit.`
    } else if (pub.leads === 0) {
      etat = "sans_lead"
      verdict = cible
        ? `Journée sans résultat : ${CHF(pub.spend)} dépensés, aucun lead. La campagne reste sous le seuil d'alerte de ${CHF(cible * 3)} sans lead, mais une deuxième journée comme celle-ci demandera un arbitrage.`
        : `Journée sans résultat : ${CHF(pub.spend)} dépensés, aucun lead.`
    } else if (cible && jCpl! <= cible) {
      etat = "sous_cible"
      verdict = `La campagne tient son coût : ${nb(pub.leads, "lead")} à ${CHF(jCpl!)} hier, sous la cible de ${CHF(cible)}. Rien à corriger, la question devient plutôt jusqu'où monter le budget.`
    } else if (cible) {
      etat = "au_dessus"
      const depassement = Math.round(((jCpl! - cible) / cible) * 100)
      verdict = `Le coût par lead dérape : ${CHF(jCpl!)} hier contre ${CHF(cible)} visés, soit ${depassement} % de trop.`
      verdict += maillonFaible
        ? ` C'est ${maillonFaible} qui décroche, c'est là qu'il faut agir.`
        : " Aucun maillon ne se détache encore : il faut une journée de plus pour savoir où ça casse."
    } else {
      etat = "sous_cible"
      verdict = `${nb(pub.leads, "lead")} hier à ${CHF(jCpl!)}. Sans cible de coût par lead, ce chiffre ne peut être ni validé ni contesté : c'est la première chose à poser.`
    }
  }

  const kpis: RapportPayload["kpis"] = [
    { label: "Dépense", value: pub ? CHF(pub.spend) : "0 CHF", hint: `${cum.spend > 0 ? CHF(cum.spend) : "0 CHF"} au total` },
    { label: "Impressions", value: pub ? pub.impressions.toLocaleString("fr-FR") : "0", hint: pub && jCpm != null ? `${CHF(jCpm)} le mille` : undefined },
    { label: "Clics", value: pub ? String(pub.clicks) : "0", hint: jCtr != null ? `${pct(jCtr)} de clic` : undefined },
    { label: "Leads", value: pub ? String(pub.leads) : "0", hint: jCpl != null ? `${CHF(jCpl)} le lead` : undefined },
  ]

  const totalSpend = (d.creas as { spend: number }[]).reduce((s, c) => s + c.spend, 0) || 1
  const creas = (d.creas as { name: string; spend: number; leads: number; impressions: number; clicks: number }[]).map((c) => ({
    name: c.name,
    part: Math.round((c.spend / totalSpend) * 100),
    spend: CHF(c.spend),
    impressions: c.impressions,
    ctr: ctr(c.clicks, c.impressions) != null ? pct(ctr(c.clicks, c.impressions)!) : "—",
    cpm: cpm(c.spend, c.impressions) != null ? CHF(cpm(c.spend, c.impressions)!) : "—",
    leads: c.leads,
    cpl: c.leads > 0 ? CHF(c.spend / c.leads) : "aucun lead",
  }))

  // Les décisions dépendent de l'ÂGE de la campagne. En apprentissage, la seule
  // bonne décision est de ne pas décider : toute modification d'une publicité ou
  // d'un budget renvoie Meta en apprentissage et efface ce qui a été appris.
  const actions: string[] = []

  if (etat === "sans_diffusion") {
    actions.push("Vérifier que la campagne est bien active et que le budget quotidien est engagé.")
  } else if (enApprentissage) {
    actions.push("Ne toucher à rien : modifier une publicité, un budget ou un ciblage relance l'apprentissage de Meta et remet le compteur à zéro.")
    const manque = MIN_LEADS_FIABLE - cum.leads
    const rythme = jours > 0 ? cum.leads / jours : 0
    const estim = rythme > 0 ? Math.ceil(manque / rythme) : null
    actions.push(
      estim
        ? `Laisser tourner encore ${nb(manque, "lead")}, soit environ ${nb(estim, "jour")} au rythme actuel, avant tout arbitrage.`
        : `Laisser tourner jusqu'à ${MIN_LEADS_FIABLE} leads avant tout arbitrage.`,
    )
    if (!cible) actions.push("Profiter de cette phase pour poser une cible de coût par lead : elle servira dès la sortie d'apprentissage.")
  } else {
    if (maillonFaible === "le coût des impressions") actions.push("Le coût des impressions monte : élargir l'audience ou revoir l'enchère avant de toucher à la créa.")
    if (maillonFaible === "l'accroche de la créa") actions.push("L'accroche décroche : tester une nouvelle ouverture de créa, le reste de la chaîne tient.")
    if (maillonFaible === "la conversion du formulaire") actions.push("Le formulaire perd les gens après le clic : revoir sa promesse et le nombre de champs.")
    if (cible && pub && pub.leads === 0 && pub.spend >= cible * 3) {
      actions.push("Couper ou remplacer la publicité : plus de trois fois le coût par lead visé dépensé sans un seul résultat.")
    }
    if (etat === "sous_cible" && cible) {
      actions.push("Monter le budget de 20 % au maximum : au-delà, Meta repasse la campagne en apprentissage.")
    }
    const affamee = creas.length > 1 ? creas.find((c) => c.part < 15) : undefined
    if (affamee) actions.push(`« ${affamee.name} » ne prend que ${affamee.part} % du budget : lui laisser sa chance ou la sortir.`)
    if (!cible) actions.push("Poser une cible de coût par lead : sans elle, aucun verdict de rentabilité n'est possible.")
  }

  if (d.clarte > 0) actions.push(`${nb(d.clarte, "lead")} attend son appel de clarté : la publicité produit, la suite ne suit pas.`)
  if (actions.length === 0) actions.push("Rien à arbitrer aujourd'hui.")

  return { day, verdict, etat, kpis, chaine, maillonFaible, creas, actions, cplCible: cible != null ? CHF(cible) : null }
}

/** Version lisible de la synthèse, celle qu'on voit dans la boîte de réception. */
export function renderText(p: RapportPayload): string {
  const L: string[] = [`Rapport du ${p.day}`, "", p.verdict, ""]
  L.push("CHIFFRES — " + p.kpis.map((k) => `${k.label} ${k.value}${k.hint ? ` (${k.hint})` : ""}`).join(" · "))
  L.push("")
  L.push("CHAÎNE D'ACQUISITION")
  for (const m of p.chaine) L.push(`  ${m.label} : ${m.valeur}${m.ecart ? ` (${m.ecart})` : ""}`)
  if (p.creas.length) {
    L.push("")
    L.push("PAR PUBLICITÉ")
    for (const c of p.creas) L.push(`  ${c.name} — ${c.part} % du budget · ${c.impressions} impressions · ${c.ctr} de clic · ${nb(c.leads, "lead")} · ${c.cpl}`)
  }
  L.push("")
  L.push("DÉCISIONS")
  for (const a of p.actions) L.push(`  ${a}`)
  return L.join("\n")
}

/** Ancien format texte, conservé pour les tests existants. */
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
    const payload = buildPayload(day, d)
    await ctx.runMutation(internal.dailyReport.write, {
      day,
      body: renderText(payload),
      dataJson: JSON.stringify(payload),
    })
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
        // Chiffres structurés : la mise en page du PDF s'en sert directement.
        dataJson: r.dataJson ?? null,
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
