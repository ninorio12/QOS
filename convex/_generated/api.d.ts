/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adsIntel from "../adsIntel.js";
import type * as agentAccessSync from "../agentAccessSync.js";
import type * as agentApi from "../agentApi.js";
import type * as agentBrains from "../agentBrains.js";
import type * as agentGuard from "../agentGuard.js";
import type * as agentPermissions from "../agentPermissions.js";
import type * as agents from "../agents.js";
import type * as analytics from "../analytics.js";
import type * as backfillLeadSource from "../backfillLeadSource.js";
import type * as booking from "../booking.js";
import type * as budget from "../budget.js";
import type * as calendarTypes from "../calendarTypes.js";
import type * as cardThreads from "../cardThreads.js";
import type * as clients from "../clients.js";
import type * as closing from "../closing.js";
import type * as companySettings from "../companySettings.js";
import type * as confirmationIntake from "../confirmationIntake.js";
import type * as contactDedup from "../contactDedup.js";
import type * as contact_meta from "../contact_meta.js";
import type * as contractSignatures from "../contractSignatures.js";
import type * as crm_contacts from "../crm_contacts.js";
import type * as crm_leads from "../crm_leads.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as demoOrigin from "../demoOrigin.js";
import type * as devis from "../devis.js";
import type * as externalPayments from "../externalPayments.js";
import type * as files from "../files.js";
import type * as funnelCohort from "../funnelCohort.js";
import type * as fx from "../fx.js";
import type * as googleAccounts from "../googleAccounts.js";
import type * as http from "../http.js";
import type * as iclosed from "../iclosed.js";
import type * as integrations from "../integrations.js";
import type * as integrityCleanup from "../integrityCleanup.js";
import type * as leadIngest from "../leadIngest.js";
import type * as leadIngestCleanup from "../leadIngestCleanup.js";
import type * as leadSync from "../leadSync.js";
import type * as lead_stage_history from "../lead_stage_history.js";
import type * as lib_agentEnums from "../lib/agentEnums.js";
import type * as lib_leadSource from "../lib/leadSource.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as library from "../library.js";
import type * as mediaBuyer from "../mediaBuyer.js";
import type * as metaAds from "../metaAds.js";
import type * as moneyReconciliation from "../moneyReconciliation.js";
import type * as onboarding from "../onboarding.js";
import type * as osActivities from "../osActivities.js";
import type * as osAgents from "../osAgents.js";
import type * as osHandoffs from "../osHandoffs.js";
import type * as osKbDocs from "../osKbDocs.js";
import type * as osKnowledge from "../osKnowledge.js";
import type * as osLib from "../osLib.js";
import type * as osOutreach from "../osOutreach.js";
import type * as osProspection from "../osProspection.js";
import type * as osSalesCalls from "../osSalesCalls.js";
import type * as osSkills from "../osSkills.js";
import type * as osTasks from "../osTasks.js";
import type * as outboundEmailing from "../outboundEmailing.js";
import type * as outboundLeads from "../outboundLeads.js";
import type * as paiement from "../paiement.js";
import type * as performance from "../performance.js";
import type * as pipeline_clients from "../pipeline_clients.js";
import type * as pipeline_config from "../pipeline_config.js";
import type * as processCategories from "../processCategories.js";
import type * as processSubfolders from "../processSubfolders.js";
import type * as processes from "../processes.js";
import type * as prospectionCockpit from "../prospectionCockpit.js";
import type * as prospectionObjectives from "../prospectionObjectives.js";
import type * as purgeOrphanRecord from "../purgeOrphanRecord.js";
import type * as recordNotes from "../recordNotes.js";
import type * as seed from "../seed.js";
import type * as seedDemo from "../seedDemo.js";
import type * as seedDevis from "../seedDevis.js";
import type * as stripe from "../stripe.js";
import type * as stripePayments from "../stripePayments.js";
import type * as stripeSync from "../stripeSync.js";
import type * as sync from "../sync.js";
import type * as synthese from "../synthese.js";
import type * as timeLib from "../timeLib.js";
import type * as users from "../users.js";
import type * as zernioAds from "../zernioAds.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adsIntel: typeof adsIntel;
  agentAccessSync: typeof agentAccessSync;
  agentApi: typeof agentApi;
  agentBrains: typeof agentBrains;
  agentGuard: typeof agentGuard;
  agentPermissions: typeof agentPermissions;
  agents: typeof agents;
  analytics: typeof analytics;
  backfillLeadSource: typeof backfillLeadSource;
  booking: typeof booking;
  budget: typeof budget;
  calendarTypes: typeof calendarTypes;
  cardThreads: typeof cardThreads;
  clients: typeof clients;
  closing: typeof closing;
  companySettings: typeof companySettings;
  confirmationIntake: typeof confirmationIntake;
  contactDedup: typeof contactDedup;
  contact_meta: typeof contact_meta;
  contractSignatures: typeof contractSignatures;
  crm_contacts: typeof crm_contacts;
  crm_leads: typeof crm_leads;
  crons: typeof crons;
  dashboard: typeof dashboard;
  demoOrigin: typeof demoOrigin;
  devis: typeof devis;
  externalPayments: typeof externalPayments;
  files: typeof files;
  funnelCohort: typeof funnelCohort;
  fx: typeof fx;
  googleAccounts: typeof googleAccounts;
  http: typeof http;
  iclosed: typeof iclosed;
  integrations: typeof integrations;
  integrityCleanup: typeof integrityCleanup;
  leadIngest: typeof leadIngest;
  leadIngestCleanup: typeof leadIngestCleanup;
  leadSync: typeof leadSync;
  lead_stage_history: typeof lead_stage_history;
  "lib/agentEnums": typeof lib_agentEnums;
  "lib/leadSource": typeof lib_leadSource;
  "lib/permissions": typeof lib_permissions;
  library: typeof library;
  mediaBuyer: typeof mediaBuyer;
  metaAds: typeof metaAds;
  moneyReconciliation: typeof moneyReconciliation;
  onboarding: typeof onboarding;
  osActivities: typeof osActivities;
  osAgents: typeof osAgents;
  osHandoffs: typeof osHandoffs;
  osKbDocs: typeof osKbDocs;
  osKnowledge: typeof osKnowledge;
  osLib: typeof osLib;
  osOutreach: typeof osOutreach;
  osProspection: typeof osProspection;
  osSalesCalls: typeof osSalesCalls;
  osSkills: typeof osSkills;
  osTasks: typeof osTasks;
  outboundEmailing: typeof outboundEmailing;
  outboundLeads: typeof outboundLeads;
  paiement: typeof paiement;
  performance: typeof performance;
  pipeline_clients: typeof pipeline_clients;
  pipeline_config: typeof pipeline_config;
  processCategories: typeof processCategories;
  processSubfolders: typeof processSubfolders;
  processes: typeof processes;
  prospectionCockpit: typeof prospectionCockpit;
  prospectionObjectives: typeof prospectionObjectives;
  purgeOrphanRecord: typeof purgeOrphanRecord;
  recordNotes: typeof recordNotes;
  seed: typeof seed;
  seedDemo: typeof seedDemo;
  seedDevis: typeof seedDevis;
  stripe: typeof stripe;
  stripePayments: typeof stripePayments;
  stripeSync: typeof stripeSync;
  sync: typeof sync;
  synthese: typeof synthese;
  timeLib: typeof timeLib;
  users: typeof users;
  zernioAds: typeof zernioAds;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
