// Réception des leads de formulaire Facebook et suivi de leur parcours.
//
// Zernio est abonné au webhook `leadgen` de Meta et nous repousse chaque
// soumission (événement `lead.received`). À l'arrivée on crée le contact et le
// lead, on pose l'étiquette d'origine, et on ouvre un PARCOURS identifié par un
// jeton court. Ce jeton voyage ensuite dans les liens : quiz, rendez-vous, quiz
// de fin. Quand un outil externe ne nous le renvoie pas, l'email sert de filet.
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
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
    const dead = await ctx.db.query("os_ignored_leadgen").withIndex("by_leadgen", (q) => q.eq("leadgenId", a.leadgenId)).first()
    if (dead) return { duplicated: true, token: null, ignored: true }

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
    // Rapprochement par EMAIL d'abord, puis par TÉLÉPHONE : depuis que la page
    // d'identité du quiz ne demande plus d'adresse, le numéro est souvent la
    // seule clé. Sans ce second filet, la même personne revenue depuis un autre
    // appareil créait une deuxième fiche, donc un deuxième appel à passer.
    // Comparaison sur les 9 derniers chiffres : +41 79…, 0041 79… et 079… sont
    // le même numéro.
    const contacts = await ctx.db.query("crm_contacts").collect()
    const cle = (t?: string | null) => {
      const chiffres = (t ?? "").replace(/\D/g, "")
      return chiffres.length >= 9 ? chiffres.slice(-9) : ""
    }
    const cleTel = cle(phone)
    const dup = (email ? contacts.find((c) => c.email?.toLowerCase() === email) : undefined)
      ?? (cleTel ? contacts.find((c) => cle(c.phone) === cleTel) : undefined)
    let contactRef: typeof contacts[number]["_id"]
    let contactId: string
    if (dup) {
      // Le contact DÉJÀ CONNU doit lui aussi porter son parcours : à la conversion
      // en client le lead est supprimé, et seul ce tag permet encore de rattacher
      // la vente à son entonnoir.
      // Premier parcours gagnant : si le contact porte déjà une étiquette de
      // parcours, on ne la remplace pas (sinon il serait compté dans DEUX
      // entonnoirs à la fois). L'origine, elle, peut s'ajouter.
      const hasFunnel = (dup.tags ?? []).some((t) => t.startsWith("funnel:"))
      const tags = [...new Set([...(dup.tags ?? []), `origine:${origin}`, ...(hasFunnel ? [] : [`funnel:${funnel}`])])]
      await ctx.db.patch(dup._id, {
        tags,
        email: dup.email ?? email,
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

    // Un lead OUVERT existe déjà pour ce contact ? On le réutilise : en créer un
    // second ferait deux cartes pour la même personne et fausserait la cohorte.
    const openLead = dup
      ? (await ctx.db.query("crm_leads").withIndex("by_contact", (q) => q.eq("contactId", dup._id)).collect()).find((l) => l.status === "open")
      : undefined
    if (openLead) {
      await ctx.db.patch(openLead._id, { funnel: openLead.funnel ?? funnel, origin: openLead.origin ?? origin, token: openLead.token ?? token })
      const activeRec = (await ctx.db.query("prospection_records").withIndex("by_contact", (q) => q.eq("contactId", String(dup!._id))).collect())
        .find((r) => r.status !== "archived" && r.status !== "lost")
      if (!activeRec) {
        await ctx.db.insert("prospection_records", {
          workspaceId: WORKSPACE, contactId: String(dup!._id), leadId: String(openLead._id),
          boardColumn: "leads_a_traiter", phase: "phase1", internalLead: true, cadrage: true,
          origin, temperature: "tiede", status: "active", createdAt: now(), updatedAt: now(),
        })
      }
      await ctx.db.insert("os_lead_journey", {
        workspaceId: WORKSPACE, token, contactId: String(dup!._id), leadId: String(openLead._id), funnel,
        email, phone, name: [first, last].filter(Boolean).join(" ") || email,
        leadgenId: a.leadgenId, formId: a.formId, adId: a.adId ?? undefined,
        adsetId: a.adsetId ?? undefined, campaignId: a.campaignId ?? undefined,
        isOrganic: a.isOrganic, fieldsJson: JSON.stringify(a.fields ?? {}),
        steps: [{ step: "formulaire", at: a.createdAt ?? now(), meta: a.formName ?? undefined }],
        createdAt: now(), updatedAt: now(),
      })
      return { duplicated: false, token, contactId, leadId: String(openLead._id), reused: true }
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
      boardColumn: "leads_a_traiter",
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

/** Parcours d'un lead, pour l'afficher sur sa fiche.
 *  ⚠️ INTERNE (audit tribunal 2026-08-02) : cette query rend la ligne ENTIÈRE
 *  (téléphone, réponses brutes du formulaire, jeton). Publique, elle fuitait
 *  toute la fiche à qui connaissait l'email. Réservée au serveur ; l'écran
 *  passe par la fiche contact authentifiée, la page publique par /journey/lead. */
export const journey = internalQuery({
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

/**
 * Deck outbound généré : frappe le jeton du lead et l'attache à son parcours.
 * Appelé par le build du deck (SSG Hermes) via POST /deck/generated. Le jeton
 * part dans le lien iClosed du deck : si le prospect réserve seul, le webhook
 * iClosed rattache le RDV par jeton (= « RDV direct », la vraie réponse au mail).
 */
export const deckGenerated = internalMutation({
  args: { email: v.string(), name: v.optional(v.string()), company: v.optional(v.string()), slug: v.optional(v.string()), deckUrl: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const email = a.email.trim().toLowerCase()
    let row = await ctx.db.query("os_lead_journey").withIndex("by_email", (q) => q.eq("email", email)).first()
    if (!row) {
      const contact = await ctx.db.query("crm_contacts").withIndex("by_email", (q) => q.eq("email", email)).first()
        ?? await ctx.db.query("crm_contacts").withIndex("by_email", (q) => q.eq("email", a.email.trim())).first()
      const id = await ctx.db.insert("os_lead_journey", {
        workspaceId: WORKSPACE,
        token: makeToken("deck:" + email),
        contactId: contact ? String(contact._id) : undefined,
        funnel: "emailing",
        email, name: a.name,
        steps: [{ step: "deck_genere", at: now(), meta: a.slug }],
        createdAt: now(), updatedAt: now(),
      })
      row = await ctx.db.get(id)
    } else if (!row.steps.some((s) => s.step === "deck_genere")) {
      await ctx.db.patch(row._id, { steps: [...row.steps, { step: "deck_genere", at: now(), meta: a.slug }], updatedAt: now() })
    }
    // Le fichier de sourcing garde l'URL du deck (compteur « Decks générés »).
    if (a.deckUrl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lead = (await ctx.db.query("outbound_leads").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((l: any) => (l.email ?? "").trim().toLowerCase() === email)
      if (lead && !lead.deckUrl) await ctx.db.patch(lead._id, { deckUrl: a.deckUrl })
    }
    return { token: row!.token }
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

/**
 * Filet de rattrapage : relit les leads du cache Zernio et ingère ceux que le
 * webhook aurait manqués (panne, URL changée, 401 pendant une rotation de
 * secret…). Idempotent : fromLeadForm refuse les leadgenId déjà vus.
 */
export const syncFromZernio = action({
  args: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx): Promise<any> => {
    const key = process.env.ZERNIO_API_KEY
    if (!key) return { ok: false, error: "ZERNIO_API_KEY absent" }
    const res = await fetch("https://zernio.com/api/v1/ads/leads?limit=50", {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const json = await res.json()
    let ingested = 0, seen = 0
    for (const l of json.leads ?? []) {
      if (!l.leadgenId) continue
      const r = await ctx.runMutation(internal.leadIngest.fromLeadForm, {
        leadgenId: String(l.leadgenId),
        formId: l.formId ? String(l.formId) : undefined,
        formName: l.formName ?? undefined,
        adId: l.adId ?? undefined, adsetId: l.adsetId ?? undefined, campaignId: l.campaignId ?? undefined,
        isOrganic: Boolean(l.isOrganic),
        fields: l.fields ?? {},
        createdAt: l.createdTime ?? undefined,
      })
      if (r.duplicated) seen++; else ingested++
    }
    return { ok: true, ingested, seen }
  },
})
