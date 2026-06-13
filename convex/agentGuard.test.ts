import { describe, it, expect } from "vitest"
import { convexTest } from "convex-test"
import schema from "./schema"
import { api } from "./_generated/api"

const WS = "vividflow"
const now = () => new Date().toISOString()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedAgent(t: any, opts: { slug: string; tokenHash: string; perms: [string, string, boolean][]; scopes?: string[]; status?: string; expiresAt?: string; revoked?: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await t.run(async (ctx: any) => {
    const agentId = await ctx.db.insert("os_agents", { workspaceId: WS, name: opts.slug, role: "test", status: opts.status ?? "active", autonomy: "execute", slug: opts.slug, updatedAt: now() })
    for (const [scope, level, requiresApproval] of opts.perms) await ctx.db.insert("os_agent_permissions", { agentId, scope, level, requiresApproval, createdAt: now() })
    const scopes = opts.scopes ?? opts.perms.map(([s, l]) => `${s}:${l}`)
    await ctx.db.insert("os_agent_credentials", { agentId, tokenHash: opts.tokenHash, label: opts.slug, scopes, expiresAt: opts.expiresAt, revokedAt: opts.revoked ? now() : undefined, createdAt: now() })
    return agentId
  })
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventsOf = (t: any, agentId: any) => t.run((ctx: any) => ctx.db.query("os_agent_events").withIndex("by_agent", (q: any) => q.eq("agentId", agentId)).collect())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activitiesOf = (t: any) => t.run((ctx: any) => ctx.db.query("os_activities").withIndex("by_workspace", (q: any) => q.eq("workspaceId", WS)).collect())

describe("resolveAgent — scopes effectifs = credential ∩ permissions", () => {
  it("retire les scopes du token absents des permission rows", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "coo", tokenHash: "h1", perms: [["contacts", "write", false], ["contacts", "archive", true]], scopes: ["contacts:write", "contacts:archive", "ghost:admin"] })
    const r = await t.query(api.agentGuard.resolveAgent, { tokenHash: "h1" })
    expect(r.ok).toBe(true)
    expect(new Set(r.scopes)).toEqual(new Set(["contacts:write", "contacts:archive"]))
    expect(r.approvalScopes).toEqual(["contacts:archive"])
  })
  it("token révoqué → ok:false", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "coo", tokenHash: "h2", perms: [["contacts", "read", false]], revoked: true })
    expect((await t.query(api.agentGuard.resolveAgent, { tokenHash: "h2" })).ok).toBe(false)
  })
  it("token expiré → ok:false", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "coo", tokenHash: "h3", perms: [["contacts", "read", false]], expiresAt: "2000-01-01T00:00:00.000Z" })
    expect((await t.query(api.agentGuard.resolveAgent, { tokenHash: "h3" })).ok).toBe(false)
  })
  it("token inconnu → ok:false", async () => {
    const t = convexTest(schema)
    expect((await t.query(api.agentGuard.resolveAgent, { tokenHash: "nope" })).ok).toBe(false)
  })
  it("agent désactivé → ok:false même avec token valide", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "coo", tokenHash: "hdis", perms: [["contacts", "read", false]], status: "disabled" })
    expect((await t.query(api.agentGuard.resolveAgent, { tokenHash: "hdis" })).ok).toBe(false)
  })
})

describe("audit log", () => {
  it("write → os_agent_events + os_activities", async () => {
    const t = convexTest(schema)
    const agentId = await seedAgent(t, { slug: "csm", tokenHash: "hw", perms: [["contacts", "write", false]] })
    await t.mutation(api.agentGuard.logToolUse, { tokenHash: "hw", tool: "contacts_create", module: "contacts", verb: "write", entityType: "contact", entityId: "c1", summary: "Contact créé" })
    expect((await eventsOf(t, agentId)).filter((e: { eventType: string }) => e.eventType === "tool:contacts_create").length).toBe(1)
    expect((await activitiesOf(t)).filter((a: { eventType: string }) => a.eventType === "contacts.write").length).toBe(1)
  })
  it("read → event seulement (pas d'activity)", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "csm", tokenHash: "hr", perms: [["contacts", "read", false]] })
    await t.mutation(api.agentGuard.logToolUse, { tokenHash: "hr", tool: "contacts_list", module: "contacts", verb: "read" })
    expect((await activitiesOf(t)).length).toBe(0)
  })
  it("échec → tool_failed + lastError, pas d'activity", async () => {
    const t = convexTest(schema)
    const agentId = await seedAgent(t, { slug: "csm", tokenHash: "hf", perms: [["contacts", "write", false]] })
    await t.mutation(api.agentGuard.logToolUse, { tokenHash: "hf", tool: "contacts_create", module: "contacts", verb: "write", failed: true, summary: "boom" })
    expect((await eventsOf(t, agentId)).some((e: { eventType: string }) => e.eventType === "tool_failed:contacts_create")).toBe(true)
    const agent: any = await t.run((ctx: any) => ctx.db.get(agentId))
    expect(agent.lastError).toBe("boom")
    expect((await activitiesOf(t)).length).toBe(0)
  })
  it("tentative refusée → denied (high)", async () => {
    const t = convexTest(schema)
    const agentId = await seedAgent(t, { slug: "analyst", tokenHash: "hd", perms: [["contacts", "read", false]] })
    await t.mutation(api.agentGuard.logDenied, { tokenHash: "hd", tool: "contacts_create", requiredScope: "contacts:write" })
    const ev = (await eventsOf(t, agentId)).find((e: { eventType: string }) => e.eventType === "denied:contacts_create")
    expect(ev.riskLevel).toBe("high")
  })
})

describe("approval — pending sans mutation métier", () => {
  it("createPendingApproval crée une demande pending + activity, n'écrit aucun contact", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "csm", tokenHash: "ha", perms: [["clients", "value", true]] })
    const r = await t.mutation(api.agentGuard.createPendingApproval, { tokenHash: "ha", tool: "clients_update", module: "clients", verb: "value", payload: { id: "x", value: 9000 } })
    expect(r.status).toBe("pending")
    const aps: any = await t.run((ctx: any) => ctx.db.query("os_agent_approvals").withIndex("by_status", (q: any) => q.eq("status", "pending")).collect())
    expect(aps.length).toBe(1)
    expect(aps[0].payload.value).toBe(9000)
    const contacts: any = await t.run((ctx: any) => ctx.db.query("crm_contacts").collect())
    expect(contacts.length).toBe(0) // aucune donnée métier modifiée
    expect((await activitiesOf(t)).some((a: { eventType: string }) => a.eventType === "approval.requested")).toBe(true)
  })
  it("reviewApproval approve → approved", async () => {
    const t = convexTest(schema)
    await seedAgent(t, { slug: "csm", tokenHash: "ha2", perms: [["clients", "value", true]] })
    const r = await t.mutation(api.agentGuard.createPendingApproval, { tokenHash: "ha2", tool: "clients_update", module: "clients", verb: "value", payload: {} })
    const rev = await t.mutation(api.agentGuard.reviewApproval, { approvalId: r.approvalId, decision: "approve", reviewedBy: "human:thomas" })
    expect(rev.status).toBe("approved")
  })
})
