import { describe, it, expect } from "vitest"
import {
  scopeAllows, decide, requiredScopeForCall, scopesFromGrants,
  POLICY, ROLE_TEMPLATES, SLUG_TO_ROLE, APPROVAL_VERBS, FULL_GRANTS, type Role,
} from "./permissions"

const set = (...xs: string[]) => new Set(xs)

describe("scopeAllows — implications", () => {
  it("match exact", () => expect(scopeAllows(set("contacts:write"), "contacts:write")).toBe(true))
  it("read impliqué par write/execute/approve", () => {
    expect(scopeAllows(set("contacts:write"), "contacts:read")).toBe(true)
    expect(scopeAllows(set("prospection:action"), "prospection:read")).toBe(true)
    expect(scopeAllows(set("knowledge:approve"), "knowledge:read")).toBe(true)
  })
  it("admin implique tout le module", () => expect(scopeAllows(set("agents:admin"), "agents:read")).toBe(true))
  it("write n'implique PAS archive/convert/value (deny)", () => {
    expect(scopeAllows(set("contacts:write"), "contacts:archive")).toBe(false)
    expect(scopeAllows(set("clients:write"), "clients:value")).toBe(false)
  })
  it("deny-by-default sans scope", () => expect(scopeAllows(set(), "contacts:read")).toBe(false))
})

describe("decide", () => {
  const granted = set("contacts:write", "contacts:archive")
  const approval = set("contacts:archive")
  it("forbidden si scope manquant", () => expect(decide(set(), approval, "contacts:read")).toBe("forbidden"))
  it("execute si autorisé et pas d'approval", () => expect(decide(granted, approval, "contacts:write")).toBe("execute"))
  it("approval si scope marqué requiresApproval", () => expect(decide(granted, approval, "contacts:archive")).toBe("approval"))
  it("approval si forceApproval (knowledge critique)", () => expect(decide(set("knowledge:approve"), set(), "knowledge:approve", true)).toBe("approval"))
})

describe("requiredScopeForCall — dynamique", () => {
  it("clients_update sans value → write", () => expect(requiredScopeForCall("clients_update", {})!.scope).toBe("clients:write"))
  it("clients_update avec value → value (argent)", () => expect(requiredScopeForCall("clients_update", { value: 5000 })!.scope).toBe("clients:value"))
  it("knowledge_approve → criticalKnowledge", () => expect(requiredScopeForCall("knowledge_approve", { id: "x" })!.criticalKnowledge).toBe(true))
  it("outil inconnu → null (deny-by-default)", () => expect(requiredScopeForCall("rm_rf_prod", {})).toBeNull())
})

describe("POLICY — couverture des 63 outils MCP", () => {
  it("couvre au moins 63 outils", () => expect(Object.keys(POLICY).length).toBeGreaterThanOrEqual(63))
  it("handoffs + skills sont mappés (accès complet)", () => {
    expect(POLICY.handoffs_create.module).toBe("handoff")
    expect(POLICY.handoffs_create.verb).toBe("create")
    expect(POLICY.skills_remove.verb).toBe("archive") // destructif → approbation
  })
  it("chaque entrée a module + verb", () => {
    for (const [name, p] of Object.entries(POLICY)) {
      expect(p.module, name).toBeTruthy()
      expect(p.verb, name).toBeTruthy()
    }
  })
  it("aucune écriture destructive non mappée en archive/convert/value", () => {
    expect(POLICY.contacts_delete_or_archive.verb).toBe("archive")
    expect(POLICY.leads_convert_to_client.module).toBe("clients")
    expect(POLICY.leads_convert_to_client.verb).toBe("convert")
  })
})

describe("ROLE_TEMPLATES — accès complet uniforme", () => {
  const scopesOf = (role: Role) => new Set(scopesFromGrants(ROLE_TEMPLATES[role]).scopes)
  const ROLES: Role[] = ["coo", "kb", "csm", "ops", "analyst"]

  it("les 7 slugs sont mappés", () => {
    expect(Object.keys(SLUG_TO_ROLE).sort()).toEqual(["agent-analyse", "agent-debug", "agent-kb", "agent-media-buyer", "agent-operations", "agent-support-client", "coo"])
  })
  it("tous les rôles partagent exactement le même jeu de scopes", () => {
    const ref = [...scopesOf("coo")].sort()
    for (const r of ROLES) expect([...scopesOf(r)].sort()).toEqual(ref)
  })
  it("chaque agent peut écrire/agir partout (plus de cloisonnement)", () => {
    for (const r of ROLES) {
      const s = scopesOf(r)
      expect(s.has("contacts:write")).toBe(true)
      expect(s.has("pipeline:write")).toBe(true)
      expect(s.has("performance:write")).toBe(true)
      expect(s.has("outreach:send")).toBe(true)
      expect([...s].some(x => x.startsWith("prospection:"))).toBe(true)
    }
  })
  it("FULL_GRANTS couvre tout module:verb mappé dans POLICY", () => {
    const s = scopesOf("coo")
    for (const p of Object.values(POLICY)) {
      expect(s.has(`${p.module}:${p.verb}`)).toBe(true)
      if (p.approvalIfValue) expect(s.has(`${p.module}:value`)).toBe(true)
    }
  })
  it("zéro autorisation : aucun verbe en approbation pour TOUS les rôles", () => {
    for (const r of ROLES) {
      const { approvalScopes } = scopesFromGrants(ROLE_TEMPLATES[r])
      expect(approvalScopes).toEqual([])
    }
  })
  it("approvals = uniquement APPROVAL_VERBS (write/read/approve s'exécutent)", () => {
    const { approvalScopes } = scopesFromGrants(ROLE_TEMPLATES.coo)
    expect(approvalScopes).not.toContain("contacts:write")
    expect(approvalScopes).not.toContain("performance:write")
    expect(approvalScopes).not.toContain("knowledge:approve")
  })
  it("toujours PAS d'agents:admin via template (admin = routes humaines)", () => {
    expect(scopesOf("coo").has("agents:admin")).toBe(false)
  })
})

describe("Invariant handoff — un handoff ne donne aucun droit", () => {
  it("un scope handoff:accept n'implique JAMAIS clients:write", () => {
    const granted = new Set(["handoff:accept", "contacts:read"])
    expect(decide(granted, new Set(), "clients:write")).toBe("forbidden")
  })
})

describe("zéro autorisation", () => {
  it("APPROVAL_VERBS est vide", () => {
    expect(APPROVAL_VERBS.size).toBe(0)
  })
  it("aucun grant ne requiert d'approbation", () => {
    const { approvalScopes } = scopesFromGrants(FULL_GRANTS)
    expect(approvalScopes).toEqual([])
  })
  it("decide ne renvoie jamais 'approval' pour un scope accordé", () => {
    const granted = new Set(["clients:convert"])
    expect(decide(granted, new Set(), "clients:convert")).toBe("execute")
  })
})

describe("parité devis", () => {
  it("devis tools sont mappés et exécutables", () => {
    const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
    for (const [tool, scope] of [
      ["devis_list", "devis:read"], ["devis_get", "devis:read"], ["devis_create", "devis:write"],
      ["devis_update", "devis:write"], ["devis_delete", "devis:delete"],
    ] as const) {
      expect(requiredScopeForCall(tool)?.scope, tool).toBe(scope)
      expect(decide(granted, new Set(), scope), tool).toBe("execute")
    }
  })
})

describe("parité media-buyer", () => {
  it("media_buyer tools sont mappés et exécutables", () => {
    const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
    for (const [tool, scope] of [
      ["media_buyer_board", "media_buyer:read"], ["media_buyer_upsert", "media_buyer:write"],
      ["media_buyer_remove", "media_buyer:delete"],
    ] as const) {
      expect(requiredScopeForCall(tool)?.scope, tool).toBe(scope)
      expect(decide(granted, new Set(), scope), tool).toBe("execute")
    }
  })
})

describe("parité onboarding", () => {
  it("onboarding tools sont mappés et exécutables", () => {
    const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
    for (const [tool, scope] of [
      ["onboarding_list", "onboarding:read"], ["onboarding_get_by_contact", "onboarding:read"],
      ["onboarding_payments_overview", "onboarding:read"], ["onboarding_save_progress", "onboarding:write"],
    ] as const) {
      expect(requiredScopeForCall(tool)?.scope, tool).toBe(scope)
      expect(decide(granted, new Set(), scope), tool).toBe("execute")
    }
  })
})

describe("parité closing", () => {
  it("closing/confirmation tools sont mappés et exécutables", () => {
    const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
    for (const [tool, scope] of [
      ["closing_upcoming_calls", "closing:read"], ["closing_save_call_note", "closing:write"],
      ["confirmation_list_for_contact", "closing:read"], ["confirmation_create", "closing:write"],
      ["confirmation_link", "closing:write"],
    ] as const) {
      expect(requiredScopeForCall(tool)?.scope, tool).toBe(scope)
      expect(decide(granted, new Set(), scope), tool).toBe("execute")
    }
  })
})

describe("parité records", () => {
  it("records tools sont mappés et exécutables", () => {
    const granted = new Set(scopesFromGrants(FULL_GRANTS).scopes)
    for (const [tool, scope] of [
      ["records_list", "records:read"], ["records_get", "records:read"],
      ["records_patch", "records:write"], ["records_remove", "records:delete"],
    ] as const) {
      expect(requiredScopeForCall(tool)?.scope, tool).toBe(scope)
      expect(decide(granted, new Set(), scope), tool).toBe("execute")
    }
  })
})
