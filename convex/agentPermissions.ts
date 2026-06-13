import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE } from "./osLib"
import { ROLE_TEMPLATES, SLUG_TO_ROLE, type Role } from "./lib/permissions"

// ───────────────────────────────────────────────────────────────────────────
// Seed des permissions par agent + cycle de vie des credentials (tokens).
// On ne stocke JAMAIS le token en clair : seul son sha256 (tokenHash), calculé
// par l'appelant (script/route Node). Les scopes du token = permission rows.
// ───────────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function agentBySlug(ctx: any, slug: string) {
  return await ctx.db.query("os_agents").withIndex("by_slug", (q: any) => q.eq("workspaceId", WORKSPACE).eq("slug", slug)).first()
}

// seedAgentPermissions : applique ROLE_TEMPLATES aux 5 agents (idempotent : wipe + reinsert).
export const seedAgentPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    const out: { slug: string; role: Role; count: number; missing?: boolean }[] = []
    for (const [slug, role] of Object.entries(SLUG_TO_ROLE) as [string, Role][]) {
      const agent = await agentBySlug(ctx, slug)
      if (!agent) { out.push({ slug, role, count: 0, missing: true }); continue }
      const existing = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q: any) => q.eq("agentId", agent._id)).collect()
      for (const e of existing) await ctx.db.delete(e._id)
      const grants = ROLE_TEMPLATES[role]
      for (const gr of grants) {
        await ctx.db.insert("os_agent_permissions", { agentId: agent._id, scope: gr.scope, level: gr.level, resource: gr.resource, requiresApproval: gr.requiresApproval, createdAt: now() })
      }
      out.push({ slug, role, count: grants.length })
    }
    return { ok: true, agents: out }
  },
})

// issueCredential : stocke un token (par son hash) avec les scopes = permission rows de l'agent.
// label/expiresAt optionnels. Renvoie l'id de credential (le token brut reste côté appelant).
export const issueCredential = mutation({
  args: { slug: v.string(), tokenHash: v.string(), label: v.optional(v.string()), expiresAt: v.optional(v.string()) },
  handler: async (ctx, { slug, tokenHash, label, expiresAt }) => {
    const agent = await agentBySlug(ctx, slug)
    if (!agent) throw new Error(`agent introuvable: ${slug}`)
    const rows = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q: any) => q.eq("agentId", agent._id)).collect()
    const scopes = rows.map((r: { scope: string; level: string }) => `${r.scope}:${r.level}`)
    const id = await ctx.db.insert("os_agent_credentials", { agentId: agent._id, tokenHash, label: label ?? `token ${slug}`, scopes, expiresAt, createdAt: now() })
    await ctx.db.insert("os_agent_events", { agentId: agent._id, eventType: "credential_issued", source: "admin", payload: { credentialId: id, label }, riskLevel: "high", createdAt: now() })
    return { ok: true, credentialId: id, scopeCount: scopes.length }
  },
})

// revokeCredential : révocation immédiate (rotation / exposition).
export const revokeCredential = mutation({
  args: { credentialId: v.id("os_agent_credentials") },
  handler: async (ctx, { credentialId }) => {
    const cred = await ctx.db.get(credentialId)
    if (!cred) throw new Error("credential introuvable")
    await ctx.db.patch(credentialId, { revokedAt: now() })
    await ctx.db.insert("os_agent_events", { agentId: cred.agentId, eventType: "credential_revoked", source: "admin", payload: { credentialId }, riskLevel: "high", createdAt: now() })
    return { ok: true }
  },
})

// Rotation = révoquer les credentials actives d'un agent (le nouvel émis via issueCredential).
export const revokeAgentCredentials = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const agent = await agentBySlug(ctx, slug)
    if (!agent) throw new Error(`agent introuvable: ${slug}`)
    const creds = await ctx.db.query("os_agent_credentials").withIndex("by_agent", (q: any) => q.eq("agentId", agent._id)).collect()
    let n = 0
    for (const c of creds) if (!c.revokedAt) { await ctx.db.patch(c._id, { revokedAt: now() }); n++ }
    return { ok: true, revoked: n }
  },
})

// getPermissionMatrix : lecture pour le dashboard (agents × scopes).
export const getPermissionMatrix = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("os_agents").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WORKSPACE)).collect()
    const out = []
    for (const a of agents) {
      if (!a.slug || !(a.slug in SLUG_TO_ROLE)) continue
      const rows = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q: any) => q.eq("agentId", a._id as Id<"os_agents">)).collect()
      const creds = await ctx.db.query("os_agent_credentials").withIndex("by_agent", (q: any) => q.eq("agentId", a._id as Id<"os_agents">)).collect()
      out.push({
        slug: a.slug, displayName: a.displayName ?? a.name, role: SLUG_TO_ROLE[a.slug], status: a.status,
        permissions: rows.map((r: { scope: string; level: string; requiresApproval: boolean }) => ({ scope: r.scope, level: r.level, requiresApproval: r.requiresApproval })),
        activeTokens: creds.filter((c: { revokedAt?: string }) => !c.revokedAt).length,
      })
    }
    return out
  },
})
