import { v } from "convex/values"
import { mutation } from "./_generated/server"

// Créer des données de démo exactes
export const seedDevisDemo = mutation({
  handler: async (ctx) => {
    const now = new Date().toISOString()
    
    // Quelques devis de démo
    const devisDemo = [
      {
        numero: "DEV-2024-001",
        titre: "Devis — Développement site web",
        contact_name: "Jean Dupont",
        contact_email: "jean.dupont@example.com",
        contact_phone: "+33 6 12 34 56 78",
        lignes: [
          {
            description: "Conception graphique",
            quantite: 1,
            unite: "forfait",
            prixUnitaire: 1500,
            tvaRate: 20
          },
          {
            description: "Développement frontend", 
            quantite: 40,
            unite: "heures",
            prixUnitaire: 80,
            tvaRate: 20
          }
        ],
        notes: "Livraison sous 4 semaines",
        montant_ht: 4700,
        statut: "envoye",
        source: "manuel",
        signature_statut: "envoye",
        created_at: now,
        ville: "Paris",
        date_validite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        adresse_client: "123 rue de la Paix\n75001 Paris",
      },
      {
        numero: "DEV-2024-002", 
        titre: "Devis — Refonte e-commerce",
        contact_name: "Marie Martin",
        contact_email: "marie.martin@boutique.fr",
        contact_phone: "+33 6 98 76 54 32",
        lignes: [
          {
            description: "Audit technique existant",
            quantite: 1,
            unite: "forfait", 
            prixUnitaire: 800,
            tvaRate: 20
          },
          {
            description: "Développement boutique",
            quantite: 60,
            unite: "heures",
            prixUnitaire: 90,
            tvaRate: 20
          }
        ],
        notes: "Intégration Stripe + PayPal",
        montant_ht: 6200,
        statut: "brouillon",
        source: "ai",
        signature_statut: "non_envoye",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        ville: "Lyon",
        adresse_client: "456 avenue Foch\n69006 Lyon",
      },
      {
        numero: "DEV-2024-003",
        titre: "Devis — Application mobile",
        contact_name: "Pierre Moreau", 
        contact_email: "p.moreau@startup.io",
        lignes: [
          {
            description: "Maquettes UI/UX",
            quantite: 1,
            unite: "forfait",
            prixUnitaire: 2000,
            tvaRate: 20
          },
          {
            description: "Développement React Native",
            quantite: 80,
            unite: "heures", 
            prixUnitaire: 95,
            tvaRate: 20
          }
        ],
        notes: "iOS + Android + backend API",
        montant_ht: 9600,
        statut: "accepte",
        source: "manuel",
        signature_statut: "signe",
        signature_signe_le: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        ville: "Marseille",
        adresse_client: "789 bd Michelet\n13008 Marseille",
      }
    ]
    
    // Insérer les devis
    const insertedIds = []
    for (const devis of devisDemo) {
      const id = await ctx.db.insert("devis", devis)
      insertedIds.push(id)
    }
    
    return { 
      message: `${insertedIds.length} devis de démo créés`,
      ids: insertedIds 
    }
  },
})