// Réception des leads de formulaire Facebook et suivi de leur parcours.
//
// Zernio est abonné au webhook `leadgen` de Meta et nous repousse chaque
// soumission (événement `lead.received`). À l'arrivée on crée le contact et le
// lead, on pose l'étiquette d'origine, et on ouvre un PARCOURS identifié par un
// jeton court. Ce jeton voyage ensuite dans les liens : quiz, rendez-vous, quiz
// de fin. Quand un outil externe ne nous le renvoie pas, l'email sert de filet.
import { internalMutation, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const now = () => new Date().toISOString()

/** Jeton court, lisible, sans caractères ambigus (ni O/0 ni I/l). */
function makeToken(seed: string): string {
  const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  let out = ""
  let x = h >>> 0
  for (let i = 0; i < 10; i++) { out += ALPHABET[x % ALPHABET.length]; x = Math.floor(x / ALPHABET.length) + 7919 * (i + 1) }
  return out
}

/**
 * Parcours déduit du nom du formulaire quand aucune correspondance n'est posée.
 * Un formulaire nommé « VSL » ne doit jamais tomber dans l'entonnoir du quiz.
 */
function guessFunnel(formName?: string | null): string {
  const n = (formName ?? "").toLowerCase()
  if (/vsl|vid[ée]o de vente|page de vente/.test(n)) return "vsl"
  if (/insta/.test(n)) return "instagram"
  if (/linkedin/.test(n)) return "linkedin"
  return "quiz"
}

// Le formulaire Meta renvoie des clés normalisées ; on accepte les variantes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(fields: any, keys: string[]): string | undefined {
  if (!fields) return undefined
  for (const k of keys) {
    const found = Object.keys(fields).find((f) => f.toLowerCase().replace(/[^a-z]/g, "") === k)
    if (found && fields[found]) return String(fields[found]).trim()
  }
  return undefined
}

/**
 * Crée (ou complète) le contact, le lead et le parcours à partir d'une
 * soumission de formulaire. Idempotent sur `leadgenId` : Meta et Zernio peuvent
 * rejouer un événement, on ne veut pas deux fois le même lead.
 */
export const fromLeadForm = internalMutation({
  args: {
    leadgenId: v.string(),
    formId: v.optional(v.string()),
    formName: v.optional(v.string()),
    adId: v.optional(v.string()),
    adsetId: v.optional(v.string()),
    campaignId: v.optional(v.string()),
    isOrganic: v.optional(v.boolean()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: v.any(),
    createdAt: v.optional(v.string()),
    funnel: v.optional(v.string()),
    origin: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const already = await ctx.db
      .query("os_lead_journey")
      .withIndex("by_leadgen", (q) => q.eq("leadgenId", a.leadgenId))
      .first()
    if (already) return { duplicated: true, token: already.token }

    const email = pick(a.fields, ["email", "emailaddress", "courriel"])?.toLowerCase()
    const phone = pick(a.fields, ["phonenumber", "phone", "telephone", "tel"])
    const full = pick(a.fields, ["fullname", "name", "nomcomplet", "nom"]) ?? ""
    const first = pick(a.fields, ["firstname", "prenom"]) ?? full.split(" ")[0] ?? "Sans nom"
    const last = pick(a.fields, ["lastname", "nom"]) ?? (full.split(" ").slice(1).join(" ") || undefined)
    // Le parcours vient de la correspondance du formulaire, sinon de son nom.
    // Écrire « quiz » en dur ferait compter les leads d'un futur formulaire VSL
    // dans l'entonnoir du quiz.
    const mapped = a.formId
      ? await ctx.db.query("os_form_funnels").withIndex("by_form", (q) => q.eq("formId", a.formId!)).first()
      : null
    const funnel = a.funnel ?? mapped?.funnel ?? guessFunnel(a.formName)
    const origin = a.origin ?? mapped?.origin ?? "facebook"
    const token = makeToken(a.leadgenId)

    // Contact : on complète l'existant plutôt que d'en créer un doublon.
    const contacts = await ctx.db.query("crm_contacts").collect()
    const dup = email ? contacts.find((c) => c.email?.toLowerCase() === email) : undefined
    let contactRef: typeof contacts[number]["_id"]
    let contactId: string
    if (dup) {
      await ctx.db.patch(dup._id, {
        phone: dup.phone ?? phone,
        firstName: dup.firstName || first,
        lastName: dup.lastName ?? last,
        statut: dup.statut ?? "lead",
        leadStatus: "active",
        source: dup.source ?? "inbound",
        updatedAt: now(),
      })
      contactRef = dup._id
      contactId = String(dup._id)
    } else {
      contactRef = await ctx.db.insert("crm_contacts", {
        firstName: first, lastName: last, email, phone,
        source: "inbound", statut: "lead", leadStatus: "active", temperature: "tiede",
        tags: [`origine:${origin}`, `funnel:${funnel}`],
        createdAt: now(),
      })
      contactId = String(contactRef)
    }

    // Lead du pipeline, avec son parcours et son étiquette d'origine.
    const pipelines = await ctx.db.query("pipeline_config").collect()
    const pipelineId = String(pipelines[0]?._id ?? "leads")
    const name = [first, last].filter(Boolean).join(" ") || email || "Lead Facebook"
    const leadId = String(await ctx.db.insert("crm_leads", {
      contactId: contactRef, name, email, phone,
      pipelineId, stageId: "nouveau-lead", value: 0,
      source: "inbound", funnel, origin, token,
      status: "open",
      initials: (first[0] ?? "?").toUpperCase() + (last?.[0] ?? "").toUpperCase(),
      createdAt: now(),
    }))

    // Le lead entre directement dans « Leads interne » du board prospection : il
    // n'est pas à convertir mais à rappeler, comme un lead qui a booké. La puce
    // « Appel de clarté » le signale, la puce d'origine dit d'où il vient.
    await ctx.db.insert("prospection_records", {
      workspaceId: WORKSPACE,
      contactId,
      leadId,
      boardColumn: "leads_interne",
      phase: "phase1",
      internalLead: true,
      cadrage: true,
      origin,
      temperature: "tiede",
      status: "active",
      createdAt: now(),
      updatedAt: now(),
    })

    await ctx.db.insert("os_lead_journey", {
      workspaceId: WORKSPACE, token, contactId, leadId, funnel,
      email, phone, name,
      leadgenId: a.leadgenId, formId: a.formId, adId: a.adId ?? undefined,
      adsetId: a.adsetId ?? undefined, campaignId: a.campaignId ?? undefined,
      isOrganic: a.isOrganic,
      fieldsJson: JSON.stringify(a.fields ?? {}),
      steps: [{ step: "formulaire", at: a.createdAt ?? now(), meta: a.formName ?? undefined }],
      createdAt: now(), updatedAt: now(),
    })
    return { duplicated: false, token, contactId, leadId }
  },
})

/**
 * À quel parcours appartient un formulaire Meta.
 *
 * Ordre : correspondance explicite en base, sinon déduction depuis le NOM du
 * formulaire, sinon quiz par défaut. Sans ça, un second formulaire (VSL) verrait
 * ses leads comptés dans l'entonnoir du quiz.
 */
export const funnelForForm = query({
  args: { formId: v.optional(v.string()), formName: v.optional(v.string()) },
  handler: async (ctx, a) => {
    if (a.formId) {
      const row = await ctx.db.query("os_form_funnels").withIndex("by_form", (q) => q.eq("formId", a.formId!)).first()
      if (row) return { funnel: row.funnel, origin: row.origin ?? "facebook", source: "table" }
    }
    return { funnel: guessFunnel(a.formName), origin: "facebook", source: "nom" }
  },
})

/** Associe explicitement un formulaire à un parcours (prime sur le nom). */
export const mapForm = mutation({
  args: { formId: v.string(), funnel: v.string(), formName: v.optional(v.string()), origin: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const existing = await ctx.db.query("os_form_funnels").withIndex("by_form", (q) => q.eq("formId", a.formId)).first()
    if (existing) {
      await ctx.db.patch(existing._id, { funnel: a.funnel, formName: a.formName ?? existing.formName, origin: a.origin ?? existing.origin })
      return { updated: true }
    }
    await ctx.db.insert("os_form_funnels", {
      workspaceId: WORKSPACE, formId: a.formId, formName: a.formName,
      funnel: a.funnel, origin: a.origin ?? "facebook", createdAt: now(),
    })
    return { updated: false }
  },
})

/** Les correspondances connues, pour vérification. */
export const formMappings = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("os_form_funnels").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect(),
})

/** Marque une étape du parcours. Une même étape ne s'écrit qu'une fois. */
export const markStep = internalMutation({
  args: { token: v.optional(v.string()), email: v.optional(v.string()), step: v.string(), meta: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const row = a.token
      ? await ctx.db.query("os_lead_journey").withIndex("by_token", (q) => q.eq("token", a.token!)).first()
      : a.email
        ? await ctx.db.query("os_lead_journey").withIndex("by_email", (q) => q.eq("email", a.email!.toLowerCase())).first()
        : null
    if (!row) return { found: false }
    if (row.steps.some((s) => s.step === a.step)) return { found: true, already: true }
    await ctx.db.patch(row._id, {
      steps: [...row.steps, { step: a.step, at: now(), meta: a.meta }],
      updatedAt: now(),
    })
    return { found: true, already: false, leadId: row.leadId }
  },
})

/** Parcours d'un lead, pour l'afficher sur sa fiche. */
export const journey = query({
  args: { token: v.optional(v.string()), email: v.optional(v.string()), leadId: v.optional(v.string()) },
  handler: async (ctx, a) => {
    if (a.token) return await ctx.db.query("os_lead_journey").withIndex("by_token", (q) => q.eq("token", a.token!)).first()
    if (a.email) return await ctx.db.query("os_lead_journey").withIndex("by_email", (q) => q.eq("email", a.email!.toLowerCase())).first()
    if (a.leadId) {
      const rows = await ctx.db.query("os_lead_journey").withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE)).collect()
      return rows.find((r) => r.leadId === a.leadId) ?? null
    }
    return null
  },
})

/**
 * Origine complète d'un contact : par où il est entré ET quelle publicité l'a
 * amené. Le parcours porte l'identifiant de l'annonce, la table des créas porte
 * son nom : c'est la jointure qui rend l'information lisible sur la fiche.
 */
export const originFor = query({
  args: { contactId: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, a) => {
    if (!a.contactId && !a.email) return null
    const rows = await ctx.db
      .query("os_lead_journey")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const row = a.contactId
      ? rows.find((r) => r.contactId === a.contactId)
      : rows.find((r) => r.email?.toLowerCase() === a.email!.toLowerCase())
    if (!row) return null

    // Nom de la créa : on cherche l'annonce dans les créas synchronisées.
    let adName: string | null = null
    let campaignName: string | null = null
    if (row.adId) {
      const crea = await ctx.db
        .query("meta_creatives")
        .withIndex("by_ws_ad", (q) => q.eq("workspaceId", WORKSPACE).eq("adId", row.adId!))
        .first()
      adName = crea?.name ?? null
      campaignName = crea?.campaign ?? null
    }
    return {
      funnel: row.funnel,
      formName: row.steps.find((st) => st.step === "formulaire")?.meta ?? null,
      adId: row.adId ?? null,
      adName, campaignName,
      isOrganic: row.isOrganic ?? null,
      steps: row.steps,
      token: row.token,
    }
  },
})

/** Les parcours de la période, pour compter les étapes du parcours Quiz. */
export const list = query({
  args: { funnel: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("os_lead_journey")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    return rows
      .filter((r) => !a.funnel || r.funnel === a.funnel)
      .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))
      .slice(0, a.limit ?? 200)
  },
})

/**
 * Le formulaire Meta ne connaît pas notre jeton : il renvoie SON identifiant de
 * soumission (`{{lead_id}}`). On le convertit ici, on marque l'étape, et on rend
 * le jeton pour qu'il continue le voyage dans les liens suivants.
 */
export const trackByLeadgen = mutation({
  args: { leadgenId: v.string(), step: v.string() },
  handler: async (ctx, a) => {
    const row = await ctx.db
      .query("os_lead_journey")
      .withIndex("by_leadgen", (q) => q.eq("leadgenId", a.leadgenId))
      .first()
    // Le clic peut précéder le webhook : on ne bloque pas le prospect pour autant.
    if (!row) return { found: false, token: null }
    if (!row.steps.some((s) => s.step === a.step)) {
      await ctx.db.patch(row._id, { steps: [...row.steps, { step: a.step, at: now() }], updatedAt: now() })
    }
    return { found: true, token: row.token }
  },
})

/** Étape franchie, appelée par une page publique (redirection du quiz). */
export const track = mutation({
  args: { token: v.string(), step: v.string(), meta: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const row = await ctx.db.query("os_lead_journey").withIndex("by_token", (q) => q.eq("token", a.token)).first()
    if (!row) return { found: false }
    if (row.steps.some((s) => s.step === a.step)) return { found: true, already: true }
    await ctx.db.patch(row._id, { steps: [...row.steps, { step: a.step, at: now(), meta: a.meta }], updatedAt: now() })
    return { found: true, already: false }
  },
})
