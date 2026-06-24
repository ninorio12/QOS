import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { reconcileMoney } from "./moneyReconciliation"

// —— Reprise du formulaire public (par jeton secret) ——

// Lit la progression sauvegardée pour un jeton exact. Renvoie null si inconnu.
export const getProgress = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null
    const doc = await ctx.db
      .query("onboarding_progress")
      .withIndex("by_token", q => q.eq("token", token))
      .first()
    if (!doc) return null
    return { name: doc.name ?? null, state: doc.state ?? null, updatedAt: doc.updatedAt }
  },
})

// Sauvegarde (upsert) la progression du form pour un jeton.
export const saveProgress = mutation({
  args: {
    token: v.string(),
    name:  v.optional(v.string()),
    state: v.any(),
    contactId: v.optional(v.string()),
  },
  handler: async (ctx, { token, name, state, contactId }) => {
    if (!token) throw new Error("missing_token")
    const now = new Date().toISOString()
    const existing = await ctx.db
      .query("onboarding_progress")
      .withIndex("by_token", q => q.eq("token", token))
      .first()
    const patch: Record<string, unknown> = { state, updatedAt: now }
    if (name !== undefined) patch.name = name
    if (contactId !== undefined) patch.contactId = contactId
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return { ok: true }
    }
    await ctx.db.insert("onboarding_progress", { token, name, state, contactId, updatedAt: now })
    return { ok: true }
  },
})

export const getByContact = query({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", args.contactId))
      .first()
  },
})

export const list = query({
  handler: async (ctx) => ctx.db.query("onboarding").collect(),
})

// Kickoffs réservés (onboarding.kickoffAt) → events pour le module Calendrier (comme les R1/R2 iClosed).
export const kickoffCalendarEvents = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const obs = await ctx.db.query("onboarding").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nameById = new Map(contacts.map((c: any) => [c._id.toString(), `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Client']))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: any[] = []
    for (const ob of obs) {
      const k = (ob as { kickoffAt?: string }).kickoffAt
      if (!k || k < from || k > to) continue
      out.push({ id: ob._id.toString(), contactName: nameById.get(ob.contactId) ?? 'Client', startTime: k })
    }
    return out
  },
})

// Payment control tower — aggregate every client's installments & refunds
// Agrégat argent multi-client. Délègue à reconcileMoney (source UNIQUE, Stripe-aware) pour
// rester IDENTIQUE à Paiement et Dashboard. Sans from/to → tout l'historique.
export const paymentsOverview = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()), tzOffset: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const from = args.from ?? "2000-01-01"
    const to   = args.to ?? new Date().toISOString().slice(0, 10)
    const obs            = await ctx.db.query("onboarding").collect()
    const clients        = await ctx.db.query("pipeline_clients").collect()
    const contacts       = await ctx.db.query("crm_contacts").collect()
    const stripePayments = await ctx.db.query("stripe_payments").withIndex("by_created").collect()
    const externalPayments = await ctx.db.query("external_payments").collect()
    const money = reconcileMoney({ obs, clients, contacts, stripePayments, externalPayments, from, to, tzOffset: args.tzOffset })
    return { encaisse: money.encaisse, attente: money.attente, rembourse: money.rembourse, net: money.encaisse - money.rembourse, transactions: money.transactions }
  },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Public form intake — called by the standalone onboarding form (cross-origin via /api/onboarding/intake).
// Matches the contact by email; creates one if unknown; ensures it appears in the onboarding module;
// merges the submission into onboarding.form.
// ── Sync carte client (pipeline Clients) ⇄ avancement onboarding. Avance UNIQUEMENT (jamais de régression). ──
//   formSent → « Onboarding envoyé »  ·  formReceivedAt → « Onboarding complété »  ·  kickoff (planifié/réservé) → « Kickoff booké »
const CLIENT_STAGE_ORDER = ['nouveau-client', 'onboarding-envoye', 'onboarding-complet', 'kickoff-booke', 'setup-cree', 'consulting']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncClientStage(ctx: any, contactId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ob = await ctx.db.query("onboarding").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first()
  if (!ob) return
  const tasks = ob.tasks ?? {}
  let target: string | null = null
  if (tasks.kickoffPlanned || ob.kickoffEventId) target = 'kickoff-booke'
  else if (ob.formReceivedAt) target = 'onboarding-complet'
  else if (tasks.formSent) target = 'onboarding-envoye'
  if (!target) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (await ctx.db.query("pipeline_clients").withIndex("by_contact", (q: any) => q.eq("contactId", contactId)).first())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?? (await ctx.db.query("pipeline_clients").withIndex("by_ghl_contact", (q: any) => q.eq("ghl_contact_id", contactId)).first())
  if (!client) return
  if (CLIENT_STAGE_ORDER.indexOf(target) > CLIENT_STAGE_ORDER.indexOf(client.stageId)) {
    await ctx.db.patch(client._id, { stageId: target })
  }
}

export const intakeSubmit = mutation({
  args: {
    email:      v.string(),
    submission: v.any(),   // nested { sectionId: { fieldKey: value } } produced by the form
    profile:    v.optional(v.object({
      firstName:   v.optional(v.string()),
      lastName:    v.optional(v.string()),
      companyName: v.optional(v.string()),
      phone:       v.optional(v.string()),
      website:     v.optional(v.string()),
    })),
  },
  handler: async (ctx, { email, submission, profile }) => {
    const normEmail = email.trim().toLowerCase()
    if (!EMAIL_RE.test(normEmail)) throw new Error('invalid_email')
    const now = new Date().toISOString()

    // 1. Match contact by email — create one if unknown.
    //    Le formulaire public NE CRÉE PLUS DE CLIENT : un contact inconnu entre en 'lead' (à rattacher).
    //    La conversion réelle en client reste MANUELLE via sync.convertToClient (montant requis).
    let contact = await ctx.db
      .query("crm_contacts")
      .withIndex("by_email", q => q.eq("email", normEmail))
      .first()
    let created = false
    if (!contact) {
      const newId = await ctx.db.insert("crm_contacts", {
        firstName:   profile?.firstName || normEmail.split('@')[0],
        lastName:    profile?.lastName,
        email:       normEmail,
        phone:       profile?.phone,
        companyName: profile?.companyName,
        website:     profile?.website,
        source:      'onboarding',
        statut:      'lead',
        tags:        [],
        createdAt:   now,
        updatedAt:   now,
      })
      contact = await ctx.db.get(newId)
      created = true
    }
    const contactId = contact!._id.toString()

    // 2. (Plus de pipeline_clients ici.) Le doc onboarding (étape 3) suffit à faire apparaître
    //    la soumission en "à rattacher". La carte client n'existe qu'après convertToClient.
    // Si une carte client existe DÉJÀ (contact déjà converti), on avance son étape onboarding.
    const existingClient = await ctx.db
      .query("pipeline_clients")
      .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", contactId))
      .first()
    const COMPLETE_ID = 'onboarding-complet'
    const PRE_COMPLETE = new Set(['nouveau-client', 'onboarding-envoye'])
    if (existingClient && PRE_COMPLETE.has(existingClient.stageId)) {
      await ctx.db.patch(existingClient._id, { stageId: COMPLETE_ID })
    }

    // 3. Upsert the onboarding doc — merge the submission into form, stamp reception.
    const existingOb = await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", contactId))
      .first()
    const mergedForm = { ...(existingOb?.form ?? {}), ...(submission ?? {}) }
    if (existingOb) {
      await ctx.db.patch(existingOb._id, { form: mergedForm, formReceivedAt: now, updatedAt: now })
    } else {
      await ctx.db.insert("onboarding", { contactId, form: mergedForm, formReceivedAt: now, updatedAt: now } as never)
    }

    // Sync la carte client sur l'avancement (gère aussi les clients liés par contactId typé, pas seulement ghl_contact_id).
    await syncClientStage(ctx, contactId)
    return { ok: true, contactId, created }
  },
})

// Réconciliation : tout client dont le formulaire onboarding est REÇU (formReceivedAt) mais resté
// en "Nouveau client" / "Onboarding envoyé" → on le passe en "Onboarding complété". Idempotent.
export const reconcileOnboardingStages = mutation({
  args: {},
  handler: async (ctx) => {
    const PRE = new Set(['nouveau-client', 'onboarding-envoye'])
    const obs = await ctx.db.query("onboarding").collect()
    let moved = 0
    const movedNames: string[] = []
    for (const ob of obs) {
      if (!ob.formReceivedAt) continue
      const client = await ctx.db.query("pipeline_clients")
        .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", ob.contactId)).first()
      if (client && PRE.has(client.stageId)) {
        await ctx.db.patch(client._id, { stageId: 'onboarding-complet' })
        moved++; movedNames.push(client.name)
      }
    }
    return { moved, movedNames }
  },
})

// Upsert a partial patch for a contact's onboarding
export const patch = mutation({
  args: {
    contactId:       v.string(),
    tasks:           v.optional(v.any()),
    payment:         v.optional(v.object({ installments: v.number(), amounts: v.array(v.number()) })),
    paidStatus:      v.optional(v.array(v.boolean())),
    paidDates:       v.optional(v.array(v.string())),
    refunds:         v.optional(v.array(v.object({ amount: v.number(), date: v.string(), note: v.optional(v.string()) }))),
    signedContract:  v.optional(v.object({ fileName: v.string(), storageId: v.optional(v.string()), dataUrl: v.optional(v.string()), uploadedAt: v.string() })),
    form:            v.optional(v.any()),
    contractGenerated: v.optional(v.boolean()),
    kickoffEventId:  v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { contactId, ...rest } = args
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_contact", q => q.eq("contactId", contactId))
      .first()
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    for (const [k, val] of Object.entries(rest)) if (val !== undefined) patch[k] = val
    let obId
    if (existing) { await ctx.db.patch(existing._id, patch); obId = existing._id }
    else { obId = await ctx.db.insert("onboarding", { contactId, ...patch } as never) }

    // Sync la carte client (pipeline Clients) sur l'avancement onboarding (jamais de régression).
    await syncClientStage(ctx, contactId)
    return obId
  },
})

// Webhook iClosed (via n8n / outil MCP) : le client a RÉSERVÉ son kickoff lui-même sur iClosed.
// → renseigne la date/heure, coche kickoffPlanned, et avance la carte client en « Kickoff booké ».
export const scheduleKickoff = mutation({
  args: {
    email:      v.optional(v.string()),
    contactId:  v.optional(v.string()),
    startTime:  v.string(),             // date/heure ISO du kickoff
    externalId: v.optional(v.string()), // id iClosed (dédup)
  },
  handler: async (ctx, a) => {
    let cid = a.contactId
    if (!cid && a.email) {
      const e = a.email.trim()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (await ctx.db.query("crm_contacts").withIndex("by_email", (q: any) => q.eq("email", e)).first())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?? (await ctx.db.query("crm_contacts").withIndex("by_email", (q: any) => q.eq("email", e.toLowerCase())).first())
      cid = c?._id.toString()
    }
    if (!cid) return { ok: false, reason: "contact introuvable" }
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ob = await ctx.db.query("onboarding").withIndex("by_contact", (q: any) => q.eq("contactId", cid)).first()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks = { ...((ob?.tasks as any) ?? {}), kickoffPlanned: true }
    const patch = { tasks, kickoffAt: a.startTime, kickoffEventId: a.externalId ?? `iclosed-kickoff-${cid}`, updatedAt: now }
    if (ob) await ctx.db.patch(ob._id, patch)
    else await ctx.db.insert("onboarding", { contactId: cid, ...patch } as never)
    await syncClientStage(ctx, cid)   // → « Kickoff booké »
    return { ok: true, contactId: cid }
  },
})
