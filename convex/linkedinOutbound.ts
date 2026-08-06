import { v } from "convex/values"
import { query, internalMutation, mutation } from "./_generated/server"

/**
 * Parcours LinkedIn : haut de l'entonnoir alimenté par lemlist.
 *
 * Le module Performance attend Connexions -> DMs envoyés -> Conversations avant
 * les étapes R1/Shows/Ventes déjà couvertes par funnelCohort. Ces trois compteurs
 * n'avaient « pas de source aujourd'hui » : ce fichier est cette source.
 *
 * Un pont sur le VPS lit les activités lemlist et appelle `ingest`. Chaque
 * conversation crée en plus un contact CRM étiqueté « origine:linkedin », en
 * INBOUND (décision Thomas : un prospect qui répond devient un lead entrant),
 * ce qui rend la liste cliquable comme celle de Meta Ads.
 */

const WORKSPACE = "vividflow"

/** Compteurs quotidiens du haut d'entonnoir, un enregistrement par jour. */
export const ingest = internalMutation({
  args: {
    day: v.string(),              // YYYY-MM-DD
    connexions: v.number(),       // invitations acceptées ce jour
    dmsEnvoyes: v.number(),
    conversations: v.number(),
    invitations: v.optional(v.number()),   // invitations ENVOYÉES (suivi du quota)
    campaignId: v.optional(v.string()),
  },
  returns: v.object({ created: v.boolean(), day: v.string() }),
  handler: async (ctx, a) => {
    const row = await ctx.db
      .query("os_linkedin_daily")
      .withIndex("by_day", (q) => q.eq("workspaceId", WORKSPACE).eq("day", a.day))
      .first()
    const doc = {
      workspaceId: WORKSPACE,
      day: a.day,
      connexions: a.connexions,
      dmsEnvoyes: a.dmsEnvoyes,
      conversations: a.conversations,
      invitations: a.invitations ?? 0,
      campaignId: a.campaignId,
      updatedAt: new Date().toISOString(),
    }
    if (row) {
      await ctx.db.patch(row._id, doc)
      return { created: false, day: a.day }
    }
    await ctx.db.insert("os_linkedin_daily", doc)
    return { created: true, day: a.day }
  },
})

/**
 * Une conversation LinkedIn crée un lead INBOUND.
 * Anti-doublon sur l'URL LinkedIn, puis sur prénom+entreprise.
 */
export const contactFromConversation = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
    companyName: v.optional(v.string()),
    linkedinUrl: v.string(),
    jobTitle: v.optional(v.string()),
    city: v.optional(v.string()),
    website: v.optional(v.string()),
    niche: v.optional(v.string()),
    repliedAt: v.optional(v.string()),
  },
  returns: v.object({ id: v.union(v.string(), v.null()), created: v.boolean() }),
  handler: async (ctx, a) => {
    const norm = (u?: string) => (u ?? "").replace(/\/+$/, "").toLowerCase()
    const all = await ctx.db.query("crm_contacts").collect()
    const cible = norm(a.linkedinUrl)

    let dup = all.find((c) => cible && norm(c.linkedinUrl) === cible)
    if (!dup && a.companyName) {
      dup = all.find(
        (c) =>
          (c.firstName ?? "").toLowerCase() === a.firstName.toLowerCase() &&
          (c.companyName ?? "").toLowerCase() === (a.companyName ?? "").toLowerCase(),
      )
    }

    const tags = ["origine:linkedin", "funnel:linkedin"]
    if (dup) {
      // On n'écrase rien : on complète et on marque l'origine si elle manque.
      await ctx.db.patch(dup._id, {
        tags: [...new Set([...(dup.tags ?? []), ...tags])],
        linkedinUrl: dup.linkedinUrl ?? a.linkedinUrl,
        companyName: dup.companyName ?? a.companyName,
        website: dup.website ?? a.website,
        statut: dup.statut ?? "lead",
        source: dup.source ?? "inbound",
      })
      return { id: dup._id.toString(), created: false }
    }

    const id = await ctx.db.insert("crm_contacts", {
      firstName: a.firstName,
      lastName: a.lastName,
      companyName: a.companyName,
      linkedinUrl: a.linkedinUrl,
      website: a.website,
      city: a.city,
      country: "Suisse",
      metier: a.jobTitle,
      niche: a.niche,
      // Décision Thomas : le prospect a répondu, il entre de lui-même dans la
      // conversation, donc INBOUND et non outbound.
      source: "inbound",
      statut: "lead",
      leadStatus: "active",
      temperature: "tiede",
      tags,
      createdAt: a.repliedAt ?? new Date().toISOString(),
    })
    return { id: id.toString(), created: true }
  },
})

/** Compteurs agrégés sur une période, pour le haut de l'entonnoir LinkedIn. */
export const funnelTop = query({
  args: { from: v.string(), to: v.string() },
  returns: v.object({
    connexions: v.number(),
    dmsEnvoyes: v.number(),
    conversations: v.number(),
    invitations: v.number(),
    jours: v.number(),
  }),
  handler: async (ctx, a) => {
    const rows = await ctx.db
      .query("os_linkedin_daily")
      .withIndex("by_day", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const dans = rows.filter((r) => r.day >= a.from && r.day <= a.to)
    const somme = (k: "connexions" | "dmsEnvoyes" | "conversations" | "invitations") =>
      dans.reduce((n, r) => n + (r[k] ?? 0), 0)
    return {
      connexions: somme("connexions"),
      dmsEnvoyes: somme("dmsEnvoyes"),
      conversations: somme("conversations"),
      invitations: somme("invitations"),
      jours: dans.length,
    }
  },
})

/** La liste derrière la flèche, même contrat que metaInboundContacts. */
export const contacts = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      company: v.union(v.string(), v.null()),
      jobTitle: v.union(v.string(), v.null()),
      linkedinUrl: v.union(v.string(), v.null()),
      statut: v.union(v.string(), v.null()),
      createdAt: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const all = await ctx.db.query("crm_contacts").collect()
    return all
      .filter((c) => (c.tags ?? []).includes("origine:linkedin"))
      .sort((x, y) => (y.createdAt ?? "").localeCompare(x.createdAt ?? ""))
      .map((c) => ({
        id: c._id.toString(),
        name: [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Sans nom",
        company: c.companyName ?? null,
        jobTitle: c.metier ?? null,
        linkedinUrl: c.linkedinUrl ?? null,
        statut: c.statut ?? null,
        createdAt: c.createdAt ?? "",
      }))
  },
})
