import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

const CONTRACT_FIELDS = {
  clientName:   v.string(),
  company:      v.optional(v.string()),
  address:      v.optional(v.string()),
  phone:        v.optional(v.string()),
  email:        v.optional(v.string()),
  representant: v.optional(v.string()),
  amount:       v.number(),
  installments: v.number(),
  amounts:      v.array(v.number()),
  ref:          v.string(),
  currency:     v.string(),
}

// Crée une demande de signature. L'_id retourné sert de jeton dans le lien email.
export const create = mutation({
  args: {
    contactId: v.optional(v.string()),
    contract:  v.object(CONTRACT_FIELDS),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contract_signatures", {
      contactId: args.contactId,
      contract:  args.contract,
      status:    "envoye",
      sentAt:    new Date().toISOString(),
    })
  },
})

// Lecture publique par jeton (_id) — utilisée par la page /signer/<id>.
export const getPublic = query({
  args: { id: v.id("contract_signatures") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id)
    if (!doc) return null
    return {
      id: doc._id,
      status: doc.status,
      contract: doc.contract,
      signedAt: doc.signedAt ?? null,
      signerName: doc.signerName ?? null,
    }
  },
})

// Marque la demande comme « vue » (première ouverture par le client).
export const markViewed = mutation({
  args: { id: v.id("contract_signatures") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id)
    if (!doc || doc.status === "signe") return
    await ctx.db.patch(args.id, { status: "vu", viewedAt: doc.viewedAt ?? new Date().toISOString() })
  },
})

// Finalise la signature : stocke le PDF signé + signature, et reporte sur l'onboarding.
export const complete = mutation({
  args: {
    id: v.id("contract_signatures"),
    signerName: v.string(),
    signatureDataUrl: v.string(),
    signedStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id)
    if (!doc) throw new Error("Demande de signature introuvable")
    const now = new Date().toISOString()
    await ctx.db.patch(args.id, {
      status: "signe",
      signedAt: now,
      signerName: args.signerName,
      signatureDataUrl: args.signatureDataUrl,
      signedStorageId: args.signedStorageId,
    })

    // Report sur le process d'onboarding du contact : contrat signé + étape cochée.
    if (doc.contactId) {
      const ob = await ctx.db
        .query("onboarding")
        .withIndex("by_contact", q => q.eq("contactId", doc.contactId as string))
        .first()
      const fileName = `contrat-signe-${(doc.contract.company || doc.contract.clientName).replace(/[^a-z0-9]/gi, "-")}.pdf`
      const signedContract = { fileName, storageId: args.signedStorageId, uploadedAt: now }
      if (ob) {
        const tasks = { ...(ob.tasks ?? {}), contractSent: true }
        await ctx.db.patch(ob._id, { signedContract, tasks, updatedAt: now })
      } else {
        await ctx.db.insert("onboarding", {
          contactId: doc.contactId, signedContract, tasks: { contractSent: true }, updatedAt: now,
        } as never)
      }
    }
    return { ok: true }
  },
})

// Statut de la dernière demande pour un contact (affichage dans l'onglet Onboarding).
export const latestForContact = query({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("contract_signatures")
      .withIndex("by_contact", q => q.eq("contactId", args.contactId))
      .collect()
    if (!docs.length) return null
    const last = docs.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
    return { id: last._id, status: last.status, sentAt: last.sentAt, signedAt: last.signedAt ?? null }
  },
})
