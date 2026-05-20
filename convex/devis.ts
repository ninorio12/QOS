import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// ===== QUERIES =====

// Lister tous les devis (format EXACT Supabase)
export const listDevis = query({
  handler: async (ctx) => {
    const devis = await ctx.db.query("devis").order("desc").collect()
    
    // Format exact de l'API originale
    return devis.map(d => ({
      id: d._id,
      numero: d.numero,
      contact_name: d.contact_name,
      contact_email: d.contact_email,
      contact_phone: d.contact_phone,
      contact_id: d.contact_id,
      conversation_id: d.conversation_id,
      titre: d.titre,
      lignes: d.lignes,
      montant_ht: d.montant_ht,
      statut: d.statut,
      created_at: d.created_at,
      pdf_url: d.pdf_url,
      source: d.source,
      envoye_le: d.envoye_le,
      notes: d.notes,
      ville: d.ville,
      date_validite: d.date_validite,
      adresse_chantier: d.adresse_chantier,
      adresse_client: d.adresse_client,
      signature_statut: d.signature_statut,
      signature_vu_le: d.signature_vu_le,
      signature_signe_le: d.signature_signe_le,
    }))
  },
})

// Récupérer un devis par ID
export const getDevis = query({
  args: { id: v.id("devis") },
  handler: async (ctx, args) => {
    const devis = await ctx.db.get(args.id)
    if (!devis) return null
    
    return {
      id: devis._id,
      numero: devis.numero,
      contact_name: devis.contact_name,
      contact_email: devis.contact_email,
      contact_phone: devis.contact_phone,
      contact_id: devis.contact_id,
      conversation_id: devis.conversation_id,
      titre: devis.titre,
      contenu: devis.contenu,
      lignes: devis.lignes,
      montant_ht: devis.montant_ht,
      statut: devis.statut,
      created_at: devis.created_at,
      pdf_url: devis.pdf_url,
      source: devis.source,
      envoye_le: devis.envoye_le,
      notes: devis.notes,
      ville: devis.ville,
      date_validite: devis.date_validite,
      adresse_chantier: devis.adresse_chantier,
      adresse_client: devis.adresse_client,
      signature_statut: devis.signature_statut,
      signature_vu_le: devis.signature_vu_le,
      signature_signe_le: devis.signature_signe_le,
    }
  },
})

// ===== MUTATIONS =====

// Créer un devis (format EXACT)
export const createDevis = mutation({
  args: {
    titre: v.string(),
    source: v.string(),
    lignes: v.optional(v.array(v.object({
      description: v.string(),
      quantite: v.number(),
      unite: v.string(),
      prixUnitaire: v.number(),
      tvaRate: v.number(),
    }))),
    notes: v.optional(v.string()),
    statut: v.optional(v.string()),
    contact_id: v.optional(v.string()),
    contact_name: v.optional(v.string()),
    contact_email: v.optional(v.string()),
    contact_phone: v.optional(v.string()),
    adresse_client: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString()
    
    // Générer numéro auto
    const count = await ctx.db.query("devis").collect()
    const numero = `DEV-${new Date().getFullYear()}-${String(count.length + 1).padStart(3, '0')}`
    
    // Calculer montant HT
    const lignes = args.lignes || []
    const montant_ht = lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixUnitaire), 0)
    
    const devisId = await ctx.db.insert("devis", {
      numero,
      titre: args.titre,
      source: args.source,
      lignes,
      notes: args.notes || '',
      statut: args.statut || 'brouillon',
      montant_ht,
      created_at: now,
      contact_id: args.contact_id,
      contact_name: args.contact_name,
      contact_email: args.contact_email,
      contact_phone: args.contact_phone,
      adresse_client: args.adresse_client,
      signature_statut: 'non_envoye',
    })
    
    return devisId
  },
})

// Mettre à jour un devis
export const updateDevis = mutation({
  args: {
    id: v.id("devis"),
    updates: v.object({
      titre: v.optional(v.string()),
      lignes: v.optional(v.array(v.object({
        description: v.string(),
        quantite: v.number(),
        unite: v.string(),
        prixUnitaire: v.number(),
        tvaRate: v.number(),
      }))),
      notes: v.optional(v.string()),
      statut: v.optional(v.string()),
      contact_name: v.optional(v.string()),
      contact_email: v.optional(v.string()),
      contact_phone: v.optional(v.string()),
      ville: v.optional(v.string()),
      date_validite: v.optional(v.string()),
      adresse_chantier: v.optional(v.string()),
      adresse_client: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error("Devis non trouvé")
    
    // Recalculer montant HT si lignes modifiées
    let montant_ht = existing.montant_ht
    if (args.updates.lignes) {
      montant_ht = args.updates.lignes.reduce((sum, ligne) => sum + (ligne.quantite * ligne.prixUnitaire), 0)
    }
    
    await ctx.db.patch(args.id, {
      ...args.updates,
      montant_ht,
    })
    
    return args.id
  },
})

// Supprimer un devis
export const deleteDevis = mutation({
  args: { id: v.id("devis") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return true
  },
})