import { action, mutation, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { api } from "./_generated/api"
import { PROJECT_START_DATE } from "./osLib"
import { zurichToUtcIso } from "./timeLib"

const ICLOSED_BASE = "https://public.api.iclosed.io/v1"

// Connecteur iClosed natif (Data OS). Poll les eventCalls et matérialise les KICKOFFS réservés
// dans l'onboarding (date/heure + carte client → « Kickoff booké »). Les R1/R2 restent gérés
// par le sync existant ; ici on ne traite QUE l'event « Kick-off ». Idempotent (scheduleKickoff
// réécrit la même date ; la carte n'avance jamais en arrière). Gère le reschedule (date mise à jour).
// Sync unifié iClosed (déclenché en temps réel par le webhook /iclosed/webhook + en filet de
// sécurité par le cron). Scanne les eventCalls et matérialise dans le Data OS :
//   - Kickoffs (event « Kick-off »)        → onboarding (scheduleKickoff)
//   - R1 (event « Audit IA offert »)        → os_sales_calls stage R1 (scheduleCall, résolu par email)
//   - Annulations (cancelReason présent)    → call marqué « cancelled » (cancelCallByExternalId)
// R2 : non auto-classifiable aujourd'hui (même event iClosed que R1) → reste géré par l'agent/manuel
// tant qu'un event iClosed R2 dédié n'existe pas. Tout est idempotent (dédup par externalId).
export const syncRecent = action({
  args: {},
  handler: async (ctx) => {
    const key = process.env.ICLOSED_API_KEY
    if (!key) throw new Error("ICLOSED_API_KEY manquante (env Convex)")
    let kickoffs = 0, r1 = 0, cancelled = 0, scanned = 0
    // Santé de la connexion : sans ça, une clé révoquée passe inaperçue (le sync rend
    // simplement 0 RDV) et le badge du Calendrier reste au vert. Vécu le 28/07/2026.
    let httpError: string | null = null
    for (const eventType of ["UPCOMING", "PAST"]) {
      const res = await fetch(`${ICLOSED_BASE}/eventCalls?limit=100&eventType=${eventType}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) {
        httpError = `HTTP ${res.status} sur ${eventType}` + (res.status === 401 ? " — clé API iClosed invalide ou révoquée" : "")
        continue
      }
      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls: any[] = json?.data?.eventCalls ?? []
      for (const c of calls) {
        scanned++
        const name = String(c?.event?.name ?? "").toLowerCase()
        const slug = String(c?.event?.linkPrefix ?? "").toLowerCase()
        const externalId = String(c.id ?? c.callId ?? "")
        const isKickoff = name.includes("kick") || slug.includes("kick")
        const isR1 = name.includes("audit") || slug.includes("audit")
        // Annulation : on retire le RDV (kickoff conservé tel quel pour l'instant : pas de undo onboarding).
        if (c.cancelReason) {
          if (!isKickoff && externalId) {
            const r = await ctx.runMutation(api.closing.cancelCallByExternalId, { externalId })
            if ((r as { ok: boolean }).ok) cancelled++
          }
          continue
        }
        const email = c.inviteeEmail
        const rawStart = c.dateTimeUTC ?? c.dateTime
        if (!email || !rawStart) continue
        // Normalise en UTC : une heure iClosed sans fuseau est en local Europe/Zurich, pas en UTC.
        const startTime = zurichToUtcIso(String(rawStart))
        // Jour 1 du projet : on n'importe PAS les RDV iClosed d'anciens projets (avant la date de départ).
        if (startTime.slice(0, 10) < PROJECT_START_DATE) continue
        if (isKickoff) {
          await ctx.runMutation(api.onboarding.scheduleKickoff, { email, startTime, externalId })
          kickoffs++
        } else if (isR1) {
          // ⚠️ `location` vaut le TYPE de visio ("GOOGLE_MEET"), pas l'URL. Le vrai lien est
          //    dans locationLink / locationLinkInvitee. Sans ça le bouton « Rejoindre » du
          //    module Closing pointait dans le vide (constaté le 28/07/2026).
          const rawLink = c.locationLinkInvitee ?? c.locationLink ?? c.meetingUrl ?? c.location
          const meetLink = typeof rawLink === "string" && /^https?:\/\//i.test(rawLink) ? rawLink : undefined
          // Réponses saisies au moment de la réservation iClosed (téléphone, société, etc.) :
          // alimentent l'accordéon « Réservation iClosed » de la fiche R1.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const qa: { q: string; a: string }[] = []
          for (const q of (c.questions ?? []) as any[]) {
            const st = String(q?.statement ?? "").trim()
            const an = typeof q?.answer === "string" ? q.answer.trim() : ""
            if (st && an) qa.push({ q: st, a: an })
          }
          for (const q of (c.secondaryAnswers ?? []) as any[]) {
            const st = String(q?.statement ?? "").trim()
            const arr = Array.isArray(q?.answer) ? q.answer : []
            const an = arr.map((x: any) => String(x?.answer ?? "").trim()).filter(Boolean).join(" ; ")
            if (st && an) qa.push({ q: st, a: an })
          }
          await ctx.runMutation(api.closing.scheduleCall, {
            title: `R1 · ${c.inviteeName ?? email}`, email, stage: "R1", date: startTime, externalId,
            meetLink,
            quizJson: qa.length ? JSON.stringify(qa) : undefined,
            calendarLabel: c?.event?.name ?? undefined, calendarSlug: c?.event?.linkPrefix ?? undefined,
          })
          r1++
        }
      }
    }
    await ctx.runMutation(api.iclosed.recordSyncHealth, { error: httpError ?? undefined })
    return { ok: !httpError, scanned, kickoffs, r1, cancelled, error: httpError }
  },
})

/** Horodate le dernier appel reçu d'iClosed : preuve que le temps réel fonctionne. */
export const recordWebhookPing = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const row = await ctx.db.query("integrations").withIndex("by_key", (q) => q.eq("key", "iclosed")).first()
    if (row) await ctx.db.patch(row._id, { lastWebhookAt: now, updatedAt: now })
    else await ctx.db.insert("integrations", { key: "iclosed", status: "connected", lastWebhookAt: now, updatedAt: now })
  },
})

// Trace la santé du dernier sync (succès daté ou erreur) — lue par le badge du Calendrier.
export const recordSyncHealth = mutation({
  args: { error: v.optional(v.string()) },
  handler: async (ctx, { error }) => {
    const now = new Date().toISOString()
    const row = await ctx.db.query("integrations").withIndex("by_key", q => q.eq("key", "iclosed")).first()
    const patch = {
      status: error ? "disconnected" : "connected",
      lastSyncError: error,
      ...(error ? {} : { lastSyncAt: now }),
      updatedAt: now,
    }
    if (row) await ctx.db.patch(row._id, patch)
    else await ctx.db.insert("integrations", { key: "iclosed", ...patch, lastSyncAt: error ? undefined : now })
    return { ok: true }
  },
})

export const syncKickoffs = action({
  args: {},
  handler: async (ctx) => {
    const key = process.env.ICLOSED_API_KEY
    if (!key) throw new Error("ICLOSED_API_KEY manquante (env Convex)")
    let synced = 0, scanned = 0
    for (const eventType of ["UPCOMING", "PAST"]) {
      const res = await fetch(`${ICLOSED_BASE}/eventCalls?limit=100&eventType=${eventType}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) continue
      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls: any[] = json?.data?.eventCalls ?? []
      for (const c of calls) {
        scanned++
        const name = String(c?.event?.name ?? "").toLowerCase()
        const slug = String(c?.event?.linkPrefix ?? "").toLowerCase()
        const isKickoff = name.includes("kick") || slug.includes("kick")
        if (!isKickoff || c.cancelReason) continue   // pas un kickoff, ou annulé → ignoré
        const email = c.inviteeEmail
        const rawStart = c.dateTimeUTC ?? c.dateTime
        if (!email || !rawStart) continue
        // Normalise en UTC : une heure iClosed sans fuseau est en local Europe/Zurich, pas en UTC.
        const startTime = zurichToUtcIso(String(rawStart))
        // Jour 1 du projet : on n'importe PAS les RDV iClosed d'anciens projets (avant la date de départ).
        if (startTime.slice(0, 10) < PROJECT_START_DATE) continue
        await ctx.runMutation(api.onboarding.scheduleKickoff, {
          email, startTime, externalId: String(c.id ?? c.callId ?? ""),
        })
        synced++
      }
    }
    return { ok: true, scanned, synced }
  },
})

/** Garde la dernière charge utile reçue, pour pouvoir diagnostiquer un RDV manquant. */
export const _trace = internalMutation({
  args: { source: v.string(), payload: v.string(), lu: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await ctx.db.insert("webhook_traces", { source: a.source, payload: a.payload.slice(0, 4000), lu: a.lu, createdAt: new Date().toISOString() })
    // On ne garde que les 20 dernières : c'est un outil de diagnostic, pas une archive.
    const toutes = await ctx.db.query("webhook_traces").withIndex("by_source", q => q.eq("source", a.source)).collect()
    const trop = toutes.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1)).slice(20)
    for (const t of trop) await ctx.db.delete(t._id)
  },
})
