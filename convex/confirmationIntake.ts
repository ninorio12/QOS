import { v } from "convex/values"
import { internalMutation, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { WORKSPACE } from "./osLib"

// Réponses du formulaire de confirmation (page /confirmation, post-booking R1).
// `create` est appelée par la route Next /api/confirmation. On tente de lier le
// prospect à sa fiche contact par email (sinon il reste non-lié, rattachable à la main).

const norm = (s?: string) => (s ?? "").trim().toLowerCase()

export const create = mutation({
  args: {
    email:             v.optional(v.string()),
    fullName:          v.string(),
    company:           v.optional(v.string()),
    companyType:       v.optional(v.string()),
    headcount:         v.optional(v.string()),
    monthlyRevenue:    v.optional(v.string()),
    costliestFunction: v.optional(v.string()),
    repetitiveCost:    v.optional(v.string()),
    whyNow:            v.optional(v.string()),
    timing:            v.optional(v.string()),
    budget:            v.optional(v.string()),
    answersJson:       v.optional(v.string()),
    raw:               v.optional(v.any()),
    addedToCalendar:   v.optional(v.boolean()),
    iclosedExternalId: v.optional(v.string()),
    phone:             v.optional(v.string()),
    metaEventId:       v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    // ── Cascade de rattachement à la fiche contact ────────────────────────────
    // Le prospect a saisi ses coordonnées chez iClosed, pas dans ce questionnaire :
    // on ne lui redemande rien, on le retrouve. Du plus fiable au moins fiable.
    let contactId: string | undefined
    let matchedBy: string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts: any[] = await ctx.db.query("crm_contacts").collect()

    // 1) Id du RDV iClosed relayé par la page → rattachement exact.
    if (a.iclosedExternalId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call: any = (await ctx.db.query("os_sales_calls")
        .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
        .find((c: any) => c.externalId === a.iclosedExternalId)
      if (call?.contactId) { contactId = String(call.contactId); matchedBy = "iclosed-id" }
    }

    // 2) Email (si le formulaire ou l'URL en fournit un).
    if (!contactId && a.email) {
      const target = norm(a.email)
      const match = contacts.find((c: any) => norm(c.email) === target)
      if (match) { contactId = match._id; matchedBy = "email" }
    }

    // 3) RDV réservé dans les 90 dernières minutes portant le même nom.
    //    Discriminant fort : celui qui remplit ce questionnaire vient de réserver.
    if (!contactId && a.fullName) {
      const who = norm(a.fullName)
      const since = Date.now() - 90 * 60 * 1000
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recent: any[] = (await ctx.db.query("os_sales_calls")
        .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
        .filter((c: any) => c._creationTime >= since && c.contactId)
        .sort((x: any, y: any) => y._creationTime - x._creationTime)
      const hit = recent.find((c: any) => {
        const ct = contacts.find((k: any) => String(k._id) === String(c.contactId))
        const full = norm([ct?.firstName, ct?.lastName].filter(Boolean).join(" "))
        return (full && (full === who || full.includes(who) || who.includes(full)))
            || norm(c.title).includes(who)
      })
      if (hit) { contactId = String(hit.contactId); matchedBy = "rdv-recent" }
    }

    // 4) Nom complet rapproché d'une fiche contact (dernier recours).
    if (!contactId && a.fullName) {
      const who = norm(a.fullName)
      const match = contacts.find((c: any) => norm([c.firstName, c.lastName].filter(Boolean).join(" ")) === who)
      if (match) { contactId = match._id; matchedBy = "nom" }
    }
    // Le formulaire envoie maintenant à CHAQUE réponse pour ne rien perdre quand
    // quelqu'un abandonne en route. Sans ce remplacement, une personne qui
    // répond à huit questions laissait huit fiches empilées. On garde UNE ligne
    // par personne : la dernière version écrase la précédente, elle contient
    // déjà toutes les réponses données jusque-là.
    const dejaLa = contactId
      ? (await ctx.db.query("confirmation_intake").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
          .find(r => String(r.contactId ?? "") === String(contactId) && (r.source ?? "confirmation-form") === "confirmation-form")
      : null
    if (dejaLa) {
      await ctx.db.patch(dejaLa._id, {
        email: a.email ?? dejaLa.email, fullName: a.fullName || dejaLa.fullName,
        company: a.company ?? dejaLa.company, companyType: a.companyType ?? dejaLa.companyType,
        headcount: a.headcount ?? dejaLa.headcount, monthlyRevenue: a.monthlyRevenue ?? dejaLa.monthlyRevenue,
        costliestFunction: a.costliestFunction ?? dejaLa.costliestFunction,
        repetitiveCost: a.repetitiveCost ?? dejaLa.repetitiveCost, whyNow: a.whyNow ?? dejaLa.whyNow,
        timing: a.timing ?? dejaLa.timing, budget: a.budget ?? dejaLa.budget,
        answersJson: a.answersJson ?? dejaLa.answersJson,
        addedToCalendar: a.addedToCalendar ?? dejaLa.addedToCalendar,
      })
      return { ok: true, id: dejaLa._id, contactId, matchedBy, remplace: true }
    }

    const id = await ctx.db.insert("confirmation_intake", {
      workspaceId: WORKSPACE,
      contactId: contactId as any,
      email: a.email,
      fullName: a.fullName,
      company: a.company,
      companyType: a.companyType,
      headcount: a.headcount,
      monthlyRevenue: a.monthlyRevenue,
      costliestFunction: a.costliestFunction,
      repetitiveCost: a.repetitiveCost,
      whyNow: a.whyNow,
      timing: a.timing,
      budget: a.budget,
      answersJson: a.answersJson,
      raw: a.raw,
      source: "confirmation-form",
      addedToCalendar: a.addedToCalendar,
      iclosedExternalId: a.iclosedExternalId,
      matchedBy,
      createdAt: new Date().toISOString(),
    })
    // Le questionnaire est allé au bout. On le dit à Meta par la voie serveur,
    // avec l'identifiant construit par la page : Meta fusionne les deux signaux
    // au lieu de compter deux fois, et la conversion survit aux bloqueurs de pub.
    if (a.metaEventId && (a.email || a.phone)) {
      await ctx.scheduler.runAfter(0, internal.metaCapi.sendEvent, {
        eventName: "SubmitApplication",
        eventId: a.metaEventId,
        email: a.email,
        phone: a.phone,
        name: a.fullName,
        eventSourceUrl: "https://go.vividflow.co/confirmation",
      })
    }
    return { ok: true, id, linked: !!contactId, matchedBy: matchedBy ?? null }
  },
})

// Dernière soumission pour un contact (par contactId, sinon par email).
export const listForContact = query({
  args: { contactId: v.optional(v.id("crm_contacts")), email: v.optional(v.string()) },
  handler: async (ctx, { contactId, email }) => {
    let rows: any[] = []
    if (contactId) {
      rows = await ctx.db.query("confirmation_intake").withIndex("by_contact", q => q.eq("contactId", contactId)).collect()
    } else if (email) {
      rows = await ctx.db.query("confirmation_intake").withIndex("by_email", q => q.eq("workspaceId", WORKSPACE).eq("email", email)).collect()
    }
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return rows[0] ?? null
  },
})

// Rattacher manuellement une soumission non-liée à une fiche contact.
export const linkToContact = mutation({
  args: { id: v.id("confirmation_intake"), contactId: v.id("crm_contacts") },
  handler: async (ctx, { id, contactId }) => {
    await ctx.db.patch(id, { contactId })
    return { ok: true }
  },
})

// Nettoyage : retire les soumissions d'un email donné (tests de bout en bout).
export const purgeByEmail = internalMutation({
  args: { email: v.string(), confirm: v.boolean() },
  handler: async (ctx, { email, confirm }) => {
    if (!confirm) return { deleted: 0 }
    const rows = await ctx.db
      .query("confirmation_intake")
      .withIndex("by_email", q => q.eq("workspaceId", WORKSPACE).eq("email", norm(email)))
      .collect()
    for (const r of rows) await ctx.db.delete(r._id)
    return { deleted: rows.length }
  },
})
