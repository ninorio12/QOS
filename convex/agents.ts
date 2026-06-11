import { v } from "convex/values"
import { mutation, query, action, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { type Id } from "./_generated/dataModel"
import { WORKSPACE } from "./osLib"

// ──────────────────────────────────────────────────────────────────────────
// Comptes agents = MACHINE IDENTITIES (≠ humains Clerk). Admin/UI côté Data OS.
// ──────────────────────────────────────────────────────────────────────────

// Seed initial des agents réels (Control Room). État opérationnel ensuite dans Convex.
const AGENT_SEEDS = [
  {
    slug: "coordinator", displayName: "Coordinator", role: "Chief of Staff / coordination",
    hermesProfile: "chief_of_staff", runtimeService: "hermes-gateway-chief_of_staff.service", status: "active",
    description: "Coordonne les agents, priorise, délègue. Ne fait pas le travail des exécutants.",
    channels: ["telegram", "slack", "dataos"], capabilities: ["delegation", "prioritisation", "reporting"],
    requiredKnowledgeCores: ["context-loader-core", "source-of-truth-core", "agent-roles-core", "agent-control-room-core", "machine-de-guerre-core"],
    forbiddenActions: ["Exécuter à la place d'un agent dédié", "Envoyer un paiement", "Modifier ses propres permissions"],
    permissions: [
      { scope: "tasks", level: "execute", requiresApproval: false },
      { scope: "activities", level: "read", requiresApproval: false },
      { scope: "knowledge", level: "read", requiresApproval: false },
      { scope: "source_of_truth", level: "write", requiresApproval: true },
    ],
  },
  {
    slug: "cmo", displayName: "CMO", role: "Marketing / acquisition",
    hermesProfile: "cmo_executor", runtimeService: "hermes-gateway-cmo_executor.service", status: "active",
    description: "Production de contenu, acquisition, séquences marketing.",
    channels: ["dataos", "slack"], capabilities: ["content", "acquisition", "carousels"],
    requiredKnowledgeCores: ["context-loader-core", "source-of-truth-core", "agent-roles-core"],
    forbiddenActions: ["Envoyer un document/dashboard sans approbation", "Écrire en source-of-truth sans scope", "Modifier ses propres permissions"],
    permissions: [
      { scope: "knowledge", level: "read", requiresApproval: false },
      { scope: "content", level: "write", requiresApproval: false },
      { scope: "client_send", level: "execute", requiresApproval: true },
    ],
  },
  {
    slug: "csm", displayName: "CSM", role: "Customer Success / suivi client",
    hermesProfile: "csm_executor", runtimeService: "hermes-gateway-csm_executor.service", status: "active",
    description: "Suivi client, onboarding, relances (sous validation).",
    channels: ["dataos", "telegram"], capabilities: ["onboarding", "follow_up", "client_health"],
    requiredKnowledgeCores: ["context-loader-core", "source-of-truth-core", "agent-roles-core"],
    forbiddenActions: ["Relance client sensible sans approbation", "Supprimer des données client", "Modifier ses propres permissions"],
    permissions: [
      { scope: "contacts", level: "read", requiresApproval: false },
      { scope: "tasks", level: "write", requiresApproval: false },
      { scope: "client_send", level: "execute", requiresApproval: true },
    ],
  },
  {
    slug: "ops", displayName: "Ops", role: "Opérations / exécution",
    hermesProfile: "operations_executor", runtimeService: "hermes-gateway-operations_executor.service", status: "active",
    description: "Exécution opérationnelle, automatisations internes.",
    channels: ["dataos", "slack"], capabilities: ["automation", "execution"],
    requiredKnowledgeCores: ["context-loader-core", "source-of-truth-core", "agent-roles-core", "machine-de-guerre-core"],
    forbiddenActions: ["Changer la config runtime sans approbation", "Supprimer des données", "Modifier ses propres permissions"],
    permissions: [
      { scope: "tasks", level: "execute", requiresApproval: false },
      { scope: "activities", level: "write", requiresApproval: false },
      { scope: "runtime_config", level: "admin_limited", requiresApproval: true },
    ],
  },
  {
    slug: "rd", displayName: "R&D", role: "Recherche & développement",
    hermesProfile: "rd_executor", runtimeService: "hermes-gateway-rd_executor.service", status: "active",
    description: "Recherche, prototypage, analyse.",
    channels: ["dataos"], capabilities: ["research", "prototyping", "analysis"],
    requiredKnowledgeCores: ["context-loader-core", "source-of-truth-core", "agent-roles-core"],
    forbiddenActions: ["Écrire en source-of-truth sans validation", "Présenter une hypothèse comme un fait", "Modifier ses propres permissions"],
    permissions: [
      { scope: "knowledge", level: "read", requiresApproval: false },
      { scope: "activities", level: "read", requiresApproval: false },
    ],
  },
  {
    slug: "kb-gbrain", displayName: "KB / GBrain", role: "Bibliothécaire mémoire (retrieval)",
    hermesProfile: "gbrain_executor", runtimeService: "hermes-gateway-gbrain_executor.service", status: "active",
    description: "Retrieval GBrain : fournit du contexte candidat, ne réécrit pas la source de vérité.",
    channels: ["dataos"], capabilities: ["retrieval", "context_assembly"],
    requiredKnowledgeCores: ["context-loader-core", "source-of-truth-core", "agent-roles-core", "agent-control-room-core"],
    forbiddenActions: ["Écrire en source-of-truth sans validation", "Présenter un candidat comme une vérité", "Modifier ses propres permissions"],
    permissions: [
      { scope: "knowledge", level: "read", requiresApproval: false },
      { scope: "knowledge_candidate", level: "write", requiresApproval: false },
      { scope: "source_of_truth", level: "write", requiresApproval: true },
    ],
  },
  {
    slug: "whatsapp", displayName: "WhatsApp Bot", role: "Bot WhatsApp client",
    hermesProfile: "vividflow_whatsapp_bot", runtimeService: "hermes-gateway-vividflow_whatsapp_bot.service", status: "qr_required",
    description: "Bot WhatsApp — nécessite un scan QR pour se connecter (qr_required).",
    channels: ["whatsapp"], capabilities: ["messaging"],
    requiredKnowledgeCores: ["context-loader-core", "agent-roles-core"],
    forbiddenActions: ["Envoyer un message client sans approbation (si sensible)", "Supprimer des données", "Modifier ses propres permissions"],
    permissions: [
      { scope: "messaging", level: "execute", requiresApproval: true },
      { scope: "contacts", level: "read", requiresApproval: false },
    ],
  },
]

export const seedAgents = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const now = new Date().toISOString()
    let created = 0, updated = 0, perms = 0
    for (const [i, s] of AGENT_SEEDS.entries()) {
      const existing = await ctx.db.query("os_agents")
        .withIndex("by_slug", (q) => q.eq("workspaceId", WORKSPACE).eq("slug", s.slug)).first()
      const base = {
        workspaceId: WORKSPACE, name: s.displayName, displayName: s.displayName, type: "agent",
        role: s.role, status: s.status, hermesProfile: s.hermesProfile, runtimeService: s.runtimeService,
        description: s.description, channels: s.channels, capabilities: s.capabilities,
        requiredKnowledgeCores: s.requiredKnowledgeCores, forbiddenActions: s.forbiddenActions,
        autonomy: "suggest", health: s.status === "qr_required" ? "attention" : "ok",
        order: i, updatedAt: now,
      }
      let agentId: Id<"os_agents">
      if (existing) {
        await ctx.db.patch(existing._id, base); agentId = existing._id; updated++
        if (!force) continue
      } else {
        agentId = await ctx.db.insert("os_agents", { ...base, slug: s.slug, createdAt: now }); created++
      }
      // Permissions (remplacées au seed pour rester en phase).
      for (const p of await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q) => q.eq("agentId", agentId)).collect()) {
        await ctx.db.delete(p._id)
      }
      for (const p of s.permissions) {
        await ctx.db.insert("os_agent_permissions", { agentId, scope: p.scope, level: p.level, requiresApproval: p.requiresApproval, createdAt: now })
        perms++
      }
    }
    return { created, updated, permissions: perms }
  },
})

// ── Queries UI ──
export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("os_agents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    // N'expose que les vrais comptes machine (type=agent) ; ignore les os_agents legacy.
    const agents = all.filter((a) => a.type === "agent")
    const out = await Promise.all(agents.map(async (a) => {
      const perms = await ctx.db.query("os_agent_permissions").withIndex("by_agent", (q) => q.eq("agentId", a._id)).collect()
      const pendingApprovals = (await ctx.db.query("os_agent_approvals").withIndex("by_agent", (q) => q.eq("agentId", a._id)).collect())
        .filter((r) => r.status === "pending").length
      return { ...a, id: a._id, permissionCount: perms.length, pendingApprovals }
    }))
    return out.sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  },
})

export const getDetail = query({
  args: { id: v.id("os_agents") },
  handler: async (ctx, { id }) => {
    const agent = await ctx.db.get(id)
    if (!agent) return null
    const [perms, runs, events, approvals, creds] = await Promise.all([
      ctx.db.query("os_agent_permissions").withIndex("by_agent", (q) => q.eq("agentId", id)).collect(),
      ctx.db.query("os_agent_runs").withIndex("by_agent", (q) => q.eq("agentId", id)).order("desc").take(20),
      ctx.db.query("os_agent_events").withIndex("by_agent", (q) => q.eq("agentId", id)).order("desc").take(30),
      ctx.db.query("os_agent_approvals").withIndex("by_agent", (q) => q.eq("agentId", id)).order("desc").take(20),
      ctx.db.query("os_agent_credentials").withIndex("by_agent", (q) => q.eq("agentId", id)).collect(),
    ])
    // tokens MASQUÉS : jamais le hash complet.
    const tokens = creds.map((c) => ({
      id: c._id, label: c.label ?? "token", scopes: c.scopes,
      mask: `••••${c.tokenHash.slice(-4)}`, expiresAt: c.expiresAt,
      lastUsedAt: c.lastUsedAt, revokedAt: c.revokedAt, createdAt: c.createdAt,
    }))
    return { ...agent, id: agent._id, permissions: perms, runs, events, approvals, tokens }
  },
})

export const pendingApprovals = query({
  args: {},
  handler: async (ctx) => {
    const reqs = await ctx.db.query("os_agent_approvals").withIndex("by_status", (q) => q.eq("status", "pending")).collect()
    return Promise.all(reqs.map(async (r) => {
      const a = await ctx.db.get(r.agentId)
      return { ...r, id: r._id, agentName: a?.displayName ?? a?.name ?? "?" }
    }))
  },
})

// ── Mutations admin (humain) ──
export const setStatus = mutation({
  args: { id: v.id("os_agents"), status: v.string() },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: new Date().toISOString() })
    await ctx.db.insert("os_agent_events", { agentId: id, eventType: "status_changed", source: "human", payload: { status }, riskLevel: "low", createdAt: new Date().toISOString() })
  },
})

export const requestHeartbeat = mutation({
  args: { id: v.id("os_agents") },
  handler: async (ctx, { id }) => {
    await ctx.db.insert("os_agent_events", { agentId: id, eventType: "heartbeat_requested", source: "human", riskLevel: "low", createdAt: new Date().toISOString() })
  },
})

export const reviewApproval = mutation({
  args: { id: v.id("os_agent_approvals"), decision: v.string(), reviewedBy: v.optional(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, { id, decision, reviewedBy, note }) => {
    const req = await ctx.db.get(id)
    if (!req) throw new Error("approval introuvable")
    const status = decision === "approve" ? "approved" : "rejected"
    await ctx.db.patch(id, { status, reviewedBy: reviewedBy ?? "human", reviewedAt: new Date().toISOString(), reviewNote: note })
    await ctx.db.insert("os_agent_events", { agentId: req.agentId, eventType: `approval_${status}`, source: "human", payload: { requestedAction: req.requestedAction }, riskLevel: req.riskLevel, createdAt: new Date().toISOString() })
    return { ok: true, status }
  },
})

// ── Tokens machine (génération côté action pour la randomness, hash stocké) ──
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export const recordCredential = internalMutation({
  args: { agentId: v.id("os_agents"), tokenHash: v.string(), label: v.optional(v.string()), scopes: v.array(v.string()) },
  handler: async (ctx, { agentId, tokenHash, label, scopes }) => {
    // révoque les anciens tokens actifs (un seul token vivant par agent).
    for (const c of await ctx.db.query("os_agent_credentials").withIndex("by_agent", (q) => q.eq("agentId", agentId)).collect()) {
      if (!c.revokedAt) await ctx.db.patch(c._id, { revokedAt: new Date().toISOString() })
    }
    await ctx.db.insert("os_agent_credentials", { agentId, tokenHash, label: label ?? "token", scopes, createdAt: new Date().toISOString() })
    await ctx.db.insert("os_agent_events", { agentId, eventType: "token_generated", source: "human", riskLevel: "medium", createdAt: new Date().toISOString() })
  },
})

export const generateToken = action({
  args: { agentId: v.id("os_agents"), label: v.optional(v.string()), scopes: v.optional(v.array(v.string())) },
  handler: async (ctx, { agentId, label, scopes }): Promise<{ token: string }> => {
    const raw = `vfa_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`
    const tokenHash = await sha256hex(raw)
    await ctx.runMutation(internal.agents.recordCredential, { agentId, tokenHash, label, scopes: scopes ?? ["heartbeat", "getContext", "reportRun", "logEvent", "requestApproval"] })
    return { token: raw } // affiché UNE seule fois au moment de la génération
  },
})
