import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { Id } from "./_generated/dataModel"
import { WORKSPACE, requireAdmin } from "./osLib"
import { linkInternal } from "./osProspection"
import { advanceForCall } from "./closing"
import { findDuplicateContact } from "./contactDedup"

// ════════════════════════════════════════════════════════════════════════════
// BOOKING NATIF — moteur de prise de RDV type Calendly/iClosed, intégré au Data OS.
// Un `booking_link` = une page publique /book/<slug>. À la réservation, on assigne
// un closer en round-robin, on crée l'event Google Meet (côté API Next) et on
// matérialise contact + lead + RDV (os_sales_calls) exactement comme le webhook
// iClosed, en réutilisant linkInternal (pipeline/prospection) + advanceForCall.
// ════════════════════════════════════════════════════════════════════════════

const now = () => new Date().toISOString()
const SECRET = () => process.env.INTERNAL_API_SECRET ?? ""
const checkSecret = (s?: string) => {
  const expected = SECRET()
  if (!expected || s !== expected) throw new Error("Non autorisé")
}

const availabilityValidator = v.array(v.object({ day: v.number(), start: v.number(), end: v.number() }))
const questionsValidator = v.array(v.object({ key: v.string(), label: v.string(), required: v.optional(v.boolean()) }))

// Les lectures d'admin (liens, roster closers) exigent une session Clerk : elles
// exposent emails/ids d'équipe, pas question de les laisser publiques. On renvoie
// null (pas de throw) car useQuery s'exécute une 1re fois AVANT que le token Clerk
// soit chargé — même pattern que users.me ; l'UI traite null comme « chargement ».
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hasUser(ctx: any): Promise<boolean> {
  return !!(await ctx.auth.getUserIdentity())
}

// ── Lecture publique du lien (page /book/<slug>) ────────────────────────────
// Ne renvoie que ce qui est nécessaire au rendu public (jamais les tokens).
export const getLink = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const link = await ctx.db.query("booking_links").withIndex("by_slug", q => q.eq("slug", slug)).first()
    if (!link || !link.active) return null
    // Questions = banque commune (questionRefs) + legacy inline (questions).
    const questions: { key: string; label: string; required?: boolean }[] = [...(link.questions ?? [])]
    for (const ref of link.questionRefs ?? []) {
      const q = await ctx.db.get(ref.qid)
      if (q && !q.archived) questions.push({ key: String(ref.qid), label: q.label, required: ref.required })
    }
    return {
      slug: link.slug,
      title: link.title,
      description: link.description ?? null,
      durationMin: link.durationMin,
      timezone: link.timezone,
      questions,
      accentColor: link.accentColor ?? null,
      hostCount: link.hosts.length,
    }
  },
})

// Config interne complète d'un lien (appelée par l'API Next, secret requis).
export const linkConfig = query({
  args: { slug: v.string(), secret: v.string() },
  handler: async (ctx, { slug, secret }) => {
    checkSecret(secret)
    const link = await ctx.db.query("booking_links").withIndex("by_slug", q => q.eq("slug", slug)).first()
    if (!link || !link.active) return null
    return {
      id: link._id,
      slug: link.slug,
      title: link.title,
      durationMin: link.durationMin,
      bufferMin: link.bufferMin ?? 0,
      minNoticeHours: link.minNoticeHours ?? 2,
      maxDaysAhead: link.maxDaysAhead ?? 30,
      timezone: link.timezone,
      stage: link.stage ?? "R1",
      hosts: link.hosts,
      availability: link.availability,
    }
  },
})

// RDV natifs déjà planifiés pour un ensemble de hosts (busy côté Data OS, en plus
// du FreeBusy Google) — évite un double-booking entre le moment du calcul des
// créneaux et la propagation Google. Secret requis (lecture d'agenda).
export const plannedBusy = query({
  args: { hosts: v.array(v.string()), fromIso: v.string(), toIso: v.string(), secret: v.string() },
  handler: async (ctx, { hosts, fromIso, toIso, secret }) => {
    checkSecret(secret)
    const fromMs = Date.parse(fromIso), toMs = Date.parse(toIso)
    const out: { closerUserId: string; start: string; end: string }[] = []
    for (const host of hosts) {
      const calls = await ctx.db.query("os_sales_calls").withIndex("by_closer", q => q.eq("closerUserId", host)).collect()
      for (const c of calls) {
        if ((c.status ?? "planned") !== "planned" || !c.date || !c.closerUserId) continue
        const t = Date.parse(c.date)
        if (isNaN(t)) continue
        // Fin réelle = début + durée (repli 60 min pour les RDV legacy sans durée).
        const endMs = t + (c.durationMin ?? 60) * 60000
        if (endMs <= fromMs || t >= toMs) continue
        out.push({ closerUserId: c.closerUserId, start: new Date(t).toISOString(), end: new Date(endMs).toISOString() })
      }
    }
    return out
  },
})

// ── Réservation (appelée par l'API Next après recalcul des hosts libres) ─────
// freeHosts = sous-ensemble des hosts RÉELLEMENT libres sur ce créneau (autorité
// serveur, recalculé via FreeBusy Google). Round-robin atomique + création RDV.
export const createBooking = mutation({
  args: {
    slug: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    startIso: v.string(),
    freeHosts: v.array(v.string()),
    answers: v.optional(v.array(v.object({ q: v.string(), a: v.string() }))),
    manageToken: v.optional(v.string()),
    captureId: v.optional(v.id("booking_captures")),
    secret: v.string(),
  },
  handler: async (ctx, a) => {
    checkSecret(a.secret)
    // Bornes anti-abus : l'endpoint est public côté API, on cape tout ce qui s'écrit.
    if (a.firstName.length > 100 || (a.lastName ?? "").length > 100 || a.email.length > 200 || (a.phone ?? "").length > 40) {
      throw new Error("Champs trop longs")
    }
    if ((a.answers ?? []).length > 20 || (a.answers ?? []).some(x => x.q.length > 300 || x.a.length > 2000)) {
      throw new Error("Réponses trop longues")
    }
    const link = await ctx.db.query("booking_links").withIndex("by_slug", q => q.eq("slug", a.slug)).first()
    if (!link || !link.active) throw new Error("Lien de réservation introuvable ou inactif")

    const email = a.email.trim().toLowerCase()
    const stage = link.stage ?? "R1"

    // Pool round-robin PONDÉRÉ = hosts du lien réellement libres sur le créneau.
    // La séquence répète chaque closer selon son poids (Jonathan 2 / Thomas 1 →
    // J,J,T) et le curseur persistant fait tourner. On prend le premier SANS
    // conflit : même prospect qui re-soumet → idempotent ; plein → 409.
    const pool = a.freeHosts.filter(h => link.hosts.includes(h))
    if (pool.length === 0) throw new Error("Aucun créneau disponible")
    const weights = link.weights ?? {}
    const seq: string[] = []
    for (const h of pool) {
      const w = Math.max(1, Math.round(weights[h] ?? 1))
      for (let i = 0; i < w; i++) seq.push(h)
    }
    const cursor = link.rrCursor ?? 0
    const ordered: string[] = []
    const seen = new Set<string>()
    for (let i = 0; i < seq.length; i++) {
      const h = seq[(cursor + i) % seq.length]
      if (!seen.has(h)) { seen.add(h); ordered.push(h) }
    }
    let closerUserId: string | null = null
    for (const h of ordered) {
      const conflict = (await ctx.db.query("os_sales_calls").withIndex("by_closer", q => q.eq("closerUserId", h)).collect())
        .find(c => (c.status ?? "planned") === "planned" && c.date === a.startIso)
      if (!conflict) { closerUserId = h; break }
      // Double-soumission du MÊME prospect (même email) → on renvoie le RDV existant.
      const conflictContact = conflict.contactId ? await ctx.db.get(conflict.contactId as Id<"crm_contacts">) : null
      if (conflictContact && (conflictContact.email ?? "").trim().toLowerCase() === email) {
        return { salesCallId: conflict._id, contactId: conflict.contactId ?? null, leadId: conflict.leadId ?? null, closerUserId: h, already: true }
      }
    }
    if (!closerUserId) throw new Error("Ce créneau vient d’être pris. Choisissez-en un autre.")
    // Avance d'un cran dans la séquence pondérée (le motif J,J,T se déroule au fil des RDV).
    await ctx.db.patch(link._id, { rrCursor: cursor + 1, updatedAt: now() })

    // 1) Contact (dédup phone/email) — le lead vient à nous → source inbound.
    const dupId = await findDuplicateContact(ctx, { email, phone: a.phone })
    let contactId: Id<"crm_contacts">
    if (dupId) {
      contactId = dupId
      const c = await ctx.db.get(dupId)
      await ctx.db.patch(dupId, {
        statut: c?.statut ?? "lead",
        leadStatus: "active",
        phone: c?.phone ?? a.phone,
        email: c?.email ?? email,
        updatedAt: now(),
      })
    } else {
      contactId = await ctx.db.insert("crm_contacts", {
        firstName: a.firstName,
        lastName: a.lastName,
        email,
        phone: a.phone,
        source: "inbound",
        statut: "lead",
        leadStatus: "active",
        temperature: "tiede",
        tags: [],
        createdAt: now(),
      })
    }

    // 2) Lead + carte Prospection (chemin canonique, idempotent).
    const linked = await linkInternal(ctx, contactId, { channel: "booking", temperature: "tiede", by: "booking" })

    // 3) RDV planifié (os_sales_calls) — mêmes champs que le webhook iClosed + assignation closer.
    const quizJson = a.answers && a.answers.length ? JSON.stringify(a.answers) : undefined
    const fullName = `${a.firstName} ${a.lastName ?? ""}`.trim()
    const salesCallId = await ctx.db.insert("os_sales_calls", {
      workspaceId: WORKSPACE,
      title: `${stage} · ${fullName}`,
      contactId,
      leadId: linked.leadId,
      stage,
      status: "planned",
      date: a.startIso,
      externalId: undefined,
      meetLink: undefined,
      quizJson,
      calendarLabel: link.title,
      calendarSlug: link.slug,
      calendarColor: link.accentColor ?? "#7C3AED",
      closerUserId,
      bookingLinkId: link._id,
      durationMin: link.durationMin,
      manageToken: a.manageToken,
      createdBy: "booking",
      createdAt: now(),
      updatedAt: now(),
    })

    // 4) Propagation pipeline/funnel (lead → r1/r2, carte Prospection « RDV booké »).
    await advanceForCall(ctx, contactId, stage)

    // 5) La capture funnel (fiche soumise en étape 1) passe en « booked ».
    if (a.captureId) {
      const cap = await ctx.db.get(a.captureId)
      if (cap) {
        await ctx.db.patch(a.captureId, {
          status: "booked", salesCallId, closerUserId,
          contactId: String(contactId), leadId: String(linked.leadId),
          timeline: [...cap.timeline.slice(-18), { t: now(), e: `Créneau réservé — RDV ${stage} confirmé` }],
          updatedAt: now(),
        })
      }
    }

    return { salesCallId, contactId, leadId: linked.leadId, closerUserId, already: false }
  },
})

// ════════════════════════════════════════════════════════════════════════════
// CAPTURE FUNNEL — la fiche est enregistrée AVANT le calendrier (zéro lead perdu).
// ════════════════════════════════════════════════════════════════════════════

// Étape 1 du flow public : fiche soumise → contact + lead + trace de capture.
// Si le prospect abandonne au calendrier, tout est déjà dans le Data OS.
export const capture = mutation({
  args: {
    slug: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    answers: v.optional(v.array(v.object({ q: v.string(), a: v.string() }))),
    funnel: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    secret: v.string(),
  },
  handler: async (ctx, a) => {
    checkSecret(a.secret)
    if (a.firstName.length > 100 || (a.lastName ?? "").length > 100 || a.email.length > 200 || (a.phone ?? "").length > 40) {
      throw new Error("Champs trop longs")
    }
    if ((a.answers ?? []).length > 20 || (a.answers ?? []).some(x => x.q.length > 300 || x.a.length > 2000)) {
      throw new Error("Réponses trop longues")
    }
    for (const s of [a.funnel, a.utmSource, a.utmMedium, a.utmCampaign]) {
      if ((s ?? "").length > 120) throw new Error("Attribution trop longue")
    }
    const link = await ctx.db.query("booking_links").withIndex("by_slug", q => q.eq("slug", a.slug)).first()
    if (!link || !link.active) throw new Error("Lien introuvable ou inactif")

    const email = a.email.trim().toLowerCase()
    // Contact (dédup) + lead + carte Prospection — chemins canoniques.
    const dupId = await findDuplicateContact(ctx, { email, phone: a.phone })
    let contactId: Id<"crm_contacts">
    if (dupId) {
      contactId = dupId
      const c = await ctx.db.get(dupId)
      await ctx.db.patch(dupId, { statut: c?.statut ?? "lead", leadStatus: "active", phone: c?.phone ?? a.phone, email: c?.email ?? email, updatedAt: now() })
    } else {
      contactId = await ctx.db.insert("crm_contacts", {
        firstName: a.firstName, lastName: a.lastName, email, phone: a.phone,
        source: "inbound", statut: "lead", leadStatus: "active", temperature: "tiede",
        tags: a.funnel ? [`funnel:${a.funnel}`] : [], createdAt: now(),
      })
    }
    const linked = await linkInternal(ctx, contactId, { channel: "booking", temperature: "tiede", by: "booking" })

    // Ré-utilise une capture encore ouverte du même email sur ce lien (re-soumission).
    const existing = (await ctx.db.query("booking_captures").withIndex("by_email", q => q.eq("email", email)).collect())
      .find(c => c.slug === a.slug && c.status === "captured")
    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: a.firstName, lastName: a.lastName, phone: a.phone ?? existing.phone,
        quizJson: a.answers?.length ? JSON.stringify(a.answers) : existing.quizJson,
        timeline: [...existing.timeline.slice(-18), { t: now(), e: "Fiche re-soumise" }],
        updatedAt: now(),
      })
      return { captureId: existing._id, contactId, leadId: linked.leadId }
    }

    const captureId = await ctx.db.insert("booking_captures", {
      workspaceId: WORKSPACE, linkId: link._id, slug: a.slug,
      firstName: a.firstName, lastName: a.lastName, email, phone: a.phone,
      contactId: String(contactId), leadId: String(linked.leadId),
      status: "captured",
      funnel: a.funnel, utmSource: a.utmSource, utmMedium: a.utmMedium, utmCampaign: a.utmCampaign,
      quizJson: a.answers?.length ? JSON.stringify(a.answers) : undefined,
      timeline: [
        { t: now(), e: `Fiche soumise (nom, email${a.phone ? ", tel" : ""}) — funnel ${a.funnel ?? a.slug}` },
        ...(a.answers?.length ? [{ t: now(), e: `${a.answers.length} réponse${a.answers.length > 1 ? "s" : ""} de qualification attachée${a.answers.length > 1 ? "s" : ""}` }] : []),
      ],
      createdAt: now(), updatedAt: now(),
    })
    return { captureId, contactId, leadId: linked.leadId }
  },
})

// Événement de parcours (calendrier affiché, jour sélectionné…) — horodaté, borné.
const CAPTURE_EVENTS = new Set(["calendar_viewed", "day_selected", "slot_selected"])
const EVENT_LABELS: Record<string, string> = {
  calendar_viewed: "Calendrier affiché",
  day_selected: "Jour sélectionné",
  slot_selected: "Créneau sélectionné",
}
export const captureEvent = mutation({
  args: { captureId: v.id("booking_captures"), event: v.string(), detail: v.optional(v.string()), secret: v.string() },
  handler: async (ctx, { captureId, event, detail, secret }) => {
    checkSecret(secret)
    if (!CAPTURE_EVENTS.has(event)) return { ok: false }
    const cap = await ctx.db.get(captureId)
    if (!cap) return { ok: false }
    const label = EVENT_LABELS[event] + (detail && detail.length <= 80 ? ` — ${detail}` : "")
    // Dédoublonne les événements identiques consécutifs (re-render du front).
    if (cap.timeline[cap.timeline.length - 1]?.e === label) return { ok: true }
    await ctx.db.patch(captureId, { timeline: [...cap.timeline.slice(-19), { t: now(), e: label }], updatedAt: now() })
    return { ok: true }
  },
})

// Tableau « Leads capturés » du module (auth requise).
export const listCaptures = query({
  args: {},
  handler: async (ctx) => {
    if (!(await hasUser(ctx))) return null
    const rows = await ctx.db.query("booking_captures").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).order("desc").take(60)
    const users = await ctx.db.query("users").collect()
    const nameByClerk = new Map(users.filter(u => u.clerkUserId).map(u => [u.clerkUserId as string, u.name || u.email]))
    const out = []
    for (const c of rows) {
      const call = c.salesCallId ? await ctx.db.get(c.salesCallId) : null
      out.push({
        id: c._id,
        firstName: c.firstName, lastName: c.lastName ?? null,
        email: c.email, phone: c.phone ?? null,
        contactId: c.contactId ?? null,
        status: c.status,
        slug: c.slug,
        funnel: c.funnel ?? c.slug,
        utm: [c.utmSource, c.utmMedium, c.utmCampaign].filter(Boolean).join(" · ") || null,
        closerName: c.closerUserId ? (nameByClerk.get(c.closerUserId) ?? null) : null,
        assignedTo: c.assignedTo ?? null,
        rdvDate: call?.date ?? null,
        timeline: c.timeline,
        createdAt: c.createdAt,
      })
    }
    return out
  },
})

// « Assigner au setter » : sort le lead du compteur « à rappeler ».
export const assignCapture = mutation({
  args: { id: v.id("booking_captures"), assignedTo: v.optional(v.string()) },
  handler: async (ctx, { id, assignedTo }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Authentification requise")
    const cap = await ctx.db.get(id)
    if (!cap) throw new Error("Capture introuvable")
    const who = assignedTo ?? "setter"
    await ctx.db.patch(id, {
      status: cap.status === "captured" ? "assigned" : cap.status,
      assignedTo: who,
      timeline: [...cap.timeline.slice(-19), { t: now(), e: `Assigné au setter (${who})` }],
      updatedAt: now(),
    })
    return { ok: true }
  },
})

// KPI du module : RDV pris / conversion / no-show sur la période, à rappeler = actuel.
export const stats = query({
  args: { days: v.number() },
  handler: async (ctx, { days }) => {
    if (!(await hasUser(ctx))) return null
    const sinceMs = Date.now() - Math.min(Math.max(days, 1), 366) * 24 * 3600000
    const caps = await ctx.db.query("booking_captures").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).order("desc").take(1000)
    const inWin = caps.filter(c => Date.parse(c.createdAt) >= sinceMs)
    const booked = inWin.filter(c => c.status === "booked" || c.status === "cancelled").length
    const fiches = inWin.length
    // À rappeler = captures encore ouvertes (ni RDV, ni assignées) — temps réel, hors période.
    const toCall = caps.filter(c => c.status === "captured").length
    // No-show : sur les RDV du booking natif passés dans la fenêtre.
    const calls = (await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect())
      .filter(c => c.bookingLinkId && c.date && Date.parse(c.date) >= sinceMs && Date.parse(c.date) <= Date.now())
    const done = calls.filter(c => c.status === "done").length
    const noShow = calls.filter(c => c.status === "no_show").length
    return {
      rdv: booked,
      toCall,
      conversion: fiches > 0 ? Math.round(booked / fiches * 100) : null,
      noShow: (done + noShow) > 0 ? Math.round(noShow / (done + noShow) * 100) : null,
    }
  },
})

// ── Banque de questions ──────────────────────────────────────────────────────
export const listQuestions = query({
  args: {},
  handler: async (ctx) => {
    if (!(await hasUser(ctx))) return null
    const rows = await ctx.db.query("booking_questions").collect()
    const links = await ctx.db.query("booking_links").collect()
    return rows.filter(q => !q.archived).map(q => ({
      id: q._id,
      label: q.label,
      usedBy: links.filter(l => (l.questionRefs ?? []).some(r => r.qid === q._id)).map(l => l.title),
    }))
  },
})

export const addQuestion = mutation({
  args: { label: v.string() },
  handler: async (ctx, { label }) => {
    await requireAdmin(ctx)
    const clean = label.trim()
    if (!clean || clean.length > 300) throw new Error("Question invalide")
    const id = await ctx.db.insert("booking_questions", { label: clean, createdBy: "admin", createdAt: now() })
    return { id }
  },
})

// Accroche le lien Google Meet + l'id d'event une fois l'event Google créé (API Next).
export const attachMeet = mutation({
  args: { salesCallId: v.id("os_sales_calls"), meetLink: v.optional(v.string()), googleEventId: v.optional(v.string()), secret: v.string() },
  handler: async (ctx, { salesCallId, meetLink, googleEventId, secret }) => {
    checkSecret(secret)
    await ctx.db.patch(salesCallId, { meetLink, googleEventId, updatedAt: now() })
    return { ok: true }
  },
})

// ── Gestion par le prospect (/book/manage/<token>) ──────────────────────────
// Le token (opaque, généré par l'API à la réservation) EST l'autorisation :
// il n'est connu que du prospect (email d'invitation) et du closer (event).

export const getByManageToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token || token.length < 16) return null
    const call = await ctx.db.query("os_sales_calls").withIndex("by_manage", q => q.eq("manageToken", token)).first()
    if (!call) return null
    const link = call.bookingLinkId ? await ctx.db.get(call.bookingLinkId) : null
    return {
      title: call.calendarLabel ?? call.title,
      date: call.date ?? null,
      durationMin: call.durationMin ?? link?.durationMin ?? null,
      timezone: link?.timezone ?? "Europe/Zurich",
      meetLink: call.meetLink ?? null,
      status: call.status ?? "planned",
      slug: call.calendarSlug ?? link?.slug ?? null,
      accentColor: link?.accentColor ?? null,
    }
  },
})

// Annulation par le prospect. Renvoie de quoi supprimer l'event Google côté API
// (googleEventId + closer). Conservateur comme iClosed : on n'avance NI ne
// régresse la pipeline, on retire juste le RDV du planning.
export const cancelByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token || token.length < 16) throw new Error("Token invalide")
    const call = await ctx.db.query("os_sales_calls").withIndex("by_manage", q => q.eq("manageToken", token)).first()
    if (!call) throw new Error("Réservation introuvable")
    if ((call.status ?? "planned") !== "planned") {
      return { ok: false, reason: "déjà annulé ou passé", googleEventId: null, closerUserId: null }
    }
    await ctx.db.patch(call._id, { status: "cancelled", updatedAt: now() })
    return { ok: true, googleEventId: call.googleEventId ?? null, closerUserId: call.closerUserId ?? null }
  },
})

// ════════════════════════════════════════════════════════════════════════════
// ADMINISTRATION — gestion des liens de réservation (UI /reservations)
// ════════════════════════════════════════════════════════════════════════════

// Liste des liens (admin). Enrichit avec le nb de RDV pris via chaque lien.
export const listLinks = query({
  args: {},
  handler: async (ctx) => {
    if (!(await hasUser(ctx))) return null
    const links = await ctx.db.query("booking_links").collect()
    const calls = await ctx.db.query("os_sales_calls").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const countByLink = new Map<string, number>()
    for (const c of calls) {
      if (c.bookingLinkId) countByLink.set(String(c.bookingLinkId), (countByLink.get(String(c.bookingLinkId)) ?? 0) + 1)
    }
    return links
      .map(l => ({
        id: l._id,
        slug: l.slug,
        title: l.title,
        description: l.description ?? null,
        durationMin: l.durationMin,
        bufferMin: l.bufferMin ?? 0,
        minNoticeHours: l.minNoticeHours ?? 2,
        maxDaysAhead: l.maxDaysAhead ?? 30,
        timezone: l.timezone,
        stage: l.stage ?? "R1",
        hosts: l.hosts,
        availability: l.availability,
        questions: l.questions ?? [],
        questionRefs: l.questionRefs ?? [],
        weights: l.weights ?? {},
        active: l.active,
        accentColor: l.accentColor ?? null,
        bookings: countByLink.get(String(l._id)) ?? 0,
        createdAt: l.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
})

// Candidats closers : membres de l'équipe ayant connecté leur Google Calendar
// (indispensable pour créer l'event + lire le FreeBusy). Round-robin = parmi ceux-là.
export const closerCandidates = query({
  args: {},
  handler: async (ctx) => {
    if (!(await hasUser(ctx))) return null
    const users = await ctx.db.query("users").collect()
    const accounts = await ctx.db.query("google_accounts").collect()
    const connected = new Set(accounts.map(a => a.clerkUserId))
    return users
      .filter(u => u.clerkUserId)
      .map(u => ({
        clerkUserId: u.clerkUserId as string,
        name: u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        email: u.email,
        role: u.role,
        googleConnected: connected.has(u.clerkUserId as string),
      }))
      .sort((a, b) => Number(b.googleConnected) - Number(a.googleConnected) || a.name.localeCompare(b.name))
  },
})

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "lien"

export const createLink = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMin: v.number(),
    bufferMin: v.optional(v.number()),
    minNoticeHours: v.optional(v.number()),
    maxDaysAhead: v.optional(v.number()),
    timezone: v.string(),
    stage: v.optional(v.string()),
    hosts: v.array(v.string()),
    availability: availabilityValidator,
    questions: v.optional(questionsValidator),
    accentColor: v.optional(v.string()),
    weights: v.optional(v.record(v.string(), v.number())),
    questionRefs: v.optional(v.array(v.object({ qid: v.id("booking_questions"), required: v.optional(v.boolean()) }))),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    // slug unique
    let base = slugify(a.slug || a.title)
    let slug = base, i = 2
    while (await ctx.db.query("booking_links").withIndex("by_slug", q => q.eq("slug", slug)).first()) {
      slug = `${base}-${i++}`
    }
    const id = await ctx.db.insert("booking_links", {
      slug,
      title: a.title,
      description: a.description,
      durationMin: a.durationMin,
      bufferMin: a.bufferMin,
      minNoticeHours: a.minNoticeHours,
      maxDaysAhead: a.maxDaysAhead,
      timezone: a.timezone,
      stage: a.stage ?? "R1",
      hosts: a.hosts,
      availability: a.availability,
      questions: a.questions,
      active: true,
      rrCursor: 0,
      accentColor: a.accentColor,
      weights: a.weights,
      questionRefs: a.questionRefs,
      createdBy: "admin",
      createdAt: now(),
      updatedAt: now(),
    })
    return { id, slug }
  },
})

export const updateLink = mutation({
  args: {
    id: v.id("booking_links"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMin: v.optional(v.number()),
    bufferMin: v.optional(v.number()),
    minNoticeHours: v.optional(v.number()),
    maxDaysAhead: v.optional(v.number()),
    timezone: v.optional(v.string()),
    stage: v.optional(v.string()),
    hosts: v.optional(v.array(v.string())),
    availability: v.optional(availabilityValidator),
    questions: v.optional(questionsValidator),
    accentColor: v.optional(v.string()),
    active: v.optional(v.boolean()),
    weights: v.optional(v.record(v.string(), v.number())),
    questionRefs: v.optional(v.array(v.object({ qid: v.id("booking_questions"), required: v.optional(v.boolean()) }))),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    const { id, ...rest } = a
    const patch: Record<string, unknown> = { updatedAt: now() }
    for (const [k, val] of Object.entries(rest)) {
      if (val !== undefined) patch[k] = val
    }
    await ctx.db.patch(id, patch)
    return { ok: true }
  },
})

export const deleteLink = mutation({
  args: { id: v.id("booking_links") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    await ctx.db.delete(id)
    return { ok: true }
  },
})
