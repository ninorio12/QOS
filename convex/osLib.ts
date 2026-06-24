import { MutationCtx, QueryCtx } from "./_generated/server"

export const WORKSPACE = "vividflow"

// Garde-fou admin : exige un utilisateur authentifié (Clerk) avec role === 'admin'.
// Utilise l'identité serveur (getUserIdentity) — ne fait jamais confiance au client.
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Authentification requise.")
  const user = await ctx.db.query("users").withIndex("by_clerk", q => q.eq("clerkUserId", identity.subject)).first()
  if (!user || user.role !== "admin") throw new Error("Action réservée aux administrateurs.")
  return user
}

// Append-only activity logging — the Data OS proof/log layer.
export async function logActivity(
  ctx: MutationCtx,
  a: {
    workspaceId?: string
    actorType: string
    actorId: string
    eventType: string
    entityType?: string
    entityId?: string
    summary: string
    metadata?: unknown
    source?: string
  },
) {
  await ctx.db.insert("os_activities", {
    workspaceId: a.workspaceId ?? WORKSPACE,
    actorType:   a.actorType,
    actorId:     a.actorId,
    eventType:   a.eventType,
    entityType:  a.entityType,
    entityId:    a.entityId,
    summary:     a.summary,
    metadata:    a.metadata,
    source:      a.source,
    createdAt:   new Date().toISOString(),
  })
}
