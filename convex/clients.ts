import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// ===== QUERIES =====

// Lister tous les clients
export const listClients = query({
  handler: async (ctx) => {
    return await ctx.db.query("clients").order("desc").collect()
  }
})

// Récupérer un client par ID
export const getClient = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

// Recherche client par email
export const getClientByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first()
  }
})

// ===== MUTATIONS =====

// Créer un nouveau client
export const createClient = mutation({
  args: {
    nom: v.string(),
    email: v.string(),
    telephone: v.optional(v.string()),
    adresse: v.optional(v.string()),
    ville: v.optional(v.string()),
    codePostal: v.optional(v.string()),
    pays: v.optional(v.string()),
    siret: v.optional(v.string()),
    tvaIntra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = await ctx.db.insert("clients", {
      ...args,
      created_at: new Date().toISOString(),
    })
    
    return clientId
  }
})

// Mettre à jour un client
export const updateClient = mutation({
  args: {
    id: v.id("clients"),
    nom: v.optional(v.string()),
    email: v.optional(v.string()),
    telephone: v.optional(v.string()),
    adresse: v.optional(v.string()),
    ville: v.optional(v.string()),
    codePostal: v.optional(v.string()),
    pays: v.optional(v.string()),
    siret: v.optional(v.string()),
    tvaIntra: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    
    // Filtrer les valeurs undefined
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    
    await ctx.db.patch(id, filteredUpdates)
  }
})