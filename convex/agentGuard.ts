import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE } from "./osLib"

// ───────────────────────────────────────────────────────────────────────────
// Garde d'accès agent (token par agent). Le serveur MCP / les routes Next.js
// hashent le Bearer puis appellent ces fonctions. La décision read/write/approval
// est calculée par le module PUR convex/lib/permissions.ts côté appelant ;
// ici on : résout l'identité, expose les scopes effectifs, et logge l'audit.
//
// Scopes effectifs = credential.scopes ∩ os_agent_permissions (rows = source de
// vérité live) → retirer une permission révoque immédiatement, même token actif.
// ───────────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authByHash(ctx: any, tokenHash: string) {
  const cred = await ctx.db.query("os_agent_credentials").withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash)).first()
  if (!cred || cred.revokedAt) return null
  if (cred.expiresAt && cred.expiresAt < now()) return null
  const agent = await ctx.db.get(cred.agentId)
  if (!agent) return null
  if (agent.status === "disabled") return null // agent désactivé → aucun accès via MCP
  return { agent, cred }
}

// Champs d'identité jamais acceptés depuis le payload agent (anti-usurpation au replay).
const IDENTITY_KEYS = new Set(["createdBy", "updatedBy", "authorId", "actorId", "workspaceId", "reviewedBy"])
function stripIdentity(payload: unknown): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) if (!IDENTITY_KEYS.has(k)) out[k] = v
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function effectiveScopes(ctx: any, agentId: Id<"os_agents">, cred: any) {
  const rows = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q: any) => q.eq("agentId", agentId)).collect()
  const permScopes = new Map<string, boolean>() // scope → requiresApproval
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of rows) permScopes.set(`${r.scope}:${r.level}`, !!r.requiresApproval)
  const credScopes: string[] = cred.scopes ?? []
  // Intersection : un scope n'est effectif que s'il est dans le token ET dans les rows.
  const scopes = credScopes.filter((s) => permScopes.has(s))
  const approvalScopes = scopes.filter((s) => permScopes.get(s) === true)
  return { scopes, approvalScopes }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logEventRow(ctx: any, agentId: Id<"os_agents">, eventType: string, payload?: unknown, riskLevel = "low") {
  await ctx.db.insert("os_agent_events", { agentId, eventType, source: "mcp", payload, riskLevel, createdAt: now() })
}

// resolveAgent : identité + scopes effectifs. Renvoie ok:false si token invalide.
export const resolveAgent = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const r = await authByHash(ctx, tokenHash)
    if (!r) return { ok: false as const }
    const { agent, cred } = r
    const { scopes, approvalScopes } = await effectiveScopes(ctx, agent._id, cred)
    return {
      ok: true as const,
      agent: { id: agent._id, slug: agent.slug ?? String(agent._id), displayName: agent.displayName ?? agent.name, status: agent.status, hermesProfile: agent.hermesProfile },
      scopes,
      approvalScopes,
    }
  },
})

const actorOf = (agent: { slug?: string; _id: Id<"os_agents"> }) => `agent:${agent.slug ?? agent._id}`

// logToolUse : appel exécuté → os_agent_events + (si write/execute/approve) os_activities.
export const logToolUse = mutation({
  args: {
    tokenHash: v.string(), tool: v.string(), module: v.string(), verb: v.string(),
    riskLevel: v.optional(v.string()), entityType: v.optional(v.string()), entityId: v.optional(v.string()), summary: v.optional(v.string()),
    failed: v.optional(v.boolean()),
  },
  handler: async (ctx, a) => {
    const r = await authByHash(ctx, a.tokenHash)
    if (!r) throw new Error("token invalide")
    const { agent, cred } = r
    await ctx.db.patch(cred._id, { lastUsedAt: now() })
    if (a.failed) {
      await ctx.db.patch(agent._id, { lastSeenAt: now(), lastErrorAt: now(), lastError: a.summary })
      await logEventRow(ctx, agent._id, `tool_failed:${a.tool}`, { module: a.module, verb: a.verb }, "medium")
      return { ok: true }
    }
    await ctx.db.patch(agent._id, { lastSeenAt: now() })
    await logEventRow(ctx, agent._id, `tool:${a.tool}`, { module: a.module, verb: a.verb, entityId: a.entityId }, a.riskLevel ?? "low")
    // Mutations (write/execute/approve/...) → trace dans le journal d'activités humain.
    if (a.verb !== "read") {
      await ctx.db.insert("os_activities", {
        workspaceId: WORKSPACE, actorType: "agent", actorId: actorOf(agent), source: "mcp",
        eventType: `${a.module}.${a.verb}`, entityType: a.entityType, entityId: a.entityId,
        summary: a.summary ?? `${a.module}.${a.verb} via ${a.tool}`, createdAt: now(),
      })
    }
    return { ok: true }
  },
})

// logDenied : tentative refusée (scope manquant) → audit haut risque.
export const logDenied = mutation({
  args: { tokenHash: v.string(), tool: v.string(), requiredScope: v.string() },
  handler: async (ctx, a) => {
    const r = await authByHash(ctx, a.tokenHash)
    if (!r) return { ok: false }
    await logEventRow(ctx, r.agent._id, `denied:${a.tool}`, { requiredScope: a.requiredScope }, "high")
    return { ok: true }
  },
})

// createPendingApproval : action sensible → demande pending, AUCUNE mutation métier.
export const createPendingApproval = mutation({
  args: {
    tokenHash: v.string(), tool: v.string(), module: v.string(), verb: v.string(),
    payload: v.optional(v.any()), reason: v.optional(v.string()), riskLevel: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const r = await authByHash(ctx, a.tokenHash)
    if (!r) throw new Error("token invalide")
    const { agent } = r
    const id = await ctx.db.insert("os_agent_approvals", {
      agentId: agent._id, requestedAction: a.tool, riskLevel: a.riskLevel ?? "high",
      reason: a.reason, context: { module: a.module, verb: a.verb }, payload: stripIdentity(a.payload),
      status: "pending", requestedAt: now(),
    })
    await logEventRow(ctx, agent._id, `approval_requested:${a.tool}`, { module: a.module, verb: a.verb, approvalId: id }, "high")
    await ctx.db.insert("os_activities", {
      workspaceId: WORKSPACE, actorType: "agent", actorId: actorOf(agent), source: "mcp",
      eventType: "approval.requested", entityType: "approval", entityId: String(id),
      summary: `Approbation demandée : ${a.module}.${a.verb} (${a.tool})`, createdAt: now(),
    })
    return { ok: true, approvalId: id, status: "pending" as const }
  },
})

// reviewApproval : décision humaine/COO (approve|reject). L'exécution du payload
// approuvé est rejouée par le dashboard (wave suivante).
export const reviewApproval = mutation({
  args: { approvalId: v.id("os_agent_approvals"), decision: v.string(), reviewedBy: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { approvalId, decision, reviewedBy, note }) => {
    const ap = await ctx.db.get(approvalId)
    if (!ap) throw new Error("approbation introuvable")
    if (ap.status !== "pending") throw new Error(`déjà ${ap.status}`)
    const status = decision === "approve" ? "approved" : "rejected"
    await ctx.db.patch(approvalId, { status, reviewedBy, reviewedAt: now(), reviewNote: note })
    await ctx.db.insert("os_activities", {
      workspaceId: WORKSPACE, actorType: reviewedBy.startsWith("agent:") ? "agent" : "human", actorId: reviewedBy, source: "dataos",
      eventType: `approval.${status}`, entityType: "approval", entityId: String(approvalId),
      summary: `Approbation ${status} : ${ap.requestedAction}`, createdAt: now(),
    })
    return { ok: true, status }
  },
})
