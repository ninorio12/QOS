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
    lostReason:  v.optional(v.string()),  // raison de perte (faux_numero | pas_interesse | jamais_repondu | …)
    leadStatus:  v.optional(v.string()),  // active | handoff | non_qualifie | dormant
    linkedinUrl: v.optional(v.string()),
    canton:      v.optional(v.string()),
    metier:      v.optional(v.string()),  // profession / secteur
    niche:       v.optional(v.string()),  // niche business
    temperature: v.optional(v.string()),  // froid | tiede | chaud (lead temperature, synchro Prospection)
    tags:        v.array(v.string()),
    notes:       v.optional(v.string()),
    isDemo:      v.optional(v.boolean()),
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

  // Métadonnées libres par enregistrement tl;dv — synthèse, balises, nom personnalisé (éditable/persisté)
  record_notes: defineTable({
    recordId:  v.string(),   // tl;dv meeting id
    synthesis: v.string(),
    tags:      v.optional(v.array(v.string())),   // r1 | r2 | interne | externe | consulting
    name:      v.optional(v.string()),            // nom personnalisé (override du titre tl;dv)
    updatedAt: v.string(),
  }).index("by_record", ["recordId"]),

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
    updatedAt: v.string(),
  }).index("by_key", ["key"]),

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
  }).index("by_category", ["category"]),

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
    status:          v.string(),   // todo | in_progress | blocked | done | cancelled
    priority:        v.string(),   // low | normal | high | urgent
    assigneeType:    v.string(),   // human | agent
    assigneeId:      v.optional(v.string()),
    source:          v.string(),   // dataos | telegram | slack | call | system
    sourceRef:       v.optional(v.string()),
    linkedClientId:  v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    linkedMissionId: v.optional(v.string()),
    blockerReason:   v.optional(v.string()),
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
    boardColumn:    v.optional(v.string()),   // colonne kanban : leads_a_traiter | nrp1..nrp4 | rdv_booke | perdu
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
  }).index("by_record", ["prospectionRecordId"]),

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
    createdBy:   v.string(),
    createdAt:   v.string(),
    updatedAt:   v.string(),
  }).index("by_workspace", ["workspaceId"]),

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
})