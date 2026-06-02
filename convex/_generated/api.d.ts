/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as clients from "../clients.js";
import type * as contact_meta from "../contact_meta.js";
import type * as crm_contacts from "../crm_contacts.js";
import type * as crm_leads from "../crm_leads.js";
import type * as dashboard from "../dashboard.js";
import type * as devis from "../devis.js";
import type * as lead_stage_history from "../lead_stage_history.js";
import type * as onboarding from "../onboarding.js";
import type * as pipeline_clients from "../pipeline_clients.js";
import type * as pipeline_config from "../pipeline_config.js";
import type * as seed from "../seed.js";
import type * as seedDevis from "../seedDevis.js";
import type * as sync from "../sync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  clients: typeof clients;
  contact_meta: typeof contact_meta;
  crm_contacts: typeof crm_contacts;
  crm_leads: typeof crm_leads;
  dashboard: typeof dashboard;
  devis: typeof devis;
  lead_stage_history: typeof lead_stage_history;
  onboarding: typeof onboarding;
  pipeline_clients: typeof pipeline_clients;
  pipeline_config: typeof pipeline_config;
  seed: typeof seed;
  seedDevis: typeof seedDevis;
  sync: typeof sync;
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
