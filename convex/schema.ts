import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(),
    avatarUrl:     v.optional(v.string()),
    clerkUserId:   v.optional(v.string()),
    createdAt:     v.optional(v.number()),
    lastSeenAt:    v.optional(v.number()),
    workspaceId:   v.optional(v.string()),
  }),
  
  // Devis - EXACT COPY des champs Supabase
  devis: defineTable({
    // Champs originaux Supabase (GARDÉS EXACTS)
    numero: v.optional(v.string()),
    contact_name: v.optional(v.string()),
    contact_email: v.optional(v.string()),
    contact_phone: v.optional(v.string()),
    contact_id: v.optional(v.string()),
    conversation_id: v.optional(v.string()),
    titre: v.string(),
    contenu: v.optional(v.string()), // anciennement "description" dans l'original
    lignes: v.array(v.object({
      description: v.string(),
      quantite: v.number(),
      unite: v.string(),
      prixUnitaire: v.number(),
      tvaRate: v.number(),
    })),
    notes: v.optional(v.string()),
    montant_ht: v.optional(v.number()),
    statut: v.string(), // brouillon, envoye, accepte, refuse, expire
    created_at: v.string(),
    envoye_le: v.optional(v.string()),
    ville: v.optional(v.string()),
    date_validite: v.optional(v.string()),
    adresse_chantier: v.optional(v.string()),
    adresse_client: v.optional(v.string()),
    pdf_url: v.optional(v.string()),
    source: v.string(), // manuel, ai, import, etc
    signature_statut: v.optional(v.string()), // non_envoye, envoye, vu, signe
    signature_vu_le: v.optional(v.string()),
    signature_signe_le: v.optional(v.string()),
  })
    .index("by_status", ["statut"])
    .index("by_created", ["created_at"])
    .index("by_contact", ["contact_id"]),
    
  // Clients (pour compatibilité avec contact API)
  clients: defineTable({
    nom: v.string(),
    email: v.string(),
    telephone: v.optional(v.string()),
    adresse: v.optional(v.string()),
    ville: v.optional(v.string()),
    codePostal: v.optional(v.string()),
    pays: v.optional(v.string()),
    siret: v.optional(v.string()),
    tvaIntra: v.optional(v.string()),
    created_at: v.string(),
  }).index("by_email", ["email"]),
  
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    created_at: v.string(),
  }),

  // Analytics & tracking
  analytics_events: defineTable({
    event: v.string(), // 'page_view', 'click', 'conversion'
    userId: v.optional(v.string()),
    sessionId: v.string(),
    properties: v.optional(v.any()),
    timestamp: v.number(),
    page: v.optional(v.string()),
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ip: v.optional(v.string())
  }).index("by_user_time", ["userId", "timestamp"])
   .index("by_session", ["sessionId"])
   .index("by_event_time", ["event", "timestamp"]),

  analytics_daily: defineTable({
    date: v.string(), // 'YYYY-MM-DD'
    event: v.string(),
    count: v.number(),
    lastUpdated: v.number()
  }).index("by_date_event", ["date", "event"])
   .index("by_date", ["date"]),

  // CRM Contacts — remplace GHL contacts
  crm_contacts: defineTable({
    firstName:   v.string(),
    lastName:    v.optional(v.string()),
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    companyName: v.optional(v.string()),
    address1:    v.optional(v.string()),
    city:        v.optional(v.string()),
    postalCode:  v.optional(v.string()),
    website:     v.optional(v.string()),
    source:      v.optional(v.string()),  // 'inbound' | 'outbound'
    statut:      v.optional(v.string()),  // 'lead' | 'client' | 'perdu'
    canton:      v.optional(v.string()),
    metier:      v.optional(v.string()),  // profession / secteur
    niche:       v.optional(v.string()),  // niche business
    tags:        v.array(v.string()),
    notes:       v.optional(v.string()),
    createdAt:   v.string(),
    updatedAt:   v.optional(v.string()),
  })
    .index("by_email",   ["email"])
    .index("by_created", ["createdAt"]),

  // Pipeline config — remplace GHL pipelines (stages hardcodés mais modifiables)
  pipeline_config: defineTable({
    name:  v.string(),          // 'Leads' ou 'Clients'
    type:  v.string(),          // 'leads' | 'clients'
    stages: v.array(v.object({
      id:       v.string(),
      name:     v.string(),
      color:    v.string(),
      position: v.number(),
    })),
  }).index("by_type", ["type"]),

  // Historique des mouvements de stage (pour métriques période réelle)
  lead_stage_history: defineTable({
    leadId:    v.id("crm_leads"),
    stageId:   v.string(),
    stageName: v.string(),
    enteredAt: v.string(),   // ISO date YYYY-MM-DD
  })
    .index("by_lead",    ["leadId"])
    .index("by_stage",   ["stageId"])
    .index("by_entered", ["enteredAt"]),

  // Leads (opportunités) — remplace GHL opportunities
  crm_leads: defineTable({
    contactId:  v.optional(v.id("crm_contacts")),
    name:       v.string(),
    email:      v.optional(v.string()),
    phone:      v.optional(v.string()),
    company:    v.optional(v.string()),
    pipelineId: v.string(),
    stageId:    v.string(),
    value:      v.number(),
    source:     v.optional(v.string()),  // 'inbound' | 'outbound'
    status:     v.string(),              // 'open' | 'lost' | 'won'
    initials:   v.string(),
    createdAt:  v.string(),
  })
    .index("by_pipeline", ["pipelineId"])
    .index("by_stage",    ["stageId"])
    .index("by_status",   ["status"])
    .index("by_contact",  ["contactId"])
    .index("by_created",  ["createdAt"]),

  // Pipeline Clients — remplace localStorage vividflow_clients
  pipeline_clients: defineTable({
    ghl_contact_id: v.optional(v.string()), // lien vers le contact GHL / futur contact Convex
    name: v.string(),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    value: v.number(),
    stageId: v.string(),
    initials: v.string(),
    createdAt: v.string(),
  })
    .index("by_ghl_contact", ["ghl_contact_id"])
    .index("by_stage", ["stageId"])
    .index("by_created", ["createdAt"]),

  // Onboarding — 1 row par client (process d'onboarding persisté)
  onboarding: defineTable({
    contactId:  v.string(),                 // crm_contacts _id
    tasks:      v.optional(v.any()),         // { contractSent, formSent, kickoffPlanned, ... } booleans
    payment:    v.optional(v.object({       // split du montant
      installments: v.number(),             // 1, 2, 3...
      amounts:      v.array(v.number()),    // montant par échéance
    })),
    paidStatus: v.optional(v.array(v.boolean())),  // parallèle à amounts: payé ou non
    paidDates:  v.optional(v.array(v.string())),   // date d'encaissement par échéance
    refunds:    v.optional(v.array(v.object({ amount: v.number(), date: v.string(), note: v.optional(v.string()) }))),
    signedContract: v.optional(v.object({   // contrat signé uploadé (Convex File Storage)
      fileName:   v.string(),
      storageId:  v.optional(v.string()),   // Convex storage id
      dataUrl:    v.optional(v.string()),   // legacy inline (deprecated)
      uploadedAt: v.string(),
    })),
    form:       v.optional(v.any()),         // valeurs du formulaire onboarding (clés API, etc.)
    kickoffEventId: v.optional(v.string()),
    updatedAt:  v.string(),
  }).index("by_contact", ["contactId"]),

  // Métadonnées contacts — remplace localStorage vividflow_contact_source/canton/statut
  contact_meta: defineTable({
    ghl_contact_id: v.string(),
    source: v.optional(v.string()),   // 'inbound' | 'outbound'
    statut: v.optional(v.string()),   // 'lead' | 'client' | 'perdu'
    canton: v.optional(v.string()),
  }).index("by_ghl_contact", ["ghl_contact_id"]),
})