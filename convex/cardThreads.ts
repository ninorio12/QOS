// Cockpit Media Buyer — un fil de discussion et un levier PAR CARD KPI.
//
// Principes scellés avec Jonathan (mockup qos-cockpit-mockup.vercel.app) :
//  - la card repliée montre juste « modifié le … par X » avec l'avatar ;
//  - dépliée : le fil (Jonathan, Thomas, l'agent avec son badge) + le levier ;
//  - PAS de bouton « appliquer » ni de ligne système : bouger un levier écrit un
//    message ordinaire dans le fil, au nom de la personne qui a bougé ;
//  - 🎯 (icon "target") uniquement quand le message pose une cible ;
//  - au bout de 3 jours sans suite, le fil passe à l'historique.
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server"
import { v } from "convex/values"
import { WORKSPACE } from "./osLib"

const ARCHIVE_MS = 3 * 86400_000
const AGENT_NAME = "Media Buyer"

async function whoami(ctx: QueryCtx | MutationCtx): Promise<{ name: string; avatarUrl?: string; isAdmin: boolean } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkUserId", identity.subject))
    .first()
  return user ? { name: user.name, avatarUrl: user.avatarUrl ?? undefined, isAdmin: user.role === "admin" } : null
}

const fmtChf = (n: number) => (Math.round(n * 100) / 100).toLocaleString("fr-CH")

// Message écrit par le mouvement d'un levier : la trace est humaine, pas système.
const LEVERS: Record<string, { cardId: string; message: (v: number) => string; icon?: "target" }> = {
  budgetPerDay: { cardId: "spend", message: (n) => `J'ai passé le budget à ${fmtChf(n)} CHF/j.` },
  cplTarget:    { cardId: "cpl",   message: (n) => `Cible CPL posée à ${fmtChf(n)} CHF.`, icon: "target" },
  leadsWeekly:  { cardId: "leads", message: (n) => `Objectif posé à ${Math.round(n)} leads/semaine.`, icon: "target" },
  ctrFloor:     { cardId: "ctr",   message: (n) => `Plancher CTR posé à ${fmtChf(n)} %.`, icon: "target" },
}

/** Tout ce que le board affiche, en une requête : dernier message par card,
 *  fils actifs (moins de 3 jours), compteur d'historique, valeurs des leviers. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const msgs = await ctx.db
      .query("os_card_messages")
      .withIndex("by_ws", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    const settings = await ctx.db.query("os_card_settings").collect()
    const now = Date.now()

    const cards: Record<string, {
      last: { author: string; authorKind: string; avatarUrl?: string; createdAt: number } | null
      active: typeof msgs
      archivedCount: number
    }> = {}
    for (const m of msgs) {
      const c = (cards[m.cardId] ??= { last: null, active: [], archivedCount: 0 })
      if (!c.last || m.createdAt > c.last.createdAt)
        c.last = { author: m.author, authorKind: m.authorKind, avatarUrl: m.avatarUrl, createdAt: m.createdAt }
      if (now - m.createdAt < ARCHIVE_MS) c.active.push(m)
      else c.archivedCount++
    }
    for (const c of Object.values(cards)) c.active.sort((a, b) => a.createdAt - b.createdAt)

    const levers: Record<string, { value: number; updatedBy: string; updatedAt: number }> = {}
    for (const s of settings.filter((s) => s.workspaceId === WORKSPACE))
      levers[s.key] = { value: s.value, updatedBy: s.updatedBy, updatedAt: s.updatedAt }

    return { cards, levers }
  },
})

/** Historique d'une card : les messages rangés (plus de 3 jours), récents d'abord. */
export const history = query({
  args: { cardId: v.string() },
  handler: async (ctx, a) => {
    const msgs = await ctx.db
      .query("os_card_messages")
      .withIndex("by_ws_card", (q) => q.eq("workspaceId", WORKSPACE).eq("cardId", a.cardId))
      .collect()
    const cutoff = Date.now() - ARCHIVE_MS
    return msgs.filter((m) => m.createdAt <= cutoff).sort((a2, b) => b.createdAt - a2.createdAt).slice(0, 200)
  },
})

/** Écrire dans le fil. L'identité vient de la session ; l'agent passe `author`. */
export const post = mutation({
  args: {
    cardId: v.string(),
    body: v.string(),
    icon: v.optional(v.string()),
    author: v.optional(v.string()),      // réservé au circuit agent (pas de session Clerk)
  },
  handler: async (ctx, a) => {
    const me = await whoami(ctx)
    const isAgent = !me
    await ctx.db.insert("os_card_messages", {
      workspaceId: WORKSPACE,
      cardId: a.cardId,
      author: me?.name ?? a.author ?? AGENT_NAME,
      authorKind: isAgent ? ("agent" as const) : ("human" as const),
      avatarUrl: me?.avatarUrl,
      body: a.body.trim(),
      icon: a.icon,
      createdAt: Date.now(),
    })
  },
})

/** Supprimer un message : son auteur, ou un admin. L'agent (pas de session) peut retirer les siens. */
export const remove = mutation({
  args: { id: v.id("os_card_messages") },
  handler: async (ctx, a) => {
    const msg = await ctx.db.get(a.id)
    if (!msg || msg.workspaceId !== WORKSPACE) throw new Error("Message introuvable")
    const me = await whoami(ctx)
    const allowed = me ? me.isAdmin || me.name === msg.author : msg.authorKind === "agent"
    if (!allowed) throw new Error("Seul l'auteur du message (ou un admin) peut le supprimer")
    await ctx.db.delete(a.id)
  },
})

/** Bouger un levier : la valeur s'enregistre ET laisse un message écrit dans le fil. */
export const setLever = mutation({
  args: { key: v.string(), value: v.number() },
  handler: async (ctx, a) => {
    const lever = LEVERS[a.key]
    if (!lever) throw new Error(`Levier inconnu : ${a.key}`)
    const me = await whoami(ctx)
    const name = me?.name ?? AGENT_NAME

    const existing = await ctx.db
      .query("os_card_settings")
      .withIndex("by_ws_key", (q) => q.eq("workspaceId", WORKSPACE).eq("key", a.key))
      .first()
    if (existing && existing.value === a.value) return   // rien n'a bougé, pas de bruit
    if (existing) await ctx.db.patch(existing._id, { value: a.value, updatedBy: name, updatedAt: Date.now() })
    else await ctx.db.insert("os_card_settings", { workspaceId: WORKSPACE, cardId: lever.cardId, key: a.key, value: a.value, updatedBy: name, updatedAt: Date.now() })

    await ctx.db.insert("os_card_messages", {
      workspaceId: WORKSPACE,
      cardId: lever.cardId,
      author: name,
      authorKind: me ? ("human" as const) : ("agent" as const),
      avatarUrl: me?.avatarUrl,
      body: lever.message(a.value),
      icon: lever.icon,
      createdAt: Date.now(),
    })
  },
})
