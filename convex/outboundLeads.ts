import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

const ETAPES = ["a_auditer", "audit_ok", "a_corriger", "rejete", "deck_a_faire", "pret_envoi", "email_envoye", "relance", "importe", "froid"]

// Crée un lead outbound (état initial 'a_auditer'). Dédup par email (sinon retourne l'existant).
export const create = mutation({
  args: {
    firstName: v.string(), lastName: v.optional(v.string()), email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()), role: v.optional(v.string()), niche: v.optional(v.string()),
    canton: v.optional(v.string()), website: v.optional(v.string()), source: v.optional(v.string()),
    score: v.optional(v.string()), note: v.optional(v.string()), createdBy: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const iso = new Date().toISOString()
    const email = a.email?.toLowerCase().trim()
    if (email) {
      const dup = (await ctx.db.query("outbound_leads").withIndex("by_email", q => q.eq("email", email)).collect())
        .find(r => r.workspaceId === WORKSPACE)
      if (dup) return { id: dup._id, created: false, etape: dup.etape }
    }
    const id = await ctx.db.insert("outbound_leads", {
      workspaceId: WORKSPACE, firstName: a.firstName, lastName: a.lastName, email, phone: a.phone,
      company: a.company, role: a.role, niche: a.niche, canton: a.canton, website: a.website,
      source: a.source, score: a.score, etape: "a_auditer", agentResponsable: "data_analyst",
      note: a.note, lastActivity: iso, createdBy: a.createdBy ?? "agent", createdAt: iso,
    })
    return { id, created: true, etape: "a_auditer" }
  },
})

// Liste les leads outbound, filtrable par étape.
export const list = query({
  args: { etape: v.optional(v.string()) },
  handler: async (ctx, { etape }) => {
    const rows = etape
      ? await ctx.db.query("outbound_leads").withIndex("by_etape", q => q.eq("workspaceId", WORKSPACE).eq("etape", etape)).collect()
      : await ctx.db.query("outbound_leads").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    return rows
      .sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1))
      .map(r => ({
        id: r._id, firstName: r.firstName, lastName: r.lastName ?? null, email: r.email ?? null, phone: r.phone ?? null,
        company: r.company ?? null, role: r.role ?? null, niche: r.niche ?? null, canton: r.canton ?? null,
        website: r.website ?? null, source: r.source ?? null, score: r.score ?? null,
        etape: r.etape, agentResponsable: r.agentResponsable ?? null, note: r.note ?? null,
        deckUrl: r.deckUrl ?? null, repondu_le: r.repondu_le ?? null, lastActivity: r.lastActivity,
      }))
  },
})

// Met à jour l'étape (+ score/agent/note/deck). C'est l'écriture d'état de la loop.
export const setStage = mutation({
  args: {
    id: v.id("outbound_leads"), etape: v.string(),
    score: v.optional(v.string()), agentResponsable: v.optional(v.string()),
    note: v.optional(v.string()), deckUrl: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    if (!ETAPES.includes(a.etape)) throw new Error(`Étape invalide: ${a.etape}. Autorisées: ${ETAPES.join(", ")}`)
    const patch: Record<string, unknown> = { etape: a.etape, lastActivity: new Date().toISOString() }
    if (a.score !== undefined) patch.score = a.score
    if (a.agentResponsable !== undefined) patch.agentResponsable = a.agentResponsable
    if (a.note !== undefined) patch.note = a.note
    if (a.deckUrl !== undefined) patch.deckUrl = a.deckUrl
    await ctx.db.patch(a.id, patch)
    return { ok: true, etape: a.etape }
  },
})

// Marque un lead « a répondu » (alimente le taux de réponse). Set/unset `repondu_le`.
export const markReplied = mutation({
  args: { id: v.id("outbound_leads"), replied: v.boolean(), date: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await ctx.db.patch(a.id, { repondu_le: a.replied ? (a.date ?? new Date().toISOString()) : undefined, lastActivity: new Date().toISOString() })
    return { ok: true }
  },
})

// Idem mais par EMAIL — pour la détection Gmail / sync sheet (qui connaît l'expéditeur, pas l'id).
export const markRepliedByEmail = mutation({
  args: { email: v.string(), date: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const email = a.email.toLowerCase().trim()
    const lead = (await ctx.db.query("outbound_leads").withIndex("by_email", q => q.eq("email", email)).collect())[0]
    if (!lead) return { ok: false, reason: "lead introuvable" }
    await ctx.db.patch(lead._id, { repondu_le: a.date ?? new Date().toISOString(), lastActivity: new Date().toISOString() })
    return { ok: true, id: lead._id }
  },
})

/**
 * Le deck de présentation d'un contact, par son email.
 *
 * Chaque lead outbound reçoit une présentation personnalisée déployée sur son
 * propre sous-domaine (https://<slug>.vividflow.co). Le lien vivait dans le
 * fichier de sourcing : il fallait le retrouver à la main avant d'appeler. Les
 * fiches (Contacts et Prospection) le lisent maintenant ici.
 *
 * Renvoie null si le contact n'est pas un lead outbound : c'est ce qui permet
 * aux fiches de n'afficher le bloc que là où il a un sens.
 */
export const deckByEmail = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const cle = (email ?? "").trim().toLowerCase()
    if (!cle) return null
    const lead = (await ctx.db.query("outbound_leads").withIndex("by_email", q => q.eq("email", cle)).collect())
      .find(r => r.workspaceId === WORKSPACE)
    if (!lead) return null
    return {
      id: lead._id,
      deckUrl: lead.deckUrl ?? null,
      etape: lead.etape,
      company: lead.company ?? null,
    }
  },
})

/**
 * Pose l'URL du deck sur un lead, sans toucher à son étape.
 *
 * `setStage` sait déjà écrire ce champ, mais il déplace aussi l'étape et la
 * dernière activité : rattacher un deck déjà déployé n'est ni l'un ni l'autre.
 */
export const setDeckUrl = mutation({
  args: { id: v.id("outbound_leads"), deckUrl: v.string() },
  handler: async (ctx, { id, deckUrl }) => {
    await ctx.db.patch(id, { deckUrl })
    return { ok: true }
  },
})

/**
 * Rattache en une passe les decks lus dans la feuille de sourcing.
 *
 * La feuille est la source de vérité : c'est là qu'un deck est noté quand il
 * est déployé. Le Data OS, lui, ne le savait que si le script de déploiement
 * avait pensé à le lui dire. Cette porte réconcilie les deux.
 *
 * Trois règles, dans cet ordre :
 *   • rattachement par EMAIL, sinon par nom + prénom (la feuille et le Data OS
 *     ne portent pas toujours la même adresse pour la même personne) ;
 *   • un lead qui a DÉJÀ un deck différent n'est jamais écrasé en silence : il
 *     est renvoyé dans `divergences`, à trancher à la main ;
 *   • rien n'est créé : une ligne de la feuille absente du Data OS est comptée,
 *     pas importée. Importer des leads est une autre décision.
 */
export const attachDecksFromSheet = mutation({
  args: {
    secret: v.string(),
    lignes: v.array(v.object({
      email: v.optional(v.string()), firstName: v.optional(v.string()),
      lastName: v.optional(v.string()), deckUrl: v.string(),
    })),
  },
  handler: async (ctx, { secret, lignes }) => {
    if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
      throw new Error("Non autorisé")
    }
    // Accents et casse mis de côté : « Blétry » et « bletry » sont la même personne.
    const norm = (s?: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    const leads = await ctx.db.query("outbound_leads").withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE)).collect()
    const parEmail = new Map(leads.filter(l => l.email).map(l => [norm(l.email), l]))
    const parNom = new Map(leads.map(l => [`${norm(l.firstName)}|${norm(l.lastName)}`, l]))

    let rattaches = 0, inchanges = 0, absents = 0
    const divergences: { email: string | null; actuel: string; feuille: string }[] = []
    for (const ligne of lignes) {
      const url = ligne.deckUrl.trim()
      if (!/^https?:\/\/[\w.-]+\.vividflow\.co\/?$/.test(url)) continue
      const lead = parEmail.get(norm(ligne.email)) ?? parNom.get(`${norm(ligne.firstName)}|${norm(ligne.lastName)}`)
      if (!lead) { absents++; continue }
      if (lead.deckUrl === url) { inchanges++; continue }
      if (lead.deckUrl) { divergences.push({ email: lead.email ?? null, actuel: lead.deckUrl, feuille: url }); continue }
      await ctx.db.patch(lead._id, { deckUrl: url })
      rattaches++
    }
    return { rattaches, inchanges, absents, divergences, leads: leads.length }
  },
})

/** Pose le téléphone d'un lead, sans toucher à son étape (même esprit que setDeckUrl). */
export const setPhone = mutation({
  args: { id: v.id("outbound_leads"), phone: v.string() },
  handler: async (ctx, { id, phone }) => {
    await ctx.db.patch(id, { phone })
    return { ok: true }
  },
})
