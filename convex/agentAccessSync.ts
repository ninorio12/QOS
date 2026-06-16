import { mutation } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE } from "./osLib"
import { FULL_GRANTS, SLUG_TO_ROLE, scopesFromGrants } from "./lib/permissions"

// Aligne os_agent_permissions ET les scopes des credentials existants sur FULL_GRANTS,
// SANS révoquer ni faire tourner les tokens (cred.tokenHash inchangé). requiresApproval
// suit APPROVAL_VERBS (vide) → 0 approval. Idempotent.
export const syncFullAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString()
    const { scopes } = scopesFromGrants(FULL_GRANTS)
    const agents = await ctx.db
      .query("os_agents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE))
      .collect()
    let agentsTouched = 0, rowsUpserted = 0, credsUpdated = 0
    for (const a of agents) {
      if (!a.slug || !(a.slug in SLUG_TO_ROLE)) continue
      agentsTouched++
      const existing = await ctx.db
        .query("os_agent_permissions")
        .withIndex("by_agent", (q) => q.eq("agentId", a._id as Id<"os_agents">))
        .collect()
      const byKey = new Map(existing.map((r) => [`${r.scope}:${r.level}`, r]))
      for (const g of FULL_GRANTS) {
        const key = `${g.scope}:${g.level}`
        const row = byKey.get(key)
        if (row) {
          await ctx.db.patch(row._id, { requiresApproval: g.requiresApproval })
        } else {
          await ctx.db.insert("os_agent_permissions", {
            agentId: a._id,
            scope: g.scope,
            level: g.level,
            requiresApproval: g.requiresApproval,
            resource: g.resource,
            createdAt: now,
          })
        }
        rowsUpserted++
      }
      const creds = await ctx.db
        .query("os_agent_credentials")
        .withIndex("by_agent", (q) => q.eq("agentId", a._id as Id<"os_agents">))
        .collect()
      for (const c of creds) {
        if (!c.revokedAt) {
          await ctx.db.patch(c._id, { scopes })
          credsUpdated++
        }
      }
    }
    return { ok: true, at: now, agentsTouched, rowsUpserted, credsUpdated, scopeCount: scopes.length }
  },
})
