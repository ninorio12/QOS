import { describe, it, expect } from "vitest"
import { checkToolEnums, enumViolationMessage, TOOL_ENUMS } from "./agentEnums"

describe("checkToolEnums — règle d'or vocabulaire fermé", () => {
  it("refuse une valeur hors-scope (web-search au lieu de source)", () => {
    const v = checkToolEnums("leads_create", { name: "X", source: "web-search" })
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ field: "source", value: "web-search" })
    expect(v[0].allowed).toEqual(["outbound", "inbound", "recommandation"])
  })

  it("accepte une valeur canonique", () => {
    expect(checkToolEnums("leads_create", { source: "outbound" })).toEqual([])
    expect(checkToolEnums("prospection_quick_action", { id: "x", action: "r1_booke" })).toEqual([])
    expect(checkToolEnums("media_buyer_upsert", { level: "creative", verdictOverride: "scale", spend: 1 })).toEqual([])
  })

  it("ignore les champs optionnels non fournis (undefined/null/vide)", () => {
    expect(checkToolEnums("contacts_create", { firstName: "X" })).toEqual([])
    expect(checkToolEnums("contacts_create", { statut: "" })).toEqual([])
    expect(checkToolEnums("prospection_set_phase", { id: "x", phase: "phase1", value: "" })).toEqual([])
  })

  it("refuse plusieurs champs à la fois", () => {
    const v = checkToolEnums("media_buyer_upsert", { level: "banner", verdictOverride: "boost", spend: 1 })
    expect(v.map(x => x.field).sort()).toEqual(["level", "verdictOverride"])
  })

  it("n'enforce PAS les outils/champs non listés (pas de faux refus)", () => {
    expect(checkToolEnums("pipeline_move", { id: "x", stageId: "nouveau-lead" })).toEqual([])
    expect(checkToolEnums("contacts_create", { firstName: "X", email: "a@b.co" })).toEqual([])
    expect(checkToolEnums("tool_inexistant", { foo: "bar" })).toEqual([])
  })

  it("message d'erreur guide l'agent", () => {
    const msg = enumViolationMessage(checkToolEnums("leads_create", { source: "web-search" }))
    expect(msg).toContain("source")
    expect(msg).toContain("outbound, inbound, recommandation")
  })

  it("toutes les valeurs autorisées sont non vides et en minuscule canonique", () => {
    for (const [tool, fields] of Object.entries(TOOL_ENUMS))
      for (const [field, allowed] of Object.entries(fields)) {
        expect(allowed.length, `${tool}.${field}`).toBeGreaterThan(0)
        for (const a of allowed) expect(a, `${tool}.${field}`).toBe(a.trim())
      }
  })
})
