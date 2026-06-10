import { MutationCtx } from "./_generated/server"

export const WORKSPACE = "vividflow"

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
