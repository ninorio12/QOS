import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Browser uploads: get a short-lived upload URL
export const generateUploadUrl = mutation({
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
})

// Resolve a stored file's served URL
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => await ctx.storage.getUrl(args.storageId as never),
})
