// Réception des réponses du quiz de qualification (quiz.vividflow.co).
//
// La page publique envoie deux choses : une CAPTURE PROGRESSIVE à chaque
// réponse (on garde le travail même si la personne abandonne) et une
// SOUMISSION quand elle atteint son diagnostic. Les deux atterrissent ici.
//
// Rattachement au parcours : par jeton `vf` quand la redirection Meta l'a posé,
// sinon PAR EMAIL. Ce filet est ce qui tient la chaîne quand le bouton du
// formulaire Meta ne porte pas la macro `{{lead_id}}` : le lead existe déjà
// (créé par le webhook leadgen), le quiz le retrouve par son email.
import { internalMutation, query } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const now = () => new Date().toISOString()

const clean = (s?: string | null, max = 4000) => {
  const t = (s ?? "").toString().trim()
  return t ? t.slice(0, max) : undefined
}

export const record = internalMutation({
  args: {
    kind: v.string(), // "progress" | "submit"
    email: v.optional(v.string()),
    sid: v.optional(v.string()),
    vf: v.optional(v.string()),
    qi: v.optional(v.number()),
    qTotal: v.optional(v.number()),
    ecran: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    metier: v.optional(v.string()),
    secteur: v.optional(v.string()),
    qualified: v.optional(v.boolean()),
    score: v.optional(v.number()),
    tier: v.optional(v.string()),
    answersJson: v.optional(v.string()),
    answersText: v.optional(v.string()),
    attributionJson: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    variant: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const email = (a.email ?? "").trim().toLowerCase()
    const sid = (a.sid ?? "").trim()
    // Une session sans identité NI jeton n'est rattachable à rien : on l'écarte.
    if (!email.includes("@") && !sid) return { ok: false, reason: "ni email ni session" }
    const terminé = a.kind === "submit"

    // 1. Le parcours : jeton d'abord, email en filet. Une session anonyme n'a
    //    encore aucun parcours : elle en trouvera un dès l'identification.
    const journey = a.vf
      ? await ctx.db.query("os_lead_journey").withIndex("by_token", (q) => q.eq("token", a.vf!)).first()
      : email
        ? await ctx.db.query("os_lead_journey").withIndex("by_email", (q) => q.eq("email", email)).first()
        : null

    // 2. La ligne. Deux clés possibles : l'email quand on le connaît, sinon la
    //    session. Quand l'email arrive sur une session déjà commencée, les deux
    //    lignes fusionnent : les réponses données avant l'identification ne sont
    //    jamais perdues.
    const parEmail = email
      ? await ctx.db.query("quiz_responses").withIndex("by_email", (q) => q.eq("email", email)).first()
      : null
    const parSid = sid
      ? await ctx.db.query("quiz_responses").withIndex("by_sid", (q) => q.eq("sid", sid)).first()
      : null
    const existing = parEmail ?? parSid

    const patch = {
      email: email || existing?.email || "",
      sid: sid || existing?.sid,
      qi: a.qi ?? existing?.qi,
      qTotal: a.qTotal ?? existing?.qTotal,
      ecran: clean(a.ecran, 40) ?? existing?.ecran,
      name: clean(a.name, 200) ?? existing?.name,
      phone: clean(a.phone, 60) ?? existing?.phone,
      company: clean(a.company, 200) ?? existing?.company,
      metier: clean(a.metier, 200) ?? existing?.metier,
      secteur: clean(a.secteur, 200) ?? existing?.secteur,
      token: a.vf || journey?.token || existing?.token,
      contactId: journey?.contactId ?? existing?.contactId,
      leadId: journey?.leadId ?? existing?.leadId,
      // Terminé ne redevient jamais en cours.
      status: terminé || existing?.status === "termine" ? "termine" : "en_cours",
      qualified: a.qualified ?? existing?.qualified,
      score: a.score ?? existing?.score,
      tier: clean(a.tier, 60) ?? existing?.tier,
      answersJson: clean(a.answersJson, 20000) ?? existing?.answersJson,
      answersText: clean(a.answersText, 20000) ?? existing?.answersText,
      attributionJson: clean(a.attributionJson, 4000) ?? existing?.attributionJson,
      pageUrl: clean(a.pageUrl, 1000) ?? existing?.pageUrl,
      variant: clean(a.variant, 120) ?? existing?.variant,
      updatedAt: now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      // Fusion : la ligne anonyme disparaît une fois recollée à l'email.
      if (parEmail && parSid && parEmail._id !== parSid._id) await ctx.db.delete(parSid._id)
    } else {
      await ctx.db.insert("quiz_responses", { workspaceId: WORKSPACE, firstSeenAt: now(), ...patch })
    }

    // 3. Les étapes du parcours, quand on sait à qui on parle.
    const steps: string[] = []
    if (journey) {
      const wanted = terminé ? ["quiz_ouvert", "quiz_termine"] : ["quiz_ouvert"]
      const dejaFaites = new Set(journey.steps.map((s) => s.step))
      const added = wanted.filter((s) => !dejaFaites.has(s)).map((step) => ({ step, at: now() }))
      if (added.length) {
        await ctx.db.patch(journey._id, { steps: [...journey.steps, ...added], updatedAt: now() })
        steps.push(...added.map((s) => s.step))
      }
    }

    return { ok: true, journeyFound: !!journey, token: journey?.token ?? null, steps }
  },
})

/**
 * Après création du lead depuis la page 1 du quiz : complète ce que
 * `leadIngest.fromLeadForm` ne connaît pas (la société) et recolle la session
 * de quiz déjà commencée au contact tout neuf.
 */
export const attachLead = internalMutation({
  args: {
    contactId: v.string(),
    leadId: v.optional(v.string()),
    token: v.optional(v.string()),
    email: v.optional(v.string()),
    sid: v.optional(v.string()),
    company: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    if (a.company) {
      const c = await ctx.db.get(a.contactId as never)
      if (c && !(c as { companyName?: string }).companyName) {
        await ctx.db.patch(a.contactId as never, { companyName: a.company, updatedAt: now() } as never)
      }
    }
    const email = (a.email ?? "").trim().toLowerCase()
    const row = a.sid
      ? await ctx.db.query("quiz_responses").withIndex("by_sid", (q) => q.eq("sid", a.sid!)).first()
      : email
        ? await ctx.db.query("quiz_responses").withIndex("by_email", (q) => q.eq("email", email)).first()
        : null
    if (row) {
      await ctx.db.patch(row._id, {
        email: email || row.email,
        contactId: a.contactId,
        leadId: a.leadId ?? row.leadId,
        token: a.token ?? row.token,
        company: a.company ?? row.company,
        updatedAt: now(),
      })
    }
    return { ok: true, sessionRattachee: !!row }
  },
})

/** Suppression d'une ligne par email : nettoyage des tests, et effacement sur demande. */
export const purgeByEmail = internalMutation({
  args: { email: v.string(), confirm: v.boolean() },
  handler: async (ctx, a) => {
    if (!a.confirm) return { deleted: 0 }
    const rows = await ctx.db
      .query("quiz_responses")
      .withIndex("by_email", (q) => q.eq("email", a.email.trim().toLowerCase()))
      .collect()
    for (const r of rows) await ctx.db.delete(r._id)
    return { deleted: rows.length }
  },
})

/**
 * Annule une capture de quiz : supprime la ligne de réponses ET les étapes de
 * quiz posées sur le parcours. Sert à retirer un test qui s'est rattaché à une
 * vraie fiche, sans toucher au reste du parcours (formulaire, rendez-vous).
 */
export const undoQuizCapture = internalMutation({
  args: { email: v.string(), confirm: v.boolean() },
  handler: async (ctx, a) => {
    if (!a.confirm) return { ok: false }
    const email = a.email.trim().toLowerCase()
    const rows = await ctx.db.query("quiz_responses").withIndex("by_email", (q) => q.eq("email", email)).collect()
    for (const r of rows) await ctx.db.delete(r._id)
    const journey = await ctx.db.query("os_lead_journey").withIndex("by_email", (q) => q.eq("email", email)).first()
    let stepsRetires = 0
    if (journey) {
      const gardes = journey.steps.filter((st) => st.step !== "quiz_ouvert" && st.step !== "quiz_termine")
      stepsRetires = journey.steps.length - gardes.length
      if (stepsRetires > 0) await ctx.db.patch(journey._id, { steps: gardes, updatedAt: now() })
    }
    return { ok: true, lignes: rows.length, stepsRetires }
  },
})

/** Suppression d'une session par son identifiant : nettoyage des tests anonymes. */
export const purgeBySid = internalMutation({
  args: { sid: v.string(), confirm: v.boolean() },
  handler: async (ctx, a) => {
    if (!a.confirm) return { deleted: 0 }
    const rows = await ctx.db.query("quiz_responses").withIndex("by_sid", (q) => q.eq("sid", a.sid)).collect()
    for (const r of rows) await ctx.db.delete(r._id)
    return { deleted: rows.length }
  },
})

/** Réponses d'un contact, pour sa fiche. Authentifiée : la page publique n'y touche pas. */
export const forContact = query({
  args: { email: v.optional(v.string()), contactId: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    if (a.email) {
      return await ctx.db
        .query("quiz_responses")
        .withIndex("by_email", (q) => q.eq("email", a.email!.trim().toLowerCase()))
        .first()
    }
    if (!a.contactId) return null
    const rows = await ctx.db
      .query("quiz_responses")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    return rows.find((r) => r.contactId === a.contactId) ?? null
  },
})

/** Liste pour un écran de suivi. Authentifiée. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const rows = await ctx.db
      .query("quiz_responses")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    return rows.sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1)).slice(0, a.limit ?? 100)
  },
})

/**
 * Les trois questionnaires d'un contact, pour sa fiche : ce qu'il a rempli sur
 * le formulaire Meta, ce qu'il a répondu au quiz de diagnostic, et ce qu'il a
 * donné au formulaire de confirmation après avoir réservé.
 *
 * Chaque bloc est rendu tel quel, sans invention : une source absente renvoie
 * une liste vide, et l'écran affiche « pas encore rempli ».
 */
export const qualification = query({
  args: { contactId: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const email = (a.email ?? "").trim().toLowerCase()

    const paires = (json?: string | null): { q: string; a: string }[] => {
      if (!json) return []
      try {
        const brut = JSON.parse(json) as unknown
        if (Array.isArray(brut)) {
          return brut
            .map((x) => {
              const o = x as Record<string, unknown>
              // Le quiz envoie { id, question, value, label } : la réponse LISIBLE
              // est dans `label`. L'oublier vidait tout le bloc alors que la
              // donnée était bien en base (constaté sur un vrai lead).
              return {
                q: String(o.q ?? o.question ?? ""),
                a: String(o.a ?? o.label ?? o.r ?? o.answer ?? o.reponse ?? o.value ?? ""),
              }
            })
            .filter((x) => x.q && x.a)
        }
        if (brut && typeof brut === "object") {
          return Object.entries(brut as Record<string, unknown>)
            .map(([q, v2]) => ({ q, a: Array.isArray(v2) ? v2.join(", ") : String(v2 ?? "") }))
            .filter((x) => x.a)
        }
      } catch { /* rien d'exploitable */ }
      return []
    }

    /** Couples { id, value } exploitables par le barème, dans leur forme d'origine. */
    const brut = (json?: string | null): { id: string; value: string }[] => {
      if (!json) return []
      try {
        const parsed = JSON.parse(json) as unknown
        if (!Array.isArray(parsed)) return []
        return parsed
          .map((x) => {
            const o = x as Record<string, unknown>
            return { id: String(o.id ?? ""), value: String(o.value ?? o.v ?? "") }
          })
          .filter((x) => x.id && x.value)
      } catch { return [] }
    }

    // 1. Le formulaire d'identité. Un contact peut avoir PLUSIEURS parcours
    //    pendant la transition (formulaire instantané Meta encore branché ET
    //    page 1 du quiz) : on montre en priorité celui de VividFlow, sinon le
    //    plus récent. Sans ce choix, l'écran affichait au hasard les champs
    //    Meta (email / full_name) en les intitulant « Formulaire VividFlow ».
    const journeys = await ctx.db
      .query("os_lead_journey")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const candidats = journeys.filter(
      (j) => j.contactId === a.contactId || (!!email && (j.email ?? "").toLowerCase() === email),
    )
    // Pendant la transition, une même personne a pu remplir les DEUX : le
    // formulaire instantané Meta puis la page 1 du quiz. On n'en choisit aucun,
    // on montre les deux, chacun sous son vrai nom. Un lead ancien garde donc
    // son bloc « Formulaire Meta ».
    const vividflow = candidats.find((j) => (j.leadgenId ?? "").startsWith("quiz:"))
    const meta = candidats.find((j) => !(j.leadgenId ?? "").startsWith("quiz:"))
    const journey = vividflow ?? meta

    // 2. Quiz de diagnostic, y compris abandonné.
    const quizRows = await ctx.db
      .query("quiz_responses")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const quiz = quizRows.find((r) => r.contactId === a.contactId)
      ?? (email ? quizRows.find((r) => (r.email ?? "").toLowerCase() === email) : undefined)

    // 3. Formulaire de confirmation, rempli après la réservation.
    const intakes = await ctx.db
      .query("confirmation_intake")
      .withIndex("by_contact", (q) => q.eq("contactId", a.contactId as never))
      .collect()
    const intake = intakes.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))[0] ?? null

    // Les clés brutes du formulaire (first_name, phone_number…) ne se montrent
    // pas à l'écran : on les traduit et on les ordonne.
    const LIBELLES: Record<string, string> = {
      first_name: "Prénom", firstname: "Prénom", prenom: "Prénom",
      last_name: "Nom", lastname: "Nom", nom: "Nom",
      full_name: "Nom complet", fullname: "Nom complet",
      company: "Entreprise", entreprise: "Entreprise", societe: "Entreprise",
      phone_number: "Téléphone", phone: "Téléphone", telephone: "Téléphone",
      email: "Email",
    }
    const ORDRE = ["Prénom", "Nom", "Nom complet", "Entreprise", "Téléphone", "Email"]
    const identite = paires(journey?.fieldsJson)
      .map((x) => ({ q: LIBELLES[x.q.toLowerCase()] ?? x.q, a: x.a }))
      // « Nom complet » n'apporte rien quand prénom et nom sont là.
      .filter((x, _i, tab) => !(x.q === "Nom complet" && tab.some((y) => y.q === "Prénom")))
      .sort((x, y) => {
        const i = ORDRE.indexOf(x.q), j = ORDRE.indexOf(y.q)
        return (i < 0 ? 99 : i) - (j < 0 ? 99 : j)
      })

    const champsDe = (j: typeof journey) => paires(j?.fieldsJson)
      .map((x) => ({ q: LIBELLES[x.q.toLowerCase()] ?? x.q, a: x.a }))
      .filter((x, _i, tab) => !(x.q === "Nom complet" && tab.some((y) => y.q === "Prénom")))
      .sort((x, y) => {
        const i = ORDRE.indexOf(x.q), j2 = ORDRE.indexOf(y.q)
        return (i < 0 ? 99 : i) - (j2 < 0 ? 99 : j2)
      })

    // UNE seule identité, fusionnée. Afficher un bloc par formulaire répétait
    // trois fois le même nom et le même numéro : on garde la vérité, c'est-à-dire
    // l'ensemble des champs réellement remplis, en privilégiant la saisie
    // VividFlow et en complétant avec Meta ce qu'elle ne demandait pas.
    const fusion = new Map<string, string>()
    for (const j of [vividflow, meta]) {
      for (const c of champsDe(j)) if (c.a && !fusion.has(c.q)) fusion.set(c.q, c.a)
    }
    const identiteFusionnee = [...fusion.entries()]
      .map(([q, a2]) => ({ q, a: a2 }))
      .filter((x, _i, tab) => !(x.q === "Nom complet" && tab.some((y) => y.q === "Prénom")))
      .sort((x, y) => {
        const i = ORDRE.indexOf(x.q), j2 = ORDRE.indexOf(y.q)
        return (i < 0 ? 99 : i) - (j2 < 0 ? 99 : j2)
      })
    const sources = [
      ...(vividflow ? ["VividFlow"] : []),
      ...(meta ? ["Meta"] : []),
    ]

    // ET le détail par formulaire : quand une personne a rempli les deux, la
    // vérité c'est qu'elle a rempli les deux. Chacun garde donc son bloc, avec
    // ses champs à lui, sans réécriture.
    const formulaires = [
      ...(vividflow ? [{ source: "vividflow", champs: champsDe(vividflow), at: vividflow.createdAt }] : []),
      ...(meta ? [{ source: "meta", champs: champsDe(meta), at: meta.createdAt }] : []),
    ]

    return {
      metaForm: identiteFusionnee,
      formulaires,
      sources,
      source: vividflow ? "vividflow" : "meta",
      metaFormAt: journey?.createdAt ?? null,
      quiz: paires(quiz?.answersJson),
      // Réponses BRUTES (identifiant de question + valeur choisie) : c'est avec
      // elles que la fiche recalcule le score du diagnostic. Le libellé peut
      // être réécrit sur la page, l'identifiant et la valeur ne bougent pas.
      quizBrut: brut(quiz?.answersJson),
      quizStatut: quiz ? quiz.status : null,
      quizProgression: quiz && quiz.qTotal ? { atteinte: (quiz.qi ?? 0) + 1, total: quiz.qTotal } : null,
      quizScore: quiz?.score ?? null,
      confirmation: paires((intake as { answersJson?: string } | null)?.answersJson),
    }
  },
})
