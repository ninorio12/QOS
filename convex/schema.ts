import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(),                              // admin | setter | telephoniste | viewer
    avatarUrl:     v.optional(v.string()),
    clerkUserId:   v.optional(v.string()),
    createdAt:     v.optional(v.number()),
    lastSeenAt:    v.optional(v.number()),
    workspaceId:   v.optional(v.string()),
    firstName:     v.optional(v.string()),
    lastName:      v.optional(v.string()),
    status:        v.optional(v.string()),         // active | inactive
    allowedModules:v.optional(v.array(v.string())),
    theme:         v.optional(v.string()),         // light | dark
  }).index("by_clerk", ["clerkUserId"]),
  
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
    lostStage:    v.optional(v.string()),  // où le lead a été perdu : 'prospection' | 'r1' | 'r2'
    lostReason:   v.optional(v.string()),  // raison de perte — prospection (faux_numero…) ou non-vente R1/R2 (non_qualifie…)
    lostObjection:v.optional(v.string()),  // objection non surmontée (uniquement si lostReason = non_qualifie en R1/R2)
    wonObjection: v.optional(v.string()),  // objection surmontée à la conversion en client
    dealDate:     v.optional(v.string()),  // date de la transaction (conversion en client)
    amountTbd:    v.optional(v.boolean()), // montant du deal à définir (client converti sans montant connu)
    // ── Deal (accompagnement) — champs éditables sur la fiche contact.
    // Le montant total vit dans pipeline_clients.value et le plan de mensualités
    // (nombre, montants, échéances) dans onboarding.payment : la fiche les AFFICHE
    // (cf. crm_contacts.dealMeta) mais ne les duplique pas ici.
    dealStartDate:      v.optional(v.string()),  // date de début de l'accompagnement (YYYY-MM-DD)
    dealEndDate:        v.optional(v.string()),  // date de fin (YYYY-MM-DD)
    dealDurationMonths: v.optional(v.number()),  // durée en mois (3, 6, 12…)
    paymentType:        v.optional(v.string()),  // 'mensuel' | 'unique' (paiement en une fois)
    leadStatus:  v.optional(v.string()),  // active | handoff | non_qualifie | dormant
    linkedinUrl: v.optional(v.string()),
    country:     v.optional(v.string()),  // pays (adresse) — Suisse/France/… pour le champ Canton/Région
    canton:      v.optional(v.string()),
    role:        v.optional(v.string()),  // rôle / poste de la personne (CEO, Directeur…)
    metier:      v.optional(v.string()),  // métier / secteur d'activité de l'entreprise (distinct de la niche)
    niche:       v.optional(v.string()),  // niche business
    temperature: v.optional(v.string()),  // froid | tiede | chaud (lead temperature, synchro Prospection)
    tags:        v.array(v.string()),
    notes:       v.optional(v.string()),
    isDemo:      v.optional(v.boolean()),
    createdAt:   v.string(),
    updatedAt:   v.optional(v.string()),
    // Brief closer rédigé AVANT qu'un RDV iClosed soit booké (donc avant qu'un os_sales_calls existe).
    // Repli affiché par le module Closing tant qu'aucun appel ne porte de bio. Cf. closing.saveBioForContact.
    bioMarkdown:    v.optional(v.string()),
    bioGeneratedAt: v.optional(v.string()),
    bioBy:          v.optional(v.string()),
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
    // Dénormalisés pour le funnel FLUX : le lead est supprimé à la conversion, donc impossible
    // de remonter sa source/son contact après coup. Optionnels = lignes pré-enrichissement.
    source:    v.optional(v.string()),            // 'inbound' | 'outbound'
    contactId: v.optional(v.id("crm_contacts")),
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
    // Parcours d'origine, écrit UNE FOIS à la création : quiz | vsl | social | emailing.
    // Jamais recalculé ensuite, sinon un lead changerait de famille en cours de route.
    funnel:     v.optional(v.string()),
    origin:     v.optional(v.string()),  // étiquette d'origine affichée : facebook, instagram…
    token:      v.optional(v.string()),  // jeton de parcours (os_lead_journey)
    status:     v.string(),              // 'open' | 'lost' | 'won'
    initials:   v.string(),
    isDemo:     v.optional(v.boolean()),
    createdAt:  v.string(),
  })
    .index("by_pipeline", ["pipelineId"])
    .index("by_stage",    ["stageId"])
    .index("by_status",   ["status"])
    .index("by_contact",  ["contactId"])
    .index("by_created",  ["createdAt"]),

  // Pipeline Clients — remplace localStorage vividflow_clients
  pipeline_clients: defineTable({
    ghl_contact_id: v.optional(v.string()), // LEGACY GHL — en cours de migration vers contactId (Vague 2)
    contactId: v.optional(v.id("crm_contacts")), // nouvelle clé de jointure typée (source unique Convex)
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
    .index("by_contact", ["contactId"])
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
    dueDates:   v.optional(v.array(v.string())),   // date d'échéance prévue par versement (→ "En retard" si dépassée & non payée)
    refunds:    v.optional(v.array(v.object({ amount: v.number(), date: v.string(), note: v.optional(v.string()) }))),
    signedContract: v.optional(v.object({   // contrat signé uploadé (Convex File Storage)
      fileName:   v.string(),
      storageId:  v.optional(v.string()),   // Convex storage id
      dataUrl:    v.optional(v.string()),   // legacy inline (deprecated)
      uploadedAt: v.string(),
    })),
    form:       v.optional(v.any()),         // valeurs du formulaire onboarding (clés API, etc.)
    formReceivedAt: v.optional(v.string()),  // date de soumission du formulaire public par le client
    contractGenerated: v.optional(v.boolean()), // contrat déjà généré au moins une fois
    kickoffEventId: v.optional(v.string()),
    kickoffAt:  v.optional(v.string()),      // date/heure ISO du kickoff réservé sur iClosed (webhook)
    auditSynthesis: v.optional(v.object({    // Synthèse Audit (Profit Map) — sources + suivi génération/envoi
      sheetUrl:    v.optional(v.string()),   // lien Google Sheet (dossier de travail d'audit)
      mappingUrl:  v.optional(v.string()),   // lien mapping process (Lucidchart)
      recordId:    v.optional(v.string()),   // record du kickoff (record_notes.recordId)
      generatedAt: v.optional(v.string()),
      sentAt:      v.optional(v.string()),
      finalPdf:    v.optional(v.object({     // PDF final peaufiné déposé (Convex storage) → celui envoyé au client
        fileName:   v.string(),
        storageId:  v.string(),
        uploadedAt: v.string(),
      })),
    })),
    updatedAt:  v.string(),
  }).index("by_contact", ["contactId"]),

  // Reprise du formulaire public : progression sauvegardée par jeton secret (cross-device).
  // Indépendant de `onboarding` car écrit avant que l'email/contact soit connu.
  onboarding_progress: defineTable({
    token:     v.string(),            // jeton secret du lien (clé de reprise)
    name:      v.optional(v.string()),// nom affiché (prénom nom)
    state:     v.any(),               // blob du form : screen, qi, answers, toolQueue, toolPos, client
    contactId: v.optional(v.string()),// rattaché après soumission (intake)
    updatedAt: v.string(),
  }).index("by_token", ["token"]),

  // Demandes de signature électronique du contrat (page publique /signer/<id>).
  // L'_id du doc sert de jeton porteur dans le lien email (non devinable).
  contract_signatures: defineTable({
    contactId:   v.optional(v.string()),     // crm_contacts _id (notif/back-link onboarding)
    status:      v.string(),                 // envoye | vu | signe
    // Données nécessaires pour régénérer le PDF (mêmes champs que le contrat).
    contract:    v.object({
      clientName:   v.string(),
      company:      v.optional(v.string()),
      address:      v.optional(v.string()),
      phone:        v.optional(v.string()),
      email:        v.optional(v.string()),
      representant: v.optional(v.string()),
      amount:       v.number(),
      installments: v.number(),
      amounts:      v.array(v.number()),
      ref:          v.string(),              // figé à la création (cohérence aperçu/signé)
      currency:     v.string(),
    }),
    sentAt:      v.string(),
    viewedAt:    v.optional(v.string()),
    signedAt:    v.optional(v.string()),
    signerName:  v.optional(v.string()),     // nom saisi par le signataire
    signatureDataUrl: v.optional(v.string()),// PNG de la signature (dessin/typée)
    signedStorageId:  v.optional(v.string()),// PDF signé (Convex File Storage)
  }).index("by_contact", ["contactId"]),

  // Métadonnées libres par enregistrement tl;dv — synthèse, balises, nom personnalisé (éditable/persisté)
  record_notes: defineTable({
    recordId:  v.string(),   // tl;dv / fathom meeting id
    synthesis: v.string(),
    tags:      v.optional(v.array(v.string())),   // r1 | r2 | interne | externe | consulting
    name:      v.optional(v.string()),            // nom personnalisé (override du titre)
    linkedContactId: v.optional(v.string()),      // crm_contacts id rattaché
    linkedLeadId:    v.optional(v.string()),      // crm_leads id rattaché (opportunité)
    synthesisBy: v.optional(v.string()),          // auteur de la synthèse (ex "agent:agent-kb") — preuve avatar
    synthesisAt: v.optional(v.string()),          // ISO date d'écriture de la synthèse
    updatedAt: v.string(),
  }).index("by_record", ["recordId"]),

  // Cerveau réel des agents — SOUL.md synchronisé depuis le runtime VPS (lecture seule, source de vérité vivante)
  agent_brains: defineTable({
    slug:       v.string(),                       // id agent côté UI (ex "agent-operations", "coo")
    soul:       v.string(),                       // SOUL.md brut complet (fallback / debug)
    name:       v.optional(v.string()),           // nom lisible (facultatif)
    vpsProfile: v.optional(v.string()),           // dossier profil VPS source (ex "agent-operations-slack")
    soulUpdatedAt: v.optional(v.string()),        // mtime du fichier SOUL.md côté VPS (ISO)
    syncedAt:   v.string(),                        // ISO de la dernière synchro reçue
    // Découpage prêt à afficher (4 onglets) — généré côté sync depuis SOUL.md + config.yaml
    mdSoul:        v.optional(v.string()),         // Soul (doctrine, identité, mission, limites)
    mdPersonnalite: v.optional(v.string()),       // Personnalité (style, ton, format)
    mdRole:        v.optional(v.string()),         // Rôle & Responsabilité (protocole, registre, règles, responsabilités)
    mdOutils:      v.optional(v.string()),         // Outils (MCP, toolsets, skills installés)
  }).index("by_slug", ["slug"]),

  // Process — documents type Notion (titre, icône, lien Lucidchart + preview, blocs de contenu)
  processes: defineTable({
    title:            v.string(),
    icon:             v.optional(v.string()),   // clé d'icône (liste prédéfinie)
    link:             v.optional(v.string()),   // Lucidchart ou tout autre lien
    previewStorageId: v.optional(v.string()),   // image de preview (Convex storage)
    blocks:           v.optional(v.array(v.object({ type: v.string(), text: v.string() }))), // h1 | h2 | text | bullet
    category:         v.optional(v.string()),   // groupe de process (ex: "Process internes", "Process clients", …)
    subfolder:        v.optional(v.string()),   // sous-dossier dans la catégorie (ex: "SOPs", "Playbooks")
    linkedClientId:   v.optional(v.string()),   // rattachement à un client (crm_contacts/pipeline_clients id)
    order:            v.optional(v.number()),
    assignedRoles:    v.optional(v.array(v.string())), // déprécié (ancien modèle par rôle) — conservé pour compat
    assignedUserIds:  v.optional(v.array(v.string())), // profils (users _id) qui voient ce process ; vide/absent = admins seulement
    updatedAt:        v.string(),
  }),

  // Intégrations — vault centralisé des connexions externes du Data OS
  integrations: defineTable({
    key:       v.string(),               // 'notion' | 'slack' | 'stripe' | …
    status:    v.string(),               // connected | disconnected
    secret:    v.optional(v.string()),   // clé/token (jamais renvoyé en clair au client)
    account:   v.optional(v.string()),   // libellé masqué/compte affichable
    // Santé réelle de la connexion, écrite par le sync lui-même. Sans ça, un badge "connecté"
    // peut rester au vert alors que la clé API est révoquée depuis des semaines (vécu 28/07/2026).
    lastSyncAt:    v.optional(v.string()),   // ISO du dernier sync RÉUSSI
    lastSyncError: v.optional(v.string()),   // message de la dernière erreur (null si tout va bien)
    updatedAt: v.string(),
    // Dernier appel reçu du service (webhook temps réel), distinct de la synchro périodique.
    lastWebhookAt: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // Stripe — paiements réels (charges/payment_intents) + remboursements, alimentés par
  // le webhook /api/webhooks/stripe (temps réel) et le backfill /api/stripe/sync.
  // Source de vérité de l'Encaissé/Remboursé ; l'« À collecter » se réconcilie avec
  // le plan d'échéances onboarding (montant prévu − déjà encaissé Stripe).
  stripe_payments: defineTable({
    stripeId:        v.string(),             // ch_… / pi_… / re_… (unique, clé d'upsert)
    type:            v.string(),             // 'payment' | 'refund' | 'dispute'
    status:          v.string(),             // 'succeeded' | 'pending' | 'failed' | 'open' | 'won' | 'lost'
    amount:          v.number(),             // unités majeures (CHF/EUR…), positif
    currency:        v.string(),             // 'chf' | 'eur' | 'usd' (minuscule, depuis Stripe)
    customerId:      v.optional(v.string()),
    customerEmail:   v.optional(v.string()),
    contactId:       v.optional(v.id("crm_contacts")),  // matché par email
    description:     v.optional(v.string()),
    created:         v.string(),             // ISO de l'objet Stripe
    invoiceId:       v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    livemode:        v.optional(v.boolean()),
    source:          v.optional(v.string()), // 'webhook' | 'backfill'
    createdAt:       v.string(),
  })
    .index("by_stripe_id", ["stripeId"])
    .index("by_created",   ["created"])
    .index("by_contact",   ["contactId"]),

  // Stripe — connexion (clés stockées côté serveur, jamais renvoyées au client).
  // Comme meta_connection : 1 ligne/workspace. Le sync (action "use node") et le
  // webhook (httpAction) lisent ces clés via internalQuery — elles ne sortent pas de Convex.
  stripe_connection: defineTable({
    workspaceId:   v.string(),
    secretKey:     v.string(),             // sk_live_… / sk_test_…
    webhookSecret: v.optional(v.string()), // whsec_…
    accountName:   v.optional(v.string()),
    livemode:      v.optional(v.boolean()),
    connectedAt:   v.string(),
    lastSyncAt:    v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"]),

  // Taux de change vers CHF (rafraîchis par cron via frankfurter.app, base BCE).
  // rate = facteur multiplicatif pour convertir 1 unité de `currency` en CHF.
  fx_rates: defineTable({
    currency:  v.string(),   // code ISO minuscule : 'eur' | 'usd' | 'gbp' | 'chf' …
    rate:      v.number(),   // 1 `currency` = `rate` CHF
    updatedAt: v.string(),
  }).index("by_currency", ["currency"]),

  // Paiements externes (hors Stripe) : virements Revolut Pro (webhook) + saisies manuelles.
  external_payments: defineTable({
    workspaceId:  v.string(),
    method:       v.string(),              // 'revolut' | 'virement' | 'manual'
    externalId:   v.optional(v.string()),  // id transaction Revolut (dédup du webhook)
    amount:       v.number(),              // unités majeures, positif (reçu)
    currency:     v.optional(v.string()),
    counterparty: v.optional(v.string()),  // nom de l'émetteur (client)
    reference:    v.optional(v.string()),  // référence/libellé du virement
    contactId:    v.optional(v.id("crm_contacts")), // matché par nom/email
    date:         v.string(),              // ISO de la transaction
    state:        v.optional(v.string()),  // 'completed' | …
    note:         v.optional(v.string()),
    createdBy:    v.optional(v.string()),   // 'revolut-webhook' | 'manual'
    createdAt:    v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_external",  ["externalId"]),

  // Revolut Business — connexion (token stocké côté serveur, jamais renvoyé au client).
  revolut_connection: defineTable({
    workspaceId:  v.string(),
    accessToken:  v.optional(v.string()),  // token API Revolut (server-only)
    refreshToken: v.optional(v.string()),
    accountName:  v.optional(v.string()),
    webhookId:    v.optional(v.string()),
    connectedAt:  v.string(),
  })
    .index("by_workspace", ["workspaceId"]),

  // Groupes/catégories de process (persistés pour afficher des groupes même vides)
  process_categories: defineTable({
    name:  v.string(),
    order: v.optional(v.number()),
  }),

  // Sous-dossiers de process à l'intérieur d'une catégorie (persistés même vides)
  process_subfolders: defineTable({
    category: v.string(),
    name:     v.string(),
    order:    v.optional(v.number()),
  }),

  // Bibliothèque "Data" — fichiers (Convex storage) et liens (Notion/GitHub/Vercel/…), rangés par catégorie
  library_items: defineTable({
    kind:        v.string(),             // 'file' | 'link'
    category:    v.string(),             // pdf | image | svg | markdown | doc | notion | github | vercel | link (type → icône/action)
    folder:      v.optional(v.string()), // dossier thématique : Projets | Skills | PDF | Images
    name:        v.string(),
    ext:         v.optional(v.string()),
    storageId:   v.optional(v.string()), // pour les fichiers (Convex storage)
    url:         v.optional(v.string()), // pour les liens
    mime:        v.optional(v.string()),
    size:        v.optional(v.number()),
    addedAt:     v.string(),
    tags:        v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    assignedTo:  v.optional(v.array(v.string())),
    status:      v.optional(v.string()),   // projets Vercel : '' | todo | doing | done
  }).index("by_category", ["category"]),

  // Dossiers de la bibliothèque Data — arborescence (path-based). Un dossier = un chemin
  // unique ("Projets", "Projets/Client A"). parentPath = "" pour la racine.
  library_folders: defineTable({
    name:       v.string(),
    path:       v.string(),   // chemin complet unique
    parentPath: v.string(),   // "" = racine
    createdAt:  v.string(),
  }).index("by_parent", ["parentPath"]).index("by_path", ["path"]),

  // Dossiers de BASE masqués. Les dossiers de base (Skills, …) sont définis côté UI et
  // recréés à la racine à chaque rendu — pour permettre leur suppression, on mémorise ici
  // le nom de ceux que l'utilisateur a supprimés (recréer un dossier du même nom le restaure).
  library_hidden_base: defineTable({
    name: v.string(),
  }).index("by_name", ["name"]),

  // Métadonnées contacts — remplace localStorage vividflow_contact_source/canton/statut
  contact_meta: defineTable({
    ghl_contact_id: v.string(),
    source: v.optional(v.string()),   // 'inbound' | 'outbound'
    statut: v.optional(v.string()),   // 'lead' | 'client' | 'perdu'
    canton: v.optional(v.string()),
  }).index("by_ghl_contact", ["ghl_contact_id"]),

  // ───────────────────────── Data OS — Agentic layer ─────────────────────────

  // Tâches — créables/lisibles/modifiables par humains ET agents (via Convex / endpoints protégés)
  os_tasks: defineTable({
    workspaceId:     v.string(),
    title:           v.string(),
    description:     v.optional(v.string()),
    status:          v.string(),   // todo | in_progress | urgent | done | (blocked|cancelled legacy)
    priority:        v.string(),   // low | normal | high | urgent
    assigneeType:    v.string(),   // human | agent
    assigneeId:      v.optional(v.string()),
    source:          v.string(),   // dataos | telegram | slack | call | system
    sourceRef:       v.optional(v.string()),
    linkedClientId:  v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    linkedMissionId: v.optional(v.string()),
    blockerReason:   v.optional(v.string()),
    objective:         v.optional(v.string()),    // objectif à atteindre (affiché au clic)
    objectiveAchieved: v.optional(v.boolean()),   // réponse de la fiche de validation
    completionNote:    v.optional(v.string()),    // description fournie à la validation
    completedAt:       v.optional(v.string()),    // date de validation (→ Historique après 5 j)
    archivedAt:        v.optional(v.string()),    // archivage explicite → Historique immédiat (indép. de la date de validation)
    order:           v.optional(v.number()),   // tri manuel (drag & drop) — plus grand = plus haut
    comments:        v.optional(v.array(v.object({ authorType: v.string(), authorId: v.string(), authorName: v.optional(v.string()), authorAvatar: v.optional(v.string()), text: v.string(), at: v.string() }))),
    createdBy:       v.string(),
    updatedBy:       v.optional(v.string()),
    createdAt:       v.string(),
    updatedAt:       v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_status", ["workspaceId", "status"]),

  // Activités — log append-only / couche de preuve & audit
  os_activities: defineTable({
    workspaceId: v.string(),
    actorType:   v.string(),   // human | agent | system
    actorId:     v.string(),
    eventType:   v.string(),   // task.created | task.updated | agent.proposed | agent.executed | approval | rejection | memory.update | error | blocker | external
    entityType:  v.optional(v.string()),   // task | agent | knowledge | client | call | …
    entityId:    v.optional(v.string()),
    summary:     v.string(),
    metadata:    v.optional(v.any()),
    source:      v.optional(v.string()),
    createdAt:   v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_entity", ["entityType", "entityId"]),

  // Équipe IA — agents opérationnels
  // Comptes agents = MACHINE IDENTITIES (≠ humains Clerk). Champs ajoutés optionnels
  // pour ne pas casser l'existant ; la couche identité machine vit ici + tables dédiées.
  os_agents: defineTable({
    workspaceId: v.string(),
    name:        v.string(),
    role:        v.string(),
    email:       v.optional(v.string()),   // pour les invitations calendrier
    status:      v.string(),   // active | inactive | disabled | maintenance | qr_required (+ legacy paused/offline)
    lane:        v.optional(v.string()),   // operating lane
    autonomy:    v.string(),   // read_only | suggest | execute | autonomous
    channels:    v.optional(v.array(v.string())),   // slack | telegram | dataos
    tools:       v.optional(v.array(v.string())),
    health:      v.optional(v.string()),
    lastActiveAt: v.optional(v.string()),
    order:       v.optional(v.number()),
    updatedAt:   v.string(),
    // --- Machine identity ---
    slug:                   v.optional(v.string()),
    displayName:            v.optional(v.string()),
    type:                   v.optional(v.string()),   // "agent"
    hermesProfile:          v.optional(v.string()),   // chief_of_staff | cmo_executor | …
    runtimeService:         v.optional(v.string()),   // hermes-gateway-chief_of_staff.service
    description:            v.optional(v.string()),
    ownerHumanId:           v.optional(v.string()),   // clerkUserId du référent humain
    channelBindings:        v.optional(v.array(v.object({ channel: v.string(), ref: v.optional(v.string()), status: v.optional(v.string()) }))),
    capabilities:           v.optional(v.array(v.string())),
    forbiddenActions:       v.optional(v.array(v.string())),
    requiredKnowledgeCores: v.optional(v.array(v.string())),
    runbookUrl:             v.optional(v.string()),
    lastHeartbeatAt:        v.optional(v.string()),
    lastSeenAt:             v.optional(v.string()),
    lastErrorAt:            v.optional(v.string()),
    lastError:              v.optional(v.string()),
    createdAt:              v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]).index("by_slug", ["workspaceId", "slug"]),

  // Tokens machine : on ne stocke JAMAIS le secret en clair, seulement son hash.
  os_agent_credentials: defineTable({
    agentId:    v.id("os_agents"),
    tokenHash:  v.string(),
    label:      v.optional(v.string()),
    scopes:     v.array(v.string()),
    expiresAt:  v.optional(v.string()),
    lastUsedAt: v.optional(v.string()),
    revokedAt:  v.optional(v.string()),
    createdAt:  v.string(),
  }).index("by_agent", ["agentId"]).index("by_tokenHash", ["tokenHash"]),

  // Permissions granulaires (scope/ressource/niveau, approval requis).
  os_agent_permissions: defineTable({
    agentId:         v.id("os_agents"),
    scope:           v.string(),
    level:           v.string(),   // read | write | execute | admin_limited
    resource:        v.optional(v.string()),
    requiresApproval: v.boolean(),
    createdAt:       v.string(),
  }).index("by_agent", ["agentId"]),

  // Journal d'audit machine (toute action passe par ici).
  os_agent_events: defineTable({
    agentId:   v.id("os_agents"),
    eventType: v.string(),
    source:    v.optional(v.string()),
    payload:   v.optional(v.any()),
    riskLevel: v.optional(v.string()),   // low | medium | high
    createdAt: v.string(),
  }).index("by_agent", ["agentId"]).index("by_type", ["eventType"]),

  // Exécutions d'agent (runs).
  os_agent_runs: defineTable({
    agentId:             v.id("os_agents"),
    taskId:              v.optional(v.string()),
    status:              v.string(),   // queued | running | success | failed | cancelled
    inputSummary:        v.optional(v.string()),
    outputSummary:       v.optional(v.string()),
    toolUseSummary:      v.optional(v.string()),
    verificationSummary: v.optional(v.string()),
    error:               v.optional(v.string()),
    startedAt:           v.optional(v.string()),
    finishedAt:          v.optional(v.string()),
    createdAt:           v.string(),
  }).index("by_agent", ["agentId"]),

  // Demandes d'approbation (action sensible proposée, exécutée seulement après validation humaine).
  os_agent_approvals: defineTable({
    agentId:         v.id("os_agents"),
    requestedAction: v.string(),
    riskLevel:       v.string(),
    reason:          v.optional(v.string()),
    context:         v.optional(v.any()),
    payload:         v.optional(v.any()),
    status:          v.string(),   // pending | approved | rejected | expired | executed
    requestedAt:     v.string(),
    reviewedBy:      v.optional(v.string()),
    reviewedAt:      v.optional(v.string()),
    reviewNote:      v.optional(v.string()),
  }).index("by_agent", ["agentId"]).index("by_status", ["status"]),

  // Handoffs — transfert de responsabilité entre agents (ne donne AUCUN droit :
  // le receveur doit déjà avoir le scope sur l'entité pour agir).
  os_handoffs: defineTable({
    workspaceId: v.string(),
    fromAgentId: v.id("os_agents"),
    toAgentSlug: v.string(),
    entityType:  v.string(),   // contact | client | lead | task | prospection
    entityId:    v.string(),
    reason:      v.string(),
    context:     v.optional(v.any()),
    priority:    v.optional(v.string()),
    status:      v.string(),   // pending | accepted | rejected | completed
    slaDueAt:    v.optional(v.string()),
    createdBy:   v.string(),
    createdAt:   v.string(),
    acceptedBy:  v.optional(v.string()),
    acceptedAt:  v.optional(v.string()),
    completedAt: v.optional(v.string()),
    note:        v.optional(v.string()),
  }).index("by_to", ["toAgentSlug", "status"]).index("by_entity", ["entityType", "entityId"]),

  // Prospection — cockpit caller (Nouveau lead → R1 booké). Lié au Contact via contactId.
  prospection_records: defineTable({
    workspaceId:    v.string(),
    contactId:      v.string(),
    leadId:         v.optional(v.string()),   // crm_leads id (représentation Pipeline)
    boardColumn:    v.optional(v.string()),   // colonne kanban : leads_a_traiter | nrp1..nrp4 | rdv_booke | a_suivre | perdu
    phase:          v.string(),               // phase courante (legacy/compat) : phase1 | phase2 | phase3
    phaseStatus:    v.optional(v.string()),   // statut courant (legacy/compat)
    phase1Status:   v.optional(v.string()),   // cellule Phase 1 du tracker : appele|repondu|pas_repondu|message_laisse|a_rappeler|interesse
    phase2Status:   v.optional(v.string()),   // cellule Phase 2
    phase3Status:   v.optional(v.string()),   // cellule Phase 3
    temperature:    v.optional(v.string()),   // chaud | tiede | froid
    channel:        v.optional(v.string()),   // appel | linkedin | email
    lastActionAt:   v.optional(v.string()),
    nextFollowUpAt: v.optional(v.string()),
    ownerUserId:    v.optional(v.string()),
    ownerAgentId:   v.optional(v.string()),
    shortNote:      v.optional(v.string()),
    lostReason:     v.optional(v.string()),   // reponse_negative | pas_de_reponse_phase3 | mauvais_numero | non_qualifie | hors_cible | autre
    lostStage:      v.optional(v.string()),   // nouveau-lead | conversation (stade au moment de la perte)
    followUpReason: v.optional(v.string()),   // texte libre — raison "À suivre" (devient un chip sur la carte)
    followUpAt:     v.optional(v.string()),    // date d'entrée dans la colonne "À suivre" (ISO)
    internalLead:   v.optional(v.boolean()),  // lead poussé depuis une fiche contact ("Leads interne") — card teal, interdite de retour en "Leads à traiter"
    origin:         v.optional(v.string()),   // canal d'arrivée affiché sur la carte : facebook, emailing…
    // Lead devenu interne PARCE QU'IL A BOOKÉ un RDV (deck outbound → iClosed), et non parce
    // qu'on l'a envoyé à la main depuis sa fiche. Il n'est plus à convertir mais à CADRER avant
    // le rendez-vous → chip « Cadrage » sur la carte pour le distinguer des internes classiques.
    cadrage:        v.optional(v.boolean()),
    status:         v.string(),               // active | handoff | lost
    isDemo:         v.optional(v.boolean()),
    createdAt:      v.string(),
    updatedAt:      v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_contact", ["contactId"]).index("by_status", ["workspaceId", "status"]),

  prospection_events: defineTable({
    workspaceId:         v.string(),
    prospectionRecordId: v.string(),
    contactId:           v.string(),
    eventType:           v.string(),
    phase:               v.optional(v.string()),   // phase1|phase2|phase3 quand l'événement vient d'une cellule (avancées de phase)
    notes:               v.optional(v.string()),
    createdBy:           v.string(),
    createdAt:           v.string(),
  }).index("by_record", ["prospectionRecordId"])
    .index("by_workspace_created", ["workspaceId", "createdAt"]),

  prospection_goals: defineTable({
    workspaceId:    v.string(),
    ownerUserId:    v.optional(v.string()),
    date:           v.string(),
    channel:        v.optional(v.string()),
    targetCalls:    v.optional(v.number()),
    targetMessages: v.optional(v.number()),
    targetFollowUps:v.optional(v.number()),
    targetR1Booked: v.optional(v.number()),
    createdAt:      v.string(),
    updatedAt:      v.string(),
  }).index("by_workspace", ["workspaceId"]),

  // Seuils d'objectif du cockpit Prospection (vert/orange/rouge). 1 doc par workspace.
  prospection_objectives: defineTable({
    workspaceId:   v.string(),
    // Parcours concerné (inbound | vsl | quiz | social | emailing). Absent = ligne
    // historique commune, qui sert de repli tant qu'un parcours n'a pas ses propres seuils.
    funnel:        v.optional(v.string()),
    // Lien de redirection du parcours (page de quiz, VSL…), ouvert depuis le cockpit.
    link:          v.optional(v.string()),
    leadsR1:       v.optional(v.number()),  // % Total leads → R1
    leadsR2:       v.optional(v.number()),  // % Total leads → R2
    tauxShow:      v.optional(v.number()),  // % taux de show (R1)
    tauxShowR2:    v.optional(v.number()),  // % taux de show R2
    tauxClose:     v.optional(v.number()),  // % taux de close
    tauxReponse:   v.optional(v.number()),  // % taux de réponse (outbound)
    cpl:           v.optional(v.number()),  // CHF — cible CPL Meta
    ca:            v.optional(v.number()),  // € chiffre d'affaires
    roi:           v.optional(v.number()),  // × ROI (retiré du cockpit, gardé pour l'historique)
    coutParVente:  v.optional(v.number()),  // CHF — plafond de coût par vente (dépense pub ÷ ventes)
    ventes:        v.optional(v.number()),  // nb total ventes
    cashContracte: v.optional(v.number()),  // € cash contracté
    panierMoyen:   v.optional(v.number()),  // € panier moyen
    updatedAt:     v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]),

  // Cache des profils sociaux du parcours Profil (photo, nom, abonnés/connexions),
  // rafraîchi par cron depuis Meta Graph (Instagram) et Nango/LinkedIn.
  // L'écran lit CE cache : jamais d'appel externe depuis le client.
  os_social_profiles: defineTable({
    workspaceId:     v.string(),
    platform:        v.string(),              // instagram | linkedin
    connected:       v.boolean(),
    username:        v.optional(v.string()),
    displayName:     v.optional(v.string()),
    profilePicture:  v.optional(v.string()),
    profileUrl:      v.optional(v.string()),
    followersCount:  v.optional(v.number()),
    gained7:         v.optional(v.number()),  // abonnés gagnés sur 7 jours
    gained30:        v.optional(v.number()),  // abonnés gagnés sur 30 jours (fenêtre max Meta)
    error:           v.optional(v.string()),
    updatedAt:       v.string(),
  }).index("by_ws_platform", ["workspaceId", "platform"]),

  // Historique QUOTIDIEN d'abonnés par plateforme (photo prise par le cron
  // socialProfile.refresh + import de l'historique Brvndlab du 2026-08-02).
  // Sert la courbe d'abonnés au-delà de la fenêtre de 30 jours de Meta.
  os_social_followers_daily: defineTable({
    workspaceId: v.string(),
    platform:    v.string(),   // instagram | linkedin
    date:        v.string(),   // YYYY-MM-DD
    followers:   v.number(),
    source:      v.optional(v.string()), // cron | brvndlab-import
  }).index("by_ws_platform_date", ["workspaceId", "platform", "date"]),

  // Identifiants de soumission Meta purgés (tests) : le filet Zernio ne doit
  // jamais les ré-ingérer depuis son cache.
  os_ignored_leadgen: defineTable({
    leadgenId: v.string(),
    createdAt: v.string(),
  }).index("by_leadgen", ["leadgenId"]),

  // Formulaire Meta → parcours. Sans cette table, tous les leads d'un compte
  // atterrissent dans le même entonnoir : un second formulaire (VSL) polluerait
  // les chiffres du quiz. Le nom du formulaire sert de repli.
  // Correspondance CAMPAGNE Meta → parcours (vsl | quiz | instagram | linkedin).
  // Même philosophie que os_form_funnels : la table prime, sinon déduction par
  // le nom de la campagne. Sert à scoper le reporting Media Buying par parcours.
  os_campaign_funnels: defineTable({
    workspaceId:  v.string(),
    campaignId:   v.string(),
    campaignName: v.optional(v.string()),
    funnel:       v.string(),
    updatedAt:    v.string(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_ws", ["workspaceId"]),

  os_form_funnels: defineTable({
    workspaceId: v.string(),
    formId:      v.string(),
    formName:    v.optional(v.string()),
    funnel:      v.string(),               // quiz | vsl | social | emailing
    origin:      v.optional(v.string()),   // facebook, instagram…
    createdAt:   v.string(),
  })
    .index("by_form", ["formId"])
    .index("by_ws", ["workspaceId", "createdAt"]),

  // Parcours d'un lead entrant, étape par étape. Un jeton unique le suit du
  // formulaire Facebook jusqu'à la vente : quiz, rendez-vous, quiz de fin.
  // C'est ce jeton qui circule dans les liens, l'email servant de filet de secours
  // quand un outil externe ne nous le renvoie pas.
  os_lead_journey: defineTable({
    workspaceId: v.string(),
    token:       v.string(),                 // jeton court, celui qui voyage dans les liens
    contactId:   v.optional(v.string()),
    leadId:      v.optional(v.string()),
    funnel:      v.string(),                 // quiz | vsl | social | emailing
    email:       v.optional(v.string()),
    phone:       v.optional(v.string()),
    name:        v.optional(v.string()),
    // Provenance Meta, pour rattacher un lead à sa publicité.
    leadgenId:   v.optional(v.string()),     // identifiant Meta de la soumission (clé de dédoublonnage)
    formId:      v.optional(v.string()),
    adId:        v.optional(v.string()),
    adsetId:     v.optional(v.string()),
    campaignId:  v.optional(v.string()),
    isOrganic:   v.optional(v.boolean()),
    fieldsJson:  v.optional(v.string()),     // réponses brutes du formulaire
    // Étapes franchies, horodatées : formulaire, quiz ouvert, quiz terminé,
    // rendez-vous pris, quiz de fin. Une étape ne s'écrit qu'une fois.
    steps:       v.array(v.object({ step: v.string(), at: v.string(), meta: v.optional(v.string()) })),
    createdAt:   v.string(),
    updatedAt:   v.string(),
  })
    .index("by_token", ["token"])
    .index("by_leadgen", ["leadgenId"])
    .index("by_email", ["email"])
    .index("by_ws", ["workspaceId", "createdAt"]),

  // Module Budget : chaque poste de dépense, saisi et modifiable à la main.
  // Remplace la liste codée en dur du composant : les montants bougent, les
  // abonnements changent, et personne ne doit passer par un déploiement pour ça.
  budget_items: defineTable({
    workspaceId: v.string(),
    label:       v.string(),
    details:     v.optional(v.string()),
    amount:      v.number(),                 // montant dans sa devise d'origine
    currency:    v.string(),                 // "CHF" | "USD"
    recurrence:  v.string(),                 // "mensuel" | "ponctuel"
    date:        v.optional(v.string()),     // ISO, pour une dépense ponctuelle
    color:       v.optional(v.string()),
    order:       v.optional(v.number()),
    updatedBy:   v.optional(v.string()),
    updatedAt:   v.string(),
  }).index("by_workspace", ["workspaceId"]),

  // Snapshot quotidien du Score Santé Business (pour Évolution 7j / 30j).
  prospection_health_history: defineTable({
    workspaceId: v.string(),
    date:        v.string(),   // 'YYYY-MM-DD'
    score:       v.number(),   // 0-100
  }).index("by_workspace", ["workspaceId"]).index("by_ws_date", ["workspaceId", "date"]),

  // Objectifs quotidiens du setter (module Performance)
  setter_tasks: defineTable({
    workspaceId:     v.string(),
    date:            v.string(),          // YYYY-MM-DD
    setter:          v.string(),          // clé createdBy, ex "human:thomas"
    title:           v.string(),
    metric:          v.optional(v.string()),  // appels|messages|relances|reponses|r1 (progression auto)
    targetNumber:    v.number(),
    currentProgress: v.number(),
    status:          v.string(),          // todo | in_progress | done
    createdAt:       v.string(),
    updatedAt:       v.string(),
  }).index("by_workspace_date", ["workspaceId", "date"]).index("by_setter_date", ["setter", "date"]),

  // Sales calls — appels commerciaux (liés contact/lead/client), synthèse + objections
  os_sales_calls: defineTable({
    workspaceId: v.string(),
    title:       v.string(),
    contactId:   v.optional(v.string()),
    leadId:      v.optional(v.string()),
    clientId:    v.optional(v.string()),
    date:        v.optional(v.string()),
    status:      v.optional(v.string()),   // planned | done | no_show
    outcome:     v.optional(v.string()),
    notes:       v.optional(v.string()),
    summary:     v.optional(v.string()),
    objections:  v.optional(v.array(v.string())),
    nextStep:    v.optional(v.string()),
    stage:          v.optional(v.string()),   // 'R1' | 'R2' : persisté (source iClosed), fiable vs deviné par titre
    bioMarkdown:    v.optional(v.string()),    // bio "brief de bras-droit" générée par l'agent Operations
    bioGeneratedAt: v.optional(v.string()),
    bioBy:          v.optional(v.string()),    // auteur du brief : 'agent-operations' | 'manual' (marque de passage)
    externalId:     v.optional(v.string()),    // id iClosed eventCall (dédup du sync) OU booking:<id> pour le booking natif
    meetLink:       v.optional(v.string()),    // lien Google Meet / visio du RDV
    quizJson:       v.optional(v.string()),    // réponses captées au booking : JSON [{q,a}]
    calendarLabel:  v.optional(v.string()),    // calendrier (nom de l'event), ex: "Audit IA offert"
    calendarSlug:   v.optional(v.string()),    // slug de booking, ex: "audit-out" (donne inbound/outbound)
    calendarColor:  v.optional(v.string()),    // couleur du calendrier (ex: #f07b0a)
    // ── Booking natif (remplace iClosed) ──────────────────────────────────
    closerUserId:   v.optional(v.string()),    // clerkUserId du closer assigné (round-robin)
    bookingLinkId:  v.optional(v.id("booking_links")), // lien de réservation d'origine
    googleEventId:  v.optional(v.string()),    // id de l'event Google Calendar créé (pour reschedule/cancel)
    durationMin:    v.optional(v.number()),    // durée du RDV (min) — sert au calcul d'occupation
    manageToken:    v.optional(v.string()),    // token opaque : annulation par le prospect (/book/manage/<token>)
    createdBy:   v.string(),
    createdAt:   v.string(),
    updatedAt:   v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_contact", ["contactId"]).index("by_external", ["externalId"]).index("by_closer", ["closerUserId"]).index("by_manage", ["manageToken"]),

  // Liens de réservation type Calendly/iClosed (booking natif). Un lien = une page
  // publique /book/<slug> : le prospect choisit un créneau, entre ses coordonnées,
  // le système assigne un closer en round-robin et crée l'event Google Meet + le RDV.
  booking_links: defineTable({
    slug:          v.string(),               // segment d'URL unique (ex: "audit-ia")
    title:         v.string(),               // titre affiché sur la page publique
    description:   v.optional(v.string()),
    durationMin:   v.number(),               // durée d'un RDV en minutes
    bufferMin:     v.optional(v.number()),   // marge après chaque RDV (min)
    minNoticeHours:v.optional(v.number()),   // délai minimum avant réservation (h)
    maxDaysAhead:  v.optional(v.number()),   // horizon max de réservation (jours)
    timezone:      v.string(),               // ex: "Europe/Zurich"
    stage:         v.optional(v.string()),   // "R1" | "R2" (étape pipeline créée)
    hosts:         v.array(v.string()),      // clerkUserIds éligibles au round-robin
    // Disponibilités hebdo : jour (0=dim … 6=sam), start/end en minutes depuis minuit (heure locale du lien)
    availability:  v.array(v.object({ day: v.number(), start: v.number(), end: v.number() })),
    // Questions de qualification optionnelles posées au prospect
    questions:     v.optional(v.array(v.object({ key: v.string(), label: v.string(), required: v.optional(v.boolean()) }))),
    active:        v.boolean(),
    rrCursor:      v.optional(v.number()),   // curseur round-robin persistant
    accentColor:   v.optional(v.string()),   // couleur d'accent de la page publique
    // Round-robin PONDÉRÉ : poids par clerkUserId (absent = 1). Jonathan 2 / Thomas 1
    // → Jonathan reçoit ~2 RDV sur 3. Modifiable à volonté depuis /reservations.
    weights:       v.optional(v.record(v.string(), v.number())),
    // Questions rattachées depuis la banque commune (booking_questions), avec le
    // flag "requis" propre à CE lien. Remplace `questions` (conservé en legacy).
    questionRefs:  v.optional(v.array(v.object({ qid: v.id("booking_questions"), required: v.optional(v.boolean()) }))),
    createdBy:     v.string(),
    createdAt:     v.string(),
    updatedAt:     v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  // Banque COMMUNE de questions de qualification : une question créée sur un lien
  // reste réutilisable par tous les autres (toggle on/off par lien via questionRefs).
  booking_questions: defineTable({
    label:     v.string(),
    archived:  v.optional(v.boolean()),
    createdBy: v.string(),
    createdAt: v.string(),
  }),

  // Trace de CAPTURE des funnels : une ligne par fiche soumise sur /book/<slug>,
  // AVANT même le choix du créneau. Zéro lead perdu : si le prospect abandonne au
  // calendrier, la fiche + provenance + parcours horodaté restent exploitables
  // par les setters (« À rappeler »). status: captured → booked | assigned | cancelled.
  booking_captures: defineTable({
    workspaceId: v.string(),
    linkId:      v.optional(v.id("booking_links")),
    slug:        v.string(),
    firstName:   v.string(),
    lastName:    v.optional(v.string()),
    email:       v.string(),
    phone:       v.optional(v.string()),
    contactId:   v.optional(v.string()),
    leadId:      v.optional(v.string()),
    status:      v.string(),                 // captured | booked | assigned | cancelled
    salesCallId: v.optional(v.id("os_sales_calls")),
    closerUserId:v.optional(v.string()),
    assignedTo:  v.optional(v.string()),     // setter assigné (nom/id) quand status=assigned
    funnel:      v.optional(v.string()),     // identifiant du funnel source (quiz-croissance…)
    utmSource:   v.optional(v.string()),
    utmMedium:   v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    quizJson:    v.optional(v.string()),     // réponses de qualification JSON [{q,a}]
    // Parcours horodaté (borné à 20 étapes) : fiche soumise, calendrier affiché,
    // créneau choisi, RDV confirmé, annulation…
    timeline:    v.array(v.object({ t: v.string(), e: v.string() })),
    createdAt:   v.string(),
    updatedAt:   v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_status", ["status"]).index("by_email", ["email"]),

  // Outreach — séquences/messages de prospection (liés contact/lead)
  os_outreach: defineTable({
    workspaceId:    v.string(),
    contactId:      v.optional(v.string()),
    leadId:         v.optional(v.string()),
    channel:        v.string(),   // email | linkedin | sms | whatsapp | call
    message:        v.optional(v.string()),
    status:         v.string(),   // draft | scheduled | sent | replied | bounced | done
    sentAt:         v.optional(v.string()),
    nextFollowUpAt: v.optional(v.string()),
    notes:          v.optional(v.string()),
    createdBy:      v.string(),
    createdAt:      v.string(),
    updatedAt:      v.string(),
  }).index("by_workspace", ["workspaceId"]),

  // Base de connaissance — couche mémoire/connaissance opérationnelle
  os_knowledge: defineTable({
    workspaceId:     v.string(),
    kind:            v.string(),   // memory | decision | rule | client_project | pattern | risk | candidate
    title:           v.string(),
    body:            v.optional(v.string()),
    status:          v.string(),   // active | to_validate | archived
    tags:            v.optional(v.array(v.string())),
    linkedClientId:  v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    source:          v.optional(v.string()),
    createdBy:       v.string(),
    createdAt:       v.string(),
    updatedAt:       v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_kind", ["workspaceId", "kind"]),

  // Réglages entreprise (singleton par workspace) — identité utilisée sur les devis PDF
  company_settings: defineTable({
    workspaceId: v.string(),
    name:        v.optional(v.string()),
    tagline:     v.optional(v.string()),
    address:     v.optional(v.string()),
    phone:       v.optional(v.string()),
    email:       v.optional(v.string()),
    siret:       v.optional(v.string()),
    capital:     v.optional(v.string()),
    tva_intra:   v.optional(v.string()),
    assurance:   v.optional(v.string()),
    brand_color: v.optional(v.string()),
    logo_svg:    v.optional(v.string()),
    website_url: v.optional(v.string()),
    updatedAt:   v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]),

  // Connexion Google Agenda PAR PROFIL (un refresh token par utilisateur).
  // Le token n'est jamais renvoyé au client : seules des requêtes serveur le lisent.
  google_accounts: defineTable({
    clerkUserId:  v.string(),
    refreshToken: v.string(),
    email:        v.optional(v.string()),
    connectedAt:  v.number(),
  }).index("by_clerk", ["clerkUserId"]),

  // Skills uploadés (import .md depuis la Base de connaissance). Les skills "natifs"
  // restent des fichiers statiques public/agentic-skills ; ceux-ci s'y ajoutent (famille "Skills importés").
  os_skills: defineTable({
    workspaceId: v.string(),
    skillId:     v.string(),               // slug (clé naturelle)
    name:        v.string(),
    description: v.optional(v.string()),
    tags:        v.optional(v.array(v.string())),
    body:        v.string(),               // contenu markdown du .md
    createdBy:   v.optional(v.string()),
    createdAt:   v.string(),
    updatedAt:   v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]).index("by_skill", ["workspaceId", "skillId"]),

  // Base de connaissance éditable (SOPs, Playbooks, docs libres). Persiste le contenu
  // édité dans le DocEditor (avant : localStorage seulement → non partagé, perdu au reset).
  // docId = clé naturelle : 'sop:<id>' | 'pb:<id>' | 'doc:<slug>'. owner = humain ou agent
  // (futur lien vers les comptes agents Hermes).
  os_kb_docs: defineTable({
    workspaceId: v.string(),
    docId:       v.string(),
    kind:        v.optional(v.string()),   // sop | playbook | doc
    title:       v.string(),
    body:        v.string(),
    status:      v.string(),               // draft | review | active
    owner:       v.optional(v.string()),
    validatedAt: v.optional(v.string()),
    updatedBy:   v.optional(v.string()),
    updatedAt:   v.string(),
  }).index("by_workspace", ["workspaceId"]).index("by_docId", ["workspaceId", "docId"]),

  // Closing — réponses du formulaire de confirmation (post-booking R1), pour préparer l'appel.
  // Liées à la fiche contact par email/contactId quand on retrouve le prospect.
  confirmation_intake: defineTable({
    workspaceId:       v.string(),
    contactId:         v.optional(v.id("crm_contacts")),
    email:             v.optional(v.string()),
    fullName:          v.string(),
    company:           v.optional(v.string()),
    // 8 questions de qualification (clés stables ; raw garde le payload complet)
    companyType:       v.optional(v.string()),  // type d'entreprise
    headcount:         v.optional(v.string()),  // effectif
    monthlyRevenue:    v.optional(v.string()),  // CA mensuel approx.
    costliestFunction: v.optional(v.string()),  // fonction la plus coûteuse
    repetitiveCost:    v.optional(v.string()),  // coût/temps des tâches répétitives
    whyNow:            v.optional(v.string()),  // pourquoi l'IA maintenant
    timing:            v.optional(v.string()),  // quand lancer
    budget:            v.optional(v.string()),  // budget IA prévu
    raw:               v.optional(v.any()),     // payload brut (résilience si le form change)
    answersJson:       v.optional(v.string()),  // questionnaire complet (toutes Q/R, libres comprises) : JSON [{q,a}]
    source:            v.optional(v.string()),  // 'confirmation-form' | 'diagnostic' | ...
    // Signal de présence : le prospect a cliqué « Ajouter à mon agenda » sur la page de confirmation.
    // Bon prédicteur de présence au R1 — affiché au closer sur la fiche.
    addedToCalendar:   v.optional(v.boolean()),
    // Id du RDV iClosed quand la page de confirmation a pu le relayer (rattachement exact).
    iclosedExternalId: v.optional(v.string()),
    // Comment la soumission a été rattachée au contact : 'email' | 'rdv-recent' | 'nom' | 'iclosed-id' | null
    matchedBy:         v.optional(v.string()),
    createdAt:         v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_contact",   ["contactId"])
    .index("by_email",     ["workspaceId", "email"])
    .index("by_created",   ["createdAt"]),

  // Media Buyer — métriques d'ads (Meta) par créa/adset/campagne. V1 alimentée par
  // import CSV / saisie manuelle ; V2 = sync API Meta. Le verdict est recalculé à la lecture.
  meta_ad_metrics: defineTable({
    workspaceId: v.string(),
    level:       v.string(),               // 'creative' | 'adset' | 'campaign'
    name:        v.string(),
    campaign:    v.optional(v.string()),
    adset:       v.optional(v.string()),
    thumbUrl:    v.optional(v.string()),
    periodFrom:  v.optional(v.string()),
    periodTo:    v.optional(v.string()),
    spend:       v.number(),
    impressions: v.optional(v.number()),   // vues
    clicks:      v.optional(v.number()),   // clics
    leads:       v.optional(v.number()),   // leads générés
    roas:        v.optional(v.number()),
    cpa:         v.optional(v.number()),
    ctr:         v.optional(v.number()),   // %
    hookRate:    v.optional(v.number()),   // %
    frequency:   v.optional(v.number()),
    results:     v.optional(v.number()),   // leads / achats (legacy board)
    verdictOverride: v.optional(v.string()), // 'scale'|'watch'|'kill' si forcé à la main
    source:      v.optional(v.string()),   // 'csv' | 'manual' | 'meta-api'
    active:      v.optional(v.boolean()),
    createdAt:   v.string(),
    updatedAt:   v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_level",     ["workspaceId", "level"]),

  // Meta Ads — série journalière (1 ligne / jour) pour les graphiques Évolution CPL
  // & Leads générés et le calcul de variance période vs période précédente.
  meta_daily: defineTable({
    workspaceId: v.string(),
    date:        v.string(),               // 'YYYY-MM-DD'
    spend:       v.number(),
    impressions: v.number(),
    clicks:      v.number(),
    leads:       v.number(),
    source:      v.optional(v.string()),   // 'meta-api' | 'seed'
    createdAt:   v.string(),
  })
    .index("by_workspace",      ["workspaceId"])
    .index("by_workspace_date", ["workspaceId", "date"]),

  // Meta Ads — connexion du compte Meta Business (chip "Connecter" du header).
  // 1 ligne / workspace. Le jeton longue durée est conservé côté serveur ;
  // l'ingestion réelle des insights via la Graph API arrive en V2.
  meta_connection: defineTable({
    workspaceId: v.string(),
    accountId:   v.string(),               // act_XXXXXXXX
    accountName: v.optional(v.string()),
    token:       v.string(),               // System User Access Token (longue durée)
    connectedAt: v.string(),
    lastSyncAt:  v.optional(v.string()),
    currency:    v.optional(v.string()),   // devise du compte (CHF/EUR/USD…) lue via Graph API
    accountStatus: v.optional(v.number()),
    timezone:    v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"]),

  // Meta Ads — insights par objet ET par jour (campaign/adset/creative × date).
  // Alimentée par l'ingestion Graph API (time_increment=1) → permet d'agréger
  // les tableaux sur n'importe quelle période choisie au calendrier.
  meta_object_daily: defineTable({
    workspaceId: v.string(),
    level:       v.string(),               // 'campaign' | 'adset' | 'creative' (= ad côté Meta)
    objectId:    v.string(),               // campaign_id / adset_id / ad_id
    name:        v.string(),
    campaign:    v.optional(v.string()),
    adset:       v.optional(v.string()),
    date:        v.string(),               // 'YYYY-MM-DD'
    spend:       v.number(),
    impressions: v.number(),
    clicks:      v.number(),
    leads:       v.number(),
    source:      v.optional(v.string()),   // 'meta-api' | 'seed'
    createdAt:   v.string(),
  })
    .index("by_workspace",      ["workspaceId"])
    .index("by_ws_level_date",  ["workspaceId", "level", "date"]),

  // Créas Meta synchronisées AVEC leurs visuels (photo + vidéo) — accessibles depuis le Data OS,
  // analysables par l'agent Media Buyer (vision). 1 ligne / annonce (adId).
  // ── Cockpit Media Buyer : décisions homme + agent ─────────────────────────
  // Chaque ligne = UN verdict sur UNE entité pub (créa/adset/campagne) : qui l'a
  // proposé, la raison chiffrée, l'action, et ce que l'humain en a fait. C'est la
  // colonne vertébrale du cockpit : l'agent propose, l'humain tranche, tout reste
  // tracé. Les actions automatiques (V2) liront ce même historique.
  os_ads_decisions: defineTable({
    workspaceId: v.string(),
    scope: v.union(v.literal("ad"), v.literal("adset"), v.literal("campaign")),
    refId: v.string(),          // id plateforme (ad_id Meta…)
    refName: v.string(),
    verdict: v.union(v.literal("scale"), v.literal("kill"), v.literal("watch"), v.literal("variant")),
    reason: v.string(),         // TOUJOURS chiffrée, jamais un avis vague
    action: v.string(),         // l'action proposée, éditable par l'humain
    status: v.union(v.literal("proposed"), v.literal("approved"), v.literal("rejected"), v.literal("modified")),
    proposedBy: v.string(),     // "engine" | "agent" | nom humain
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId", "createdAt"])
    .index("by_ws_status", ["workspaceId", "status"])
    .index("by_ws_ref", ["workspaceId", "refId"]),

  // Cockpit Media Buyer : discussion par card KPI (Jonathan, Thomas, l'agent).
  // Un mouvement de levier produit un message ÉCRIT ordinaire, jamais une ligne système.
  os_card_messages: defineTable({
    workspaceId: v.string(),
    cardId:      v.string(),                                   // spend | impressions | clicks | leads | cpl | ctr | cr
    author:      v.string(),                                   // nom affiché
    authorKind:  v.union(v.literal("agent"), v.literal("human")),
    avatarUrl:   v.optional(v.string()),
    body:        v.string(),
    icon:        v.optional(v.string()),                       // "target" quand le message pose une cible
    createdAt:   v.number(),
  })
    .index("by_ws_card", ["workspaceId", "cardId", "createdAt"])
    .index("by_ws",      ["workspaceId", "createdAt"]),

  // Synthèse du Media Buyer : une note libre, rangée en historique après 24 h si remplie.
  os_syntheses: defineTable({
    workspaceId: v.string(),
    body:        v.string(),
    updatedBy:   v.string(),
    avatarUrl:   v.optional(v.string()),
    createdAt:   v.number(),
    updatedAt:   v.number(),
  }).index("by_ws", ["workspaceId", "createdAt"]),

  // Leviers du cockpit : budget/jour, cible CPL, objectif leads, plancher CTR.
  os_card_settings: defineTable({
    workspaceId: v.string(),
    cardId:      v.string(),
    key:         v.string(),                                   // budgetPerDay | cplTarget | leadsWeekly | ctrFloor
    value:       v.number(),
    updatedBy:   v.string(),
    updatedAt:   v.number(),
  }).index("by_ws_key", ["workspaceId", "key"]),

  meta_creatives: defineTable({
    workspaceId:  v.string(),
    adId:         v.string(),
    name:         v.string(),
    status:       v.optional(v.string()),
    campaign:     v.optional(v.string()),
    adset:        v.optional(v.string()),
    imageUrl:     v.optional(v.string()),   // 📷 photo de la créa
    thumbnailUrl: v.optional(v.string()),
    videoSource:  v.optional(v.string()),   // 🎬 URL de la vidéo
    videoThumb:   v.optional(v.string()),
    videoLien:    v.optional(v.string()),   // lien pour VOIR la vidéo quand son fichier n'est pas accessible
    tempsMoyenVideo: v.optional(v.number()),
    tauxCompletion:  v.optional(v.number()),
    spend:        v.optional(v.number()),
    impressions:  v.optional(v.number()),
    reach:        v.optional(v.number()),
    ctr:          v.optional(v.number()),   // CTR total %
    ctrOutbound:  v.optional(v.number()),   // CTR lien sortant %
    cpm:          v.optional(v.number()),
    frequency:    v.optional(v.number()),
    hookRate:     v.optional(v.number()),   // vues 3s / impressions %
    holdRate:     v.optional(v.number()),   // thruplay / vues 3s %
    cvr:          v.optional(v.number()),   // résultat / clic %
    leads:        v.optional(v.number()),
    purchases:    v.optional(v.number()),
    results:      v.optional(v.number()),   // achats si funnel achat, sinon leads
    cpa:          v.optional(v.number()),
    roas:         v.optional(v.number()),
    qualityRanking:    v.optional(v.string()),
    engagementRanking: v.optional(v.string()),
    conversionRanking: v.optional(v.string()),
    syncedAt:     v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_ws_ad",     ["workspaceId", "adId"]),

  // Outbound email — état de la loop (remplace le Google Sheet « Base leads dirigeants »).
  // Machine à états du SOP « Présentation email outbound ». Source de vérité de la loop.
  outbound_leads: defineTable({
    workspaceId:      v.string(),
    firstName:        v.string(),
    lastName:         v.optional(v.string()),
    email:            v.optional(v.string()),
    company:          v.optional(v.string()),
    role:             v.optional(v.string()),     // poste du décideur
    niche:            v.optional(v.string()),
    canton:           v.optional(v.string()),
    website:          v.optional(v.string()),
    source:           v.optional(v.string()),     // preuve/URL source
    score:            v.optional(v.string()),     // 'A' | 'B' | 'C' (qualité)
    // Étape SOP : a_auditer | audit_ok | a_corriger | rejete | deck_a_faire | pret_envoi | email_envoye | relance | importe | froid
    etape:            v.string(),
    agentResponsable: v.optional(v.string()),     // data_analyst | coo | csm | ops
    note:             v.optional(v.string()),     // blocage / raison / consigne
    deckUrl:          v.optional(v.string()),
    repondu_le:       v.optional(v.string()),      // ISO — date de réponse au mail (taux de réponse). Set par la détection Gmail / sheet.
    lastActivity:     v.string(),
    createdBy:        v.optional(v.string()),
    createdAt:        v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_etape",     ["workspaceId", "etape"])
    .index("by_email",     ["email"]),

  // Type métier d'un événement du calendrier (R1 | R2 | follow_up | interne | client | autre).
  // Les events Google sont en lecture seule : on stocke ici l'override de type, partagé entre profils.
  calendar_event_types: defineTable({
    eventId: v.string(),   // id de l'event (ex. "google-xxx")
    type:    v.string(),   // r1 | r2 | follow_up | interne | client | autre
    setBy:   v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_event", ["eventId"]),
})