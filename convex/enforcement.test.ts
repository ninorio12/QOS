import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "./schema"
import { api } from "./_generated/api"
import { decide, requiredScopeForCall } from "./lib/permissions"

const WS = "vividflow"
const now = () => new Date().toISOString()
const SLUGS = ["coo", "agent-kb", "agent-support-client", "agent-operations", "agent-analyse"]

// Reproduit la décision exacte que prend le serveur MCP, à partir des données seedées.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function decisionFor(t: any, tokenHash: string, tool: string, args: Record<string, unknown> = {}) {
  const r = await t.query(api.agentGuard.resolveAgent, { tokenHash })
  if (!r.ok) return "unauthorized"
  const need = requiredScopeForCall(tool, args)
  if (!need) return "forbidden"
  return decide(new Set(r.scopes), new Set(r.approvalScopes), need.scope)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setup(t: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await t.run(async (ctx: any) => {
    for (const slug of SLUGS) await ctx.db.insert("os_agents", { workspaceId: WS, name: slug, role: "test", status: "active", autonomy: "execute", slug, updatedAt: now() })
  })
  await t.mutation(api.agentPermissions.seedAgentPermissions, {})
  const tokens: Record<string, string> = {}
  for (const slug of SLUGS) {
    tokens[slug] = `hash_${slug}`
    await t.mutation(api.agentPermissions.issueCredential, { slug, tokenHash: tokens[slug] })
  }
  return tokens
}

describe("Enforcement bout-en-bout par agent (seed réel des 5 rôles)", () => {
  it("seedAgentPermissions pose des permissions pour les 5 agents", async () => {
    const t = convexTest(schema)
    await setup(t)
    const matrix = await t.query(api.agentPermissions.getPermissionMatrix, {})
    expect(matrix.length).toBe(5)
    for (const a of matrix) expect(a.permissions.length).toBeGreaterThan(5)
  })

  it("Accès complet : n'importe quel agent peut créer un contact (execute)", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    for (const slug of SLUGS) expect(await decisionFor(t, tok[slug], "contacts_create")).toBe("execute")
  })

  it("CSM peut créer un contact (execute) mais clients_update avec value → approval", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    expect(await decisionFor(t, tok["agent-support-client"], "contacts_create")).toBe("execute")
    expect(await decisionFor(t, tok["agent-support-client"], "clients_update", { id: "x", value: 5000 })).toBe("approval")
    expect(await decisionFor(t, tok["agent-support-client"], "clients_update", { id: "x" })).toBe("execute")
  })

  it("Garde-fou conservé : archive/convert → approval pour TOUS (destructif jamais direct)", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    for (const slug of SLUGS) {
      expect(await decisionFor(t, tok[slug], "contacts_delete_or_archive", { id: "x" })).toBe("approval")
      expect(await decisionFor(t, tok[slug], "leads_convert_to_client", { contactId: "x" })).toBe("approval")
    }
  })

  it("Accès complet : tout agent peut écrire un objectif performance (execute)", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    expect(await decisionFor(t, tok["agent-operations"], "performance_set_r1_objective", { date: "2026-06-12", target: 5 })).toBe("execute")
    expect(await decisionFor(t, tok["agent-analyse"], "performance_set_r1_objective", { date: "2026-06-12", target: 5 })).toBe("execute")
  })

  it("KB peut proposer ET approuver une connaissance au niveau scope (l'approbation critique est forcée côté MCP)", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    expect(await decisionFor(t, tok["agent-kb"], "knowledge_propose", { kind: "memory", title: "t" })).toBe("execute")
    expect(await decisionFor(t, tok["agent-kb"], "knowledge_approve", { id: "x" })).toBe("execute")
  })

  it("Accès complet : dataos_state et prospection_list autorisés pour tout agent", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    expect(await decisionFor(t, tok["agent-analyse"], "dataos_state")).toBe("execute")
    expect(await decisionFor(t, tok["agent-kb"], "prospection_list")).toBe("execute")
  })

  it("Rotation : révoquer les credentials → unauthorized, ré-émission → de nouveau autorisé", async () => {
    const t = convexTest(schema); const tok = await setup(t)
    expect(await decisionFor(t, tok["coo"], "contacts_list")).toBe("execute")
    await t.mutation(api.agentPermissions.revokeAgentCredentials, { slug: "coo" })
    expect(await decisionFor(t, tok["coo"], "contacts_list")).toBe("unauthorized")
    await t.mutation(api.agentPermissions.issueCredential, { slug: "coo", tokenHash: "hash_coo_v2" })
    expect(await decisionFor(t, "hash_coo_v2", "contacts_list")).toBe("execute")
  })
})

describe("Handoff — ne confère aucun droit", () => {
  // Avec l'accès complet uniforme, les 5 rôles ont tous clients:write ; l'invariant
  // se prouve donc via un agent volontairement restreint (cas custom hors template).
  it("un agent restreint reste forbidden sur clients_update même après avoir accepté un handoff client", async () => {
    const t = convexTest(schema); await setup(t)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await t.run(async (ctx: any) => {
      const agentId = await ctx.db.insert("os_agents", { workspaceId: WS, name: "narrow", role: "test", status: "active", autonomy: "execute", slug: "agent-narrow", updatedAt: now() })
      for (const [scope, level] of [["handoff", "accept"], ["contacts", "read"]] as const) await ctx.db.insert("os_agent_permissions", { agentId, scope, level, requiresApproval: false, createdAt: now() })
      await ctx.db.insert("os_agent_credentials", { agentId, tokenHash: "hash_narrow", label: "narrow", scopes: ["handoff:accept", "contacts:read"], createdAt: now() })
    })
    const from: any = await t.run((ctx: any) => ctx.db.query("os_agents").withIndex("by_slug", (q: any) => q.eq("workspaceId", WS).eq("slug", "agent-support-client")).first())
    const h = await t.mutation(api.osHandoffs.create, { fromAgentId: from._id, toAgentSlug: "agent-narrow", entityType: "client", entityId: "cl1", reason: "delivery", createdBy: "agent:agent-support-client" })
    await t.mutation(api.osHandoffs.accept, { handoffId: h.handoffId, acceptedBy: "agent:agent-narrow" })
    // Malgré le handoff accepté, l'agent restreint n'a pas clients:write → forbidden.
    expect(await decisionFor(t, "hash_narrow", "clients_update", { id: "cl1" })).toBe("forbidden")
  })
})
