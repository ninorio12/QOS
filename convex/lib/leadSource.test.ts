import { describe, it, expect } from "vitest"
import { normalizeLeadSource } from "./leadSource"

describe("normalizeLeadSource — 3 catégories autorisées uniquement", () => {
  it("laisse passer les valeurs canoniques", () => {
    expect(normalizeLeadSource("outbound")).toBe("outbound")
    expect(normalizeLeadSource("inbound")).toBe("inbound")
    expect(normalizeLeadSource("recommandation")).toBe("recommandation")
  })

  it("web-search (le bug Véronique Marti) → outbound", () => {
    expect(normalizeLeadSource("web-search")).toBe("outbound")
    expect(normalizeLeadSource("web_search")).toBe("outbound")
    expect(normalizeLeadSource("Web Search")).toBe("outbound")
  })

  it("autres méthodes de prospection → outbound", () => {
    for (const s of ["scraping", "scrape", "linkedin", "cold", "cold-email", "apollo", "prospection"])
      expect(normalizeLeadSource(s), s).toBe("outbound")
  })

  it("marqueurs techniques / agent / vide → outbound", () => {
    for (const s of ["agent-e2e", "test-tg", "mcp", "ai", "system", "demo", "dataos", "manual", "", "   ", undefined, null])
      expect(normalizeLeadSource(s as string), String(s)).toBe("outbound")
  })

  it("signaux inbound → inbound", () => {
    for (const s of ["form", "formulaire", "website", "web", "ads", "meta", "organic", "seo", "typeform", "confirmation-form"])
      expect(normalizeLeadSource(s), s).toBe("inbound")
  })

  it("signaux recommandation → recommandation", () => {
    for (const s of ["reco", "recommandation", "referral", "parrainage", "bouche-a-oreille", "word-of-mouth", "wom"])
      expect(normalizeLeadSource(s), s).toBe("recommandation")
  })

  it("le résultat est TOUJOURS une des 3 catégories", () => {
    for (const s of ["n'importe quoi", "xyz123", "Réseau", "salon", "event"])
      expect(["outbound", "inbound", "recommandation"]).toContain(normalizeLeadSource(s))
  })
})
