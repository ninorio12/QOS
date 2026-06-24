import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { WORKSPACE } from "./osLib"

// Base de connaissance éditable : SOPs, Playbooks, docs libres.
// Persistance réelle (Convex) du DocEditor — remplace l'ancien stockage localStorage.

function kindOf(docId: string): string {
  if (docId.startsWith("sop:")) return "sop"
  if (docId.startsWith("pb:")) return "playbook"
  if (docId.startsWith("loop:")) return "loop"
  return "doc"
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("os_kb_docs")
      .withIndex("by_workspace", q => q.eq("workspaceId", WORKSPACE))
      .collect()
    return rows.map(r => ({ ...r, id: r._id }))
  },
})

export const getByDocId = query({
  args: { docId: v.string() },
  handler: async (ctx, { docId }) => {
    const r = await ctx.db
      .query("os_kb_docs")
      .withIndex("by_docId", q => q.eq("workspaceId", WORKSPACE).eq("docId", docId))
      .first()
    return r ? { ...r, id: r._id } : null
  },
})

export const upsert = mutation({
  args: {
    docId:       v.string(),
    title:       v.string(),
    body:        v.string(),
    status:      v.string(),
    owner:       v.optional(v.string()),
    validatedAt: v.optional(v.string()),
    updatedBy:   v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const now = new Date().toISOString()
    const patch = {
      title:       a.title,
      body:        a.body,
      status:      a.status,
      owner:       a.owner,
      validatedAt: a.validatedAt,
      updatedBy:   a.updatedBy ?? "human:thomas",
      updatedAt:   now,
      kind:        kindOf(a.docId),
    }
    const existing = await ctx.db
      .query("os_kb_docs")
      .withIndex("by_docId", q => q.eq("workspaceId", WORKSPACE).eq("docId", a.docId))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return await ctx.db.insert("os_kb_docs", { workspaceId: WORKSPACE, docId: a.docId, ...patch })
  },
})
