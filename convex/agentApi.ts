import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE } from "./osLib"

// ──────────────────────────────────────────────────────────────────────────
// API AGENT (machine). L'agent envoie son token (Bearer) ; la route Next /api/agent/*
// le hashe et appelle ces fonctions avec `tokenHash`. Ici on : identifie l'agent,
// vérifie les scopes, log l'action, refuse si permission insuffisante.
// ──────────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString()

// Auth pour les mutations (peut patcher lastUsedAt). requiredScope optionnel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authAgent(ctx: any, tokenHash: string, requiredScope?: string) {
  const cred = await ctx.db.query("os_agent_credentials").withIndex("by_tokenHash", (q: any) => q.eq("tokenHash", tokenHash)).first()
  if (!cred || cred.revokedAt) throw new Error("token invalide ou révoqué")
  if (cred.expiresAt && cred.expiresAt < now()) throw new Error("token expiré")
  const agent = await ctx.db.get(cred.agentId)
  if (!agent) throw new Error("agent introuvable")
  // Agent désactivé : seul le heartbeat est autorisé.
  if (agent.status === "disabled" && requiredScope !== "heartbeat") throw new Error("agent désactivé")
  if (requiredScope && !cred.scopes.includes(requiredScope)) throw new Error(`scope manquant: ${requiredScope}`)
  return { agent, cred }
}

async function logEventRow(ctx: any, agentId: Id<"os_agents">, eventType: string, payload?: unknown, riskLevel = "low") {
  await ctx.db.insert("os_agent_events", { agentId, eventType, source: "agent", payload, riskLevel, createdAt: now() })
}

// authenticate : l'agent vérifie son identité + récupère son profil (scopes, statut).
export const authenticate = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const cred = await ctx.db.query("os_agent_credentials").withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash)).first()
    if (!cred || cred.revokedAt) return { authenticated: false as const }
    const agent = await ctx.db.get(cred.agentId)
    if (!agent) return { authenticated: false as const }
    return {
      authenticated: true as const,
      agent: { id: agent._id, slug: agent.slug, displayName: agent.displayName ?? agent.name, hermesProfile: agent.hermesProfile, status: agent.status },
      scopes: cred.scopes,
    }
  },
})

export const heartbeat = mutation({
  args: { tokenHash: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { tokenHash, note }) => {
    const { agent } = await authAgent(ctx, tokenHash, "heartbeat")
    const ts = now()
    await ctx.db.patch(agent._id, { lastHeartbeatAt: ts, lastSeenAt: ts, updatedAt: ts })
    await logEventRow(ctx, agent._id, "heartbeat", note ? { note } : undefined)
    return { ok: true, at: ts, status: agent.status }
  },
})

// getContext : prépare le contexte à charger avant mission (cores GBrain + permissions + interdits).
export const getContext = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const cred = await ctx.db.query("os_agent_credentials").withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash)).first()
    if (!cred || cred.revokedAt) return { ok: false as const }
    const agent = await ctx.db.get(cred.agentId)
    if (!agent) return { ok: false as const }
    const perms = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q) => q.eq("agentId", agent._id)).collect()
    return {
      ok: true as const,
      requiredKnowledgeCores: agent.requiredKnowledgeCores ?? [],
      forbiddenActions: agent.forbiddenActions ?? [],
      permissions: perms.map((p) => ({ scope: p.scope, level: p.level, resource: p.resource, requiresApproval: p.requiresApproval })),
      scopes: cred.scopes,
      runtimeService: agent.runtimeService,
    }
  },
})

export const reportRun = mutation({
  args: {
    tokenHash: v.string(), taskId: v.optional(v.string()), status: v.string(),
    inputSummary: v.optional(v.string()), outputSummary: v.optional(v.string()),
    toolUseSummary: v.optional(v.string()), verificationSummary: v.optional(v.string()), error: v.optional(v.string()),
    startedAt: v.optional(v.string()), finishedAt: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const { agent } = await authAgent(ctx, a.tokenHash, "reportRun")
    const runId = await ctx.db.insert("os_agent_runs", {
      agentId: agent._id, taskId: a.taskId, status: a.status,
      inputSummary: a.inputSummary, outputSummary: a.outputSummary,
      toolUseSummary: a.toolUseSummary, verificationSummary: a.verificationSummary,
      error: a.error, startedAt: a.startedAt, finishedAt: a.finishedAt ?? (a.status === "success" || a.status === "failed" ? now() : undefined),
      createdAt: now(),
    })
    const patch: Record<string, string> = { lastSeenAt: now(), updatedAt: now() }
    if (a.status === "failed" && a.error) { patch.lastErrorAt = now(); patch.lastError = a.error }
    await ctx.db.patch(agent._id, patch)
    await logEventRow(ctx, agent._id, `run_${a.status}`, { runId, taskId: a.taskId }, a.status === "failed" ? "medium" : "low")
    return { ok: true, runId }
  },
})

export const logEvent = mutation({
  args: { tokenHash: v.string(), eventType: v.string(), payload: v.optional(v.any()), riskLevel: v.optional(v.string()) },
  handler: async (ctx, { tokenHash, eventType, payload, riskLevel }) => {
    const { agent } = await authAgent(ctx, tokenHash, "logEvent")
    await logEventRow(ctx, agent._id, eventType, payload, riskLevel ?? "low")
    return { ok: true }
  },
})

// requestApproval : propose une action sensible SANS l'exécuter (validation humaine requise).
export const requestApproval = mutation({
  args: { tokenHash: v.string(), requestedAction: v.string(), riskLevel: v.optional(v.string()), reason: v.optional(v.string()), context: v.optional(v.any()), payload: v.optional(v.any()) },
  handler: async (ctx, a) => {
    const { agent } = await authAgent(ctx, a.tokenHash, "requestApproval")
    const reqId = await ctx.db.insert("os_agent_approvals", {
      agentId: agent._id, requestedAction: a.requestedAction, riskLevel: a.riskLevel ?? "medium",
      reason: a.reason, context: a.context, payload: a.payload, status: "pending", requestedAt: now(),
    })
    await logEventRow(ctx, agent._id, "approval_requested", { requestedAction: a.requestedAction }, a.riskLevel ?? "medium")
    return { ok: true, approvalId: reqId, status: "pending" }
  },
})

export const createTask = mutation({
  args: { tokenHash: v.string(), title: v.string(), description: v.optional(v.string()), priority: v.optional(v.string()) },
  handler: async (ctx, { tokenHash, title, description, priority }) => {
    const { agent } = await authAgent(ctx, tokenHash, "createTask")
    const ts = now()
    const taskId = await ctx.db.insert("os_tasks", {
      workspaceId: WORKSPACE, title, description, status: "todo", priority: priority ?? "normal",
      assigneeType: "agent", assigneeId: agent.slug ?? String(agent._id), source: "agent",
      createdBy: `agent:${agent.slug ?? agent._id}`, createdAt: ts, updatedAt: ts,
    })
    await logEventRow(ctx, agent._id, "task_created", { taskId })
    return { ok: true, taskId }
  },
})

export const updateTask = mutation({
  args: { tokenHash: v.string(), taskId: v.id("os_tasks"), status: v.optional(v.string()), description: v.optional(v.string()) },
  handler: async (ctx, { tokenHash, taskId, status, description }) => {
    const { agent } = await authAgent(ctx, tokenHash, "updateTask")
    const patch: Record<string, string> = { updatedAt: now() }
    if (status) patch.status = status
    if (description !== undefined) patch.description = description
    await ctx.db.patch(taskId, patch)
    await logEventRow(ctx, agent._id, "task_updated", { taskId, status })
    return { ok: true }
  },
})

// Candidats mémoire/connaissance → écrits en "candidat" (jamais directement source de vérité).
export const createMemoryCandidate = mutation({
  args: { tokenHash: v.string(), title: v.string(), body: v.optional(v.string()), tags: v.optional(v.array(v.string())) },
  handler: async (ctx, { tokenHash, title, body, tags }) => {
    const { agent } = await authAgent(ctx, tokenHash, "createMemoryCandidate")
    const ts = now()
    const id = await ctx.db.insert("os_knowledge", {
      workspaceId: WORKSPACE, kind: "candidate", title, body, status: "to_validate",
      tags, source: `agent:${agent.slug ?? agent._id}`, createdBy: `agent:${agent.slug ?? agent._id}`, createdAt: ts, updatedAt: ts,
    })
    await logEventRow(ctx, agent._id, "memory_candidate_created", { id })
    return { ok: true, id }
  },
})

export const upsertKnowledgeCandidate = mutation({
  args: { tokenHash: v.string(), title: v.string(), body: v.optional(v.string()), kind: v.optional(v.string()) },
  handler: async (ctx, { tokenHash, title, body, kind }) => {
    const { agent } = await authAgent(ctx, tokenHash, "upsertKnowledgeCandidate")
    const ts = now()
    const id = await ctx.db.insert("os_knowledge", {
      workspaceId: WORKSPACE, kind: kind ?? "candidate", title, body, status: "to_validate",
      source: `agent:${agent.slug ?? agent._id}`, createdBy: `agent:${agent.slug ?? agent._id}`, createdAt: ts, updatedAt: ts,
    })
    await logEventRow(ctx, agent._id, "knowledge_candidate_upserted", { id })
    return { ok: true, id }
  },
})
