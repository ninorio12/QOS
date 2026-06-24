import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAdmin } from "./osLib"

// Liste canonique des modules de l'app (chemins de routes). Utilisée pour les droits d'accès.
export const ALL_MODULES = ["/dashboard","/pipeline","/contacts","/prospection","/performance","/onboarding","/paiement","/calendrier","/bibliotheque/data","/bibliotheque/records","/bibliotheque/process","/equipe","/taches","/logs","/knowledge","/workflows","/budget","/integrations"]

// Utilisateur courant (depuis l'identité Clerk) — sert à gater l'UI (ex. boutons admin).
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const user = await ctx.db.query("users").withIndex("by_clerk", q => q.eq("clerkUserId", identity.subject)).first()
    if (!user) return null
    return { id: user._id, role: user.role, name: user.name, email: user.email, isAdmin: user.role === "admin" }
  },
})

// Profils VividFlow (membres de l'équipe humaine). Source des participants "Équipe" du calendrier.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect()
    return rows
      .map(r => ({ id: r._id, name: r.name, email: r.email, role: r.role, avatarUrl: r.avatarUrl }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const create = mutation({
  args: { name: v.string(), email: v.string(), role: v.optional(v.string()), avatarUrl: v.optional(v.string()), workspaceId: v.optional(v.string()) },
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    // Pas de doublon sur l'email
    const existing = (await ctx.db.query("users").collect()).find(u => u.email.toLowerCase() === a.email.toLowerCase())
    if (existing) {
      await ctx.db.patch(existing._id, { name: a.name, role: a.role ?? existing.role, avatarUrl: a.avatarUrl ?? existing.avatarUrl })
      return existing._id
    }
    return await ctx.db.insert("users", { name: a.name, email: a.email, role: a.role ?? "member", avatarUrl: a.avatarUrl, workspaceId: a.workspaceId, createdAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => { await requireAdmin(ctx); await ctx.db.delete(id) },
})

// Utilisateur courant (mirror Clerk) par clerkUserId — renvoie la ligne complète ou null.
export const getCurrent = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", q => q.eq("clerkUserId", clerkUserId))
      .first()
  },
})

// Upsert depuis l'identité Clerk (passée depuis le client). Lie par email un compte pré-créé/invité.
export const syncFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    email:       v.string(),
    firstName:   v.optional(v.string()),
    lastName:    v.optional(v.string()),
    avatarUrl:   v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    // 1) Recherche par clerkUserId
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk", q => q.eq("clerkUserId", a.clerkUserId))
      .first()

    // 2) Sinon, recherche par email (case-insensitive) — lie un compte invité/pré-créé
    if (!user) {
      const all = await ctx.db.query("users").collect()
      user = all.find(u => u.email.toLowerCase() === a.email.toLowerCase()) ?? null
    }

    if (user) {
      const patch: Record<string, unknown> = {
        clerkUserId: a.clerkUserId,
        lastSeenAt:  Date.now(),
      }
      // Remplit firstName/lastName/avatarUrl/name uniquement si vides
      if (!user.firstName && a.firstName) patch.firstName = a.firstName
      if (!user.lastName  && a.lastName)  patch.lastName  = a.lastName
      // Avatar : Clerk fait foi → on synchronise dès que l'image change (pas seulement si vide).
      if (a.avatarUrl && a.avatarUrl !== user.avatarUrl) patch.avatarUrl = a.avatarUrl
      if (!user.name || user.name.trim() === "") {
        const computed = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email
        patch.name = computed
      }
      // email si changé
      if (a.email && a.email.toLowerCase() !== user.email.toLowerCase()) patch.email = a.email
      // NE PAS écraser role/allowedModules/status/theme
      await ctx.db.patch(user._id, patch)
      return await ctx.db.get(user._id)
    }

    // 3) Création — le tout premier utilisateur devient admin avec tous les modules
    const isFirst = (await ctx.db.query("users").collect()).length === 0
    const name = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email
    const now = Date.now()
    const id = await ctx.db.insert("users", {
      name,
      email:          a.email,
      role:           isFirst ? "admin" : "viewer",
      status:         "active",
      allowedModules: isFirst ? ALL_MODULES : ["/dashboard"],
      avatarUrl:      a.avatarUrl,
      firstName:      a.firstName,
      lastName:       a.lastName,
      clerkUserId:    a.clerkUserId,
      createdAt:      now,
      lastSeenAt:     now,
    })
    return await ctx.db.get(id)
  },
})

// ──────────────────────────────────────────────────────────────────────────
// ADMIN — gestion des utilisateurs (Phase 1).
// NOTE: ces fonctions sont workspace-wide (Convex n'a pas encore d'auth par appel) ;
// l'enforcement ADMIN-ONLY se fait dans l'UI (seuls les admins voient la section).
// ──────────────────────────────────────────────────────────────────────────

// Roster admin complet — tous les utilisateurs avec leurs champs complets, trié par nom.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect()
    return rows
      .map(r => ({
        id:             r._id,
        name:           r.name,
        firstName:      r.firstName,
        lastName:       r.lastName,
        email:          r.email,
        role:           r.role,
        status:         r.status,
        allowedModules: r.allowedModules,
        avatarUrl:      r.avatarUrl,
        clerkUserId:    r.clerkUserId,
        lastSeenAt:     r.lastSeenAt,
      }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
  },
})

// Upsert d'un utilisateur "pending" par email (pas encore de clerkUserId tant qu'il ne s'est pas connecté).
export const adminUpsertPending = mutation({
  args: {
    email:          v.string(),
    firstName:      v.optional(v.string()),
    lastName:       v.optional(v.string()),
    role:           v.string(),
    allowedModules: v.optional(v.array(v.string())),
    status:         v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await requireAdmin(ctx)
    const existing = (await ctx.db.query("users").collect())
      .find(u => u.email.toLowerCase() === a.email.toLowerCase())

    const name = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email

    if (existing) {
      const patch: Record<string, unknown> = { role: a.role, name }
      if (a.firstName !== undefined) patch.firstName = a.firstName
      if (a.lastName  !== undefined) patch.lastName  = a.lastName
      if (a.allowedModules !== undefined) patch.allowedModules = a.allowedModules
      if (a.status !== undefined) patch.status = a.status
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert("users", {
      name,
      email:          a.email,
      role:           a.role,
      status:         a.status ?? "active",
      allowedModules: a.allowedModules ?? ["/dashboard"],
      firstName:      a.firstName,
      lastName:       a.lastName,
      createdAt:      Date.now(),
    })
  },
})

export const setRole = mutation({
  args: { id: v.id("users"), role: v.string() },
  handler: async (ctx, { id, role }) => { await requireAdmin(ctx); await ctx.db.patch(id, { role }) },
})

export const setStatus = mutation({
  args: { id: v.id("users"), status: v.string() },
  handler: async (ctx, { id, status }) => { await requireAdmin(ctx); await ctx.db.patch(id, { status }) },
})

export const setAllowedModules = mutation({
  args: { id: v.id("users"), allowedModules: v.array(v.string()) },
  handler: async (ctx, { id, allowedModules }) => { await requireAdmin(ctx); await ctx.db.patch(id, { allowedModules }) },
})

// Supprime la ligne Convex (ne supprime PAS le compte Clerk : OK pour Phase 1).
export const adminRemove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => { await requireAdmin(ctx); await ctx.db.delete(id) },
})

// Édition de son propre profil. Patch seulement les champs fournis, recalcule name si first/last change.
export const updateProfile = mutation({
  args: {
    clerkUserId: v.string(),
    firstName:   v.optional(v.string()),
    lastName:    v.optional(v.string()),
    avatarUrl:   v.optional(v.string()),
    theme:       v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", q => q.eq("clerkUserId", a.clerkUserId))
      .first()
    if (!user) return

    const patch: Record<string, unknown> = {}
    if (a.firstName !== undefined) patch.firstName = a.firstName
    if (a.lastName  !== undefined) patch.lastName  = a.lastName
    if (a.avatarUrl !== undefined) patch.avatarUrl = a.avatarUrl
    if (a.theme     !== undefined) patch.theme     = a.theme

    if (a.firstName !== undefined || a.lastName !== undefined) {
      const first = a.firstName !== undefined ? a.firstName : user.firstName
      const last  = a.lastName  !== undefined ? a.lastName  : user.lastName
      patch.name = `${first ?? ""} ${last ?? ""}`.trim() || user.email
    }

    await ctx.db.patch(user._id, patch)
  },
})
