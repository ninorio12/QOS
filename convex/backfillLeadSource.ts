import { mutation } from "./_generated/server"
import { normalizeLeadSource } from "./lib/leadSource"

// One-off (idempotent) : normalise tous les `source` existants des leads & contacts
// vers les 3 seules catégories autorisées (outbound|inbound|recommandation).
// Ne touche pas les `source` techniques (activités/tâches/événements).
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const changes: { table: string; id: string; from: string; to: string }[] = []
    for (const l of await ctx.db.query("crm_leads").collect()) {
      if (l.source === undefined) continue
      const to = normalizeLeadSource(l.source)
      if (to !== l.source) { await ctx.db.patch(l._id, { source: to }); changes.push({ table: "crm_leads", id: l._id, from: l.source, to }) }
    }
    for (const c of await ctx.db.query("crm_contacts").collect()) {
      if (c.source === undefined) continue
      const to = normalizeLeadSource(c.source)
      if (to !== c.source) { await ctx.db.patch(c._id, { source: to }); changes.push({ table: "crm_contacts", id: c._id, from: c.source, to }) }
    }
    return { ok: true, fixed: changes.length, changes }
  },
})
