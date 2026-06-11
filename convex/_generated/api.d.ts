/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentApi from "../agentApi.js";
import type * as agents from "../agents.js";
import type * as analytics from "../analytics.js";
import type * as clients from "../clients.js";
import type * as companySettings from "../companySettings.js";
import type * as contactDedup from "../contactDedup.js";
import type * as contact_meta from "../contact_meta.js";
import type * as crm_contacts from "../crm_contacts.js";
import type * as crm_leads from "../crm_leads.js";
import type * as dashboard from "../dashboard.js";
import type * as devis from "../devis.js";
import type * as files from "../files.js";
import type * as googleAccounts from "../googleAccounts.js";
import type * as integrations from "../integrations.js";
import type * as integrityCleanup from "../integrityCleanup.js";
import type * as leadSync from "../leadSync.js";
import type * as lead_stage_history from "../lead_stage_history.js";
import type * as library from "../library.js";
import type * as onboarding from "../onboarding.js";
import type * as osActivities from "../osActivities.js";
import type * as osAgents from "../osAgents.js";
import type * as osKbDocs from "../osKbDocs.js";
import type * as osKnowledge from "../osKnowledge.js";
import type * as osLib from "../osLib.js";
import type * as osOutreach from "../osOutreach.js";
import type * as osProspection from "../osProspection.js";
import type * as osSalesCalls from "../osSalesCalls.js";
import type * as osTasks from "../osTasks.js";
import type * as paiement from "../paiement.js";
import type * as performance from "../performance.js";
import type * as pipeline_clients from "../pipeline_clients.js";
import type * as pipeline_config from "../pipeline_config.js";
import type * as processCategories from "../processCategories.js";
import type * as processSubfolders from "../processSubfolders.js";
import type * as processes from "../processes.js";
import type * as recordNotes from "../recordNotes.js";
import type * as seed from "../seed.js";
import type * as seedDevis from "../seedDevis.js";
import type * as sync from "../sync.js";
import type * as timeLib from "../timeLib.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentApi: typeof agentApi;
  agents: typeof agents;
  analytics: typeof analytics;
  clients: typeof clients;
  companySettings: typeof companySettings;
  contactDedup: typeof contactDedup;
  contact_meta: typeof contact_meta;
  crm_contacts: typeof crm_contacts;
  crm_leads: typeof crm_leads;
  dashboard: typeof dashboard;
  devis: typeof devis;
  files: typeof files;
  googleAccounts: typeof googleAccounts;
  integrations: typeof integrations;
  integrityCleanup: typeof integrityCleanup;
  leadSync: typeof leadSync;
  lead_stage_history: typeof lead_stage_history;
  library: typeof library;
  onboarding: typeof onboarding;
  osActivities: typeof osActivities;
  osAgents: typeof osAgents;
  osKbDocs: typeof osKbDocs;
  osKnowledge: typeof osKnowledge;
  osLib: typeof osLib;
  osOutreach: typeof osOutreach;
  osProspection: typeof osProspection;
  osSalesCalls: typeof osSalesCalls;
  osTasks: typeof osTasks;
  paiement: typeof paiement;
  performance: typeof performance;
  pipeline_clients: typeof pipeline_clients;
  pipeline_config: typeof pipeline_config;
  processCategories: typeof processCategories;
  processSubfolders: typeof processSubfolders;
  processes: typeof processes;
  recordNotes: typeof recordNotes;
  seed: typeof seed;
  seedDevis: typeof seedDevis;
  sync: typeof sync;
  timeLib: typeof timeLib;
  users: typeof users;
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
