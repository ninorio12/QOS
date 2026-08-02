import { internalMutation } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Retire les valeurs `ca` fantômes des lignes PAR PARCOURS : l'objectif Encaissé
// est global (ligne sans funnel). Audit tribunal 2026-08-02.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("prospection_objectives").withIndex("by_workspace", (q) => q.eq("workspaceId", WORKSPACE)).collect()
    let cleaned = 0
    for (const r of rows) {
      if (r.funnel && r.ca !== undefined) { await ctx.db.patch(r._id, { ca: undefined }); cleaned++ }
    }
    return { cleaned }
  },
})
