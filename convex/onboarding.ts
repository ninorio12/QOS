import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

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

// Payment control tower — aggregate every client's installments & refunds
export const paymentsOverview = query({
  handler: async (ctx) => {
    const obs      = await ctx.db.query("onboarding").collect()
    const clients  = await ctx.db.query("pipeline_clients").collect()
    const contacts = await ctx.db.query("crm_contacts").collect()
    const clientByContact = new Map(clients.map(c => [c.ghl_contact_id ?? '', c]))
    const contactById = new Map(contacts.map(c => [c._id.toString(), c]))

    type Txn = { contactId: string; client: string; company: string; label: string; amount: number; date: string; type: 'payment' | 'refund'; status: 'encaissé' | 'attente' }
    const transactions: Txn[] = []
    let encaisse = 0, attente = 0, rembourse = 0

    for (const ob of obs) {
      const client = clientByContact.get(ob.contactId)
      const contact = contactById.get(ob.contactId)
      const name = client?.name || (contact ? `${contact.firstName} ${contact.lastName ?? ''}`.trim() : '—')
      const company = client?.company || contact?.companyName || ''
      const amounts = ob.payment?.amounts ?? (client ? [client.value] : [])
      const paid = ob.paidStatus ?? []
      const dates = ob.paidDates ?? []

      amounts.forEach((amt, i) => {
        const isPaid = paid[i] === true
        if (isPaid) encaisse += amt; else attente += amt
        transactions.push({
          contactId: ob.contactId, client: name, company,
          label: amounts.length > 1 ? `Échéance ${i + 1}/${amounts.length}` : 'Paiement',
          amount: amt, date: dates[i] || '', type: 'payment',
          status: isPaid ? 'encaissé' : 'attente',
        })
      })
      for (const r of ob.refunds ?? []) {
        rembourse += r.amount
        transactions.push({ contactId: ob.contactId, client: name, company, label: r.note || 'Remboursement', amount: -r.amount, date: r.date, type: 'refund', status: 'encaissé' })
      }
    }

    // Clients without onboarding doc yet → all their value is "en attente"
    for (const cl of clients) {
      if (!obs.find(o => o.contactId === (cl.ghl_contact_id ?? ''))) {
        attente += cl.value
        transactions.push({ contactId: cl.ghl_contact_id ?? '', client: cl.name, company: cl.company ?? '', label: 'Paiement', amount: cl.value, date: '', type: 'payment', status: 'attente' })
      }
    }

    transactions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return { encaisse, attente, rembourse, net: encaisse - rembourse, transactions }
  },
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Public form intake — called by the standalone onboarding form (cross-origin via /api/onboarding/intake).
// Matches the contact by email; creates one if unknown; ensures it appears in the onboarding module;
// merges the submission into onboarding.form.
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
        statut:      'client',
        tags:        [],
        createdAt:   now,
        updatedAt:   now,
      })
      contact = await ctx.db.get(newId)
      created = true
    }
    const contactId = contact!._id.toString()

    // 2. Ensure a pipeline_clients row exists so the submission shows in the onboarding module.
    const existingClient = await ctx.db
      .query("pipeline_clients")
      .withIndex("by_ghl_contact", q => q.eq("ghl_contact_id", contactId))
      .first()
    if (!existingClient) {
      const name = `${contact!.firstName ?? ''} ${contact!.lastName ?? ''}`.trim() || normEmail
      const initials = name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
      const cfg = await ctx.db.query("pipeline_config").withIndex("by_type", q => q.eq("type", "clients")).first()
      const stageId = cfg?.stages?.[0]?.id ?? 'onboarding'
      await ctx.db.insert("pipeline_clients", {
        ghl_contact_id: contactId,
        name,
        company: contact!.companyName,
        email:   normEmail,
        phone:   contact!.phone,
        value:   0,
        stageId,
        initials,
        createdAt: now,
      })
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

    return { ok: true, contactId, created }
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
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert("onboarding", { contactId, ...patch } as never)
  },
})
