/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as agentConnections from "../agentConnections.js";
import type * as aiCredentials from "../aiCredentials.js";
import type * as api_auth from "../api/auth.js";
import type * as api_errors from "../api/errors.js";
import type * as api_index from "../api/index.js";
import type * as api_models from "../api/models.js";
import type * as api_routes_agent from "../api/routes/agent.js";
import type * as api_routes_ai from "../api/routes/ai.js";
import type * as api_routes_figmaExport from "../api/routes/figmaExport.js";
import type * as api_routes_me from "../api/routes/me.js";
import type * as api_routes_phases from "../api/routes/phases.js";
import type * as api_routes_projects from "../api/routes/projects.js";
import type * as api_routes_tasks from "../api/routes/tasks.js";
import type * as api_types from "../api/types.js";
import type * as app_projectStitch from "../app/projectStitch.js";
import type * as appSecrets from "../appSecrets.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as clients from "../clients.js";
import type * as collaborators from "../collaborators.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as desktop from "../desktop.js";
import type * as developer_apiKeys from "../developer/apiKeys.js";
import type * as developer_testingFixtures from "../developer/testingFixtures.js";
import type * as domain_accountCleanup from "../domain/accountCleanup.js";
import type * as domain_auth_cleanup from "../domain/auth/cleanup.js";
import type * as domain_collaborators_invites from "../domain/collaborators/invites.js";
import type * as domain_collaborators_service from "../domain/collaborators/service.js";
import type * as domain_demo_workspace from "../domain/demo/workspace.js";
import type * as domain_projects_apiReadModel from "../domain/projects/apiReadModel.js";
import type * as domain_projects_entitlement from "../domain/projects/entitlement.js";
import type * as domain_projects_readModel from "../domain/projects/readModel.js";
import type * as domain_projects_service from "../domain/projects/service.js";
import type * as emails from "../emails.js";
import type * as helpers_access_projectAccess from "../helpers/access/projectAccess.js";
import type * as helpers_auth_requireAuthUser from "../helpers/auth/requireAuthUser.js";
import type * as helpers_env from "../helpers/env.js";
import type * as helpers_integrations_notion_researchExport from "../helpers/integrations/notion/researchExport.js";
import type * as helpers_integrations_notion_strategyExport from "../helpers/integrations/notion/strategyExport.js";
import type * as helpers_integrations_oauth from "../helpers/integrations/oauth.js";
import type * as helpers_integrations_sheets_normalize from "../helpers/integrations/sheets/normalize.js";
import type * as helpers_integrations_sheets_parse from "../helpers/integrations/sheets/parse.js";
import type * as helpers_integrations_stitch_assets from "../helpers/integrations/stitch/assets.js";
import type * as helpers_integrations_stitch_url from "../helpers/integrations/stitch/url.js";
import type * as helpers_integrations_stripe_account from "../helpers/integrations/stripe/account.js";
import type * as helpers_integrations_stripe_parsing from "../helpers/integrations/stripe/parsing.js";
import type * as helpers_portal_clientSync from "../helpers/portal/clientSync.js";
import type * as helpers_portal_config from "../helpers/portal/config.js";
import type * as helpers_portal_taskProjection from "../helpers/portal/taskProjection.js";
import type * as helpers_r2_keys from "../helpers/r2/keys.js";
import type * as helpers_r2_resolve from "../helpers/r2/resolve.js";
import type * as helpers_time from "../helpers/time.js";
import type * as http from "../http.js";
import type * as integrations_contentPlatforms from "../integrations/contentPlatforms.js";
import type * as integrations_googleSheets from "../integrations/googleSheets.js";
import type * as integrations_loopsOtp from "../integrations/loopsOtp.js";
import type * as integrations_notionResearchExport from "../integrations/notionResearchExport.js";
import type * as integrations_notionStrategyExport from "../integrations/notionStrategyExport.js";
import type * as integrations_resendAudience from "../integrations/resendAudience.js";
import type * as integrations_stitch from "../integrations/stitch.js";
import type * as integrations_stripeConnect from "../integrations/stripeConnect.js";
import type * as lib_aiCredentials_handlers_index from "../lib/aiCredentials/handlers/index.js";
import type * as lib_auth_handlers_index from "../lib/auth/handlers/index.js";
import type * as lib_billing_handlers_index from "../lib/billing/handlers/index.js";
import type * as lib_billing_handlers_subscriptionMirror from "../lib/billing/handlers/subscriptionMirror.js";
import type * as lib_billing_handlers_webhooks from "../lib/billing/handlers/webhooks.js";
import type * as lib_credentialVault from "../lib/credentialVault.js";
import type * as lib_credits_priceConfig from "../lib/credits/priceConfig.js";
import type * as lib_credits_service from "../lib/credits/service.js";
import type * as lib_desktop_handlers_index from "../lib/desktop/handlers/index.js";
import type * as lib_emails_client from "../lib/emails/client.js";
import type * as lib_emails_config from "../lib/emails/config.js";
import type * as lib_emails_handlers from "../lib/emails/handlers.js";
import type * as lib_emails_platform from "../lib/emails/platform.js";
import type * as lib_emails_sendStep from "../lib/emails/sendStep.js";
import type * as lib_emails_subscriptionStatus from "../lib/emails/subscriptionStatus.js";
import type * as lib_emails_unsubscribe from "../lib/emails/unsubscribe.js";
import type * as lib_integrations_contentPlatforms_domain from "../lib/integrations/contentPlatforms/domain.js";
import type * as lib_integrations_contentPlatforms_handlers_connections from "../lib/integrations/contentPlatforms/handlers/connections.js";
import type * as lib_integrations_contentPlatforms_handlers_figmaJobs from "../lib/integrations/contentPlatforms/handlers/figmaJobs.js";
import type * as lib_integrations_contentPlatforms_handlers_notionExport from "../lib/integrations/contentPlatforms/handlers/notionExport.js";
import type * as lib_integrations_contentPlatforms_handlers_oauth from "../lib/integrations/contentPlatforms/handlers/oauth.js";
import type * as lib_integrations_googleSheets_handlers_connection from "../lib/integrations/googleSheets/handlers/connection.js";
import type * as lib_integrations_googleSheets_handlers_import from "../lib/integrations/googleSheets/handlers/import.js";
import type * as lib_integrations_stitch_handlers_index from "../lib/integrations/stitch/handlers/index.js";
import type * as lib_integrations_stripeConnect_handlers_index from "../lib/integrations/stripeConnect/handlers/index.js";
import type * as lib_projectAi_domain_artifactStore from "../lib/projectAi/domain/artifactStore.js";
import type * as lib_projectAi_domain_contextStore from "../lib/projectAi/domain/contextStore.js";
import type * as lib_projectAi_domain_latestArtifact from "../lib/projectAi/domain/latestArtifact.js";
import type * as lib_projectAi_domain_normalize from "../lib/projectAi/domain/normalize.js";
import type * as lib_projectAi_domain_projectCleanup from "../lib/projectAi/domain/projectCleanup.js";
import type * as lib_projectAi_domain_r2Keys from "../lib/projectAi/domain/r2Keys.js";
import type * as lib_projectAi_domain_records from "../lib/projectAi/domain/records.js";
import type * as lib_projectAi_domain_researchContent from "../lib/projectAi/domain/researchContent.js";
import type * as lib_projectAi_domain_runStore from "../lib/projectAi/domain/runStore.js";
import type * as lib_projectAi_domain_time from "../lib/projectAi/domain/time.js";
import type * as lib_projectAi_domain_validators from "../lib/projectAi/domain/validators.js";
import type * as lib_projectAi_handlers_api from "../lib/projectAi/handlers/api.js";
import type * as lib_projectAi_handlers_artifacts from "../lib/projectAi/handlers/artifacts.js";
import type * as lib_projectAi_handlers_chat from "../lib/projectAi/handlers/chat.js";
import type * as lib_projectAi_handlers_context from "../lib/projectAi/handlers/context.js";
import type * as lib_projectAi_handlers_flows from "../lib/projectAi/handlers/flows.js";
import type * as lib_projectAi_handlers_moodboard from "../lib/projectAi/handlers/moodboard.js";
import type * as lib_projectAi_handlers_research from "../lib/projectAi/handlers/research.js";
import type * as lib_projectAi_handlers_runs from "../lib/projectAi/handlers/runs.js";
import type * as lib_projectAi_handlers_strategy from "../lib/projectAi/handlers/strategy.js";
import type * as lib_projectAi_handlers_wireframes from "../lib/projectAi/handlers/wireframes.js";
import type * as lib_projects_domain_delete from "../lib/projects/domain/delete.js";
import type * as lib_projects_domain_projectService from "../lib/projects/domain/projectService.js";
import type * as lib_projects_handlers_access from "../lib/projects/handlers/access.js";
import type * as lib_projects_handlers_mutations from "../lib/projects/handlers/mutations.js";
import type * as lib_projects_handlers_queries from "../lib/projects/handlers/queries.js";
import type * as lib_projects_handlers_ui from "../lib/projects/handlers/ui.js";
import type * as lib_r2_domain from "../lib/r2/domain.js";
import type * as lib_r2_handlers from "../lib/r2/handlers.js";
import type * as lib_settings_handlers_index from "../lib/settings/handlers/index.js";
import type * as lib_tasks_handlers_index from "../lib/tasks/handlers/index.js";
import type * as maintenance from "../maintenance.js";
import type * as models_integrations_contentPlatforms from "../models/integrations/contentPlatforms.js";
import type * as models_integrations_googleSheets from "../models/integrations/googleSheets.js";
import type * as models_integrations_stitch from "../models/integrations/stitch.js";
import type * as models_integrations_stripeConnect from "../models/integrations/stripeConnect.js";
import type * as models_projects_validators from "../models/projects/validators.js";
import type * as onboarding from "../onboarding.js";
import type * as platform_inviteEmail from "../platform/inviteEmail.js";
import type * as platform_rateLimits from "../platform/rateLimits.js";
import type * as portal from "../portal.js";
import type * as projectAi from "../projectAi.js";
import type * as projects from "../projects.js";
import type * as r2 from "../r2.js";
import type * as readmodels_dashboardOverview from "../readmodels/dashboardOverview.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as userEmails from "../userEmails.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";
import type * as workspaceMembers from "../workspaceMembers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  agentConnections: typeof agentConnections;
  aiCredentials: typeof aiCredentials;
  "api/auth": typeof api_auth;
  "api/errors": typeof api_errors;
  "api/index": typeof api_index;
  "api/models": typeof api_models;
  "api/routes/agent": typeof api_routes_agent;
  "api/routes/ai": typeof api_routes_ai;
  "api/routes/figmaExport": typeof api_routes_figmaExport;
  "api/routes/me": typeof api_routes_me;
  "api/routes/phases": typeof api_routes_phases;
  "api/routes/projects": typeof api_routes_projects;
  "api/routes/tasks": typeof api_routes_tasks;
  "api/types": typeof api_types;
  "app/projectStitch": typeof app_projectStitch;
  appSecrets: typeof appSecrets;
  auth: typeof auth;
  billing: typeof billing;
  clients: typeof clients;
  collaborators: typeof collaborators;
  credits: typeof credits;
  crons: typeof crons;
  dashboard: typeof dashboard;
  desktop: typeof desktop;
  "developer/apiKeys": typeof developer_apiKeys;
  "developer/testingFixtures": typeof developer_testingFixtures;
  "domain/accountCleanup": typeof domain_accountCleanup;
  "domain/auth/cleanup": typeof domain_auth_cleanup;
  "domain/collaborators/invites": typeof domain_collaborators_invites;
  "domain/collaborators/service": typeof domain_collaborators_service;
  "domain/demo/workspace": typeof domain_demo_workspace;
  "domain/projects/apiReadModel": typeof domain_projects_apiReadModel;
  "domain/projects/entitlement": typeof domain_projects_entitlement;
  "domain/projects/readModel": typeof domain_projects_readModel;
  "domain/projects/service": typeof domain_projects_service;
  emails: typeof emails;
  "helpers/access/projectAccess": typeof helpers_access_projectAccess;
  "helpers/auth/requireAuthUser": typeof helpers_auth_requireAuthUser;
  "helpers/env": typeof helpers_env;
  "helpers/integrations/notion/researchExport": typeof helpers_integrations_notion_researchExport;
  "helpers/integrations/notion/strategyExport": typeof helpers_integrations_notion_strategyExport;
  "helpers/integrations/oauth": typeof helpers_integrations_oauth;
  "helpers/integrations/sheets/normalize": typeof helpers_integrations_sheets_normalize;
  "helpers/integrations/sheets/parse": typeof helpers_integrations_sheets_parse;
  "helpers/integrations/stitch/assets": typeof helpers_integrations_stitch_assets;
  "helpers/integrations/stitch/url": typeof helpers_integrations_stitch_url;
  "helpers/integrations/stripe/account": typeof helpers_integrations_stripe_account;
  "helpers/integrations/stripe/parsing": typeof helpers_integrations_stripe_parsing;
  "helpers/portal/clientSync": typeof helpers_portal_clientSync;
  "helpers/portal/config": typeof helpers_portal_config;
  "helpers/portal/taskProjection": typeof helpers_portal_taskProjection;
  "helpers/r2/keys": typeof helpers_r2_keys;
  "helpers/r2/resolve": typeof helpers_r2_resolve;
  "helpers/time": typeof helpers_time;
  http: typeof http;
  "integrations/contentPlatforms": typeof integrations_contentPlatforms;
  "integrations/googleSheets": typeof integrations_googleSheets;
  "integrations/loopsOtp": typeof integrations_loopsOtp;
  "integrations/notionResearchExport": typeof integrations_notionResearchExport;
  "integrations/notionStrategyExport": typeof integrations_notionStrategyExport;
  "integrations/resendAudience": typeof integrations_resendAudience;
  "integrations/stitch": typeof integrations_stitch;
  "integrations/stripeConnect": typeof integrations_stripeConnect;
  "lib/aiCredentials/handlers/index": typeof lib_aiCredentials_handlers_index;
  "lib/auth/handlers/index": typeof lib_auth_handlers_index;
  "lib/billing/handlers/index": typeof lib_billing_handlers_index;
  "lib/billing/handlers/subscriptionMirror": typeof lib_billing_handlers_subscriptionMirror;
  "lib/billing/handlers/webhooks": typeof lib_billing_handlers_webhooks;
  "lib/credentialVault": typeof lib_credentialVault;
  "lib/credits/priceConfig": typeof lib_credits_priceConfig;
  "lib/credits/service": typeof lib_credits_service;
  "lib/desktop/handlers/index": typeof lib_desktop_handlers_index;
  "lib/emails/client": typeof lib_emails_client;
  "lib/emails/config": typeof lib_emails_config;
  "lib/emails/handlers": typeof lib_emails_handlers;
  "lib/emails/platform": typeof lib_emails_platform;
  "lib/emails/sendStep": typeof lib_emails_sendStep;
  "lib/emails/subscriptionStatus": typeof lib_emails_subscriptionStatus;
  "lib/emails/unsubscribe": typeof lib_emails_unsubscribe;
  "lib/integrations/contentPlatforms/domain": typeof lib_integrations_contentPlatforms_domain;
  "lib/integrations/contentPlatforms/handlers/connections": typeof lib_integrations_contentPlatforms_handlers_connections;
  "lib/integrations/contentPlatforms/handlers/figmaJobs": typeof lib_integrations_contentPlatforms_handlers_figmaJobs;
  "lib/integrations/contentPlatforms/handlers/notionExport": typeof lib_integrations_contentPlatforms_handlers_notionExport;
  "lib/integrations/contentPlatforms/handlers/oauth": typeof lib_integrations_contentPlatforms_handlers_oauth;
  "lib/integrations/googleSheets/handlers/connection": typeof lib_integrations_googleSheets_handlers_connection;
  "lib/integrations/googleSheets/handlers/import": typeof lib_integrations_googleSheets_handlers_import;
  "lib/integrations/stitch/handlers/index": typeof lib_integrations_stitch_handlers_index;
  "lib/integrations/stripeConnect/handlers/index": typeof lib_integrations_stripeConnect_handlers_index;
  "lib/projectAi/domain/artifactStore": typeof lib_projectAi_domain_artifactStore;
  "lib/projectAi/domain/contextStore": typeof lib_projectAi_domain_contextStore;
  "lib/projectAi/domain/latestArtifact": typeof lib_projectAi_domain_latestArtifact;
  "lib/projectAi/domain/normalize": typeof lib_projectAi_domain_normalize;
  "lib/projectAi/domain/projectCleanup": typeof lib_projectAi_domain_projectCleanup;
  "lib/projectAi/domain/r2Keys": typeof lib_projectAi_domain_r2Keys;
  "lib/projectAi/domain/records": typeof lib_projectAi_domain_records;
  "lib/projectAi/domain/researchContent": typeof lib_projectAi_domain_researchContent;
  "lib/projectAi/domain/runStore": typeof lib_projectAi_domain_runStore;
  "lib/projectAi/domain/time": typeof lib_projectAi_domain_time;
  "lib/projectAi/domain/validators": typeof lib_projectAi_domain_validators;
  "lib/projectAi/handlers/api": typeof lib_projectAi_handlers_api;
  "lib/projectAi/handlers/artifacts": typeof lib_projectAi_handlers_artifacts;
  "lib/projectAi/handlers/chat": typeof lib_projectAi_handlers_chat;
  "lib/projectAi/handlers/context": typeof lib_projectAi_handlers_context;
  "lib/projectAi/handlers/flows": typeof lib_projectAi_handlers_flows;
  "lib/projectAi/handlers/moodboard": typeof lib_projectAi_handlers_moodboard;
  "lib/projectAi/handlers/research": typeof lib_projectAi_handlers_research;
  "lib/projectAi/handlers/runs": typeof lib_projectAi_handlers_runs;
  "lib/projectAi/handlers/strategy": typeof lib_projectAi_handlers_strategy;
  "lib/projectAi/handlers/wireframes": typeof lib_projectAi_handlers_wireframes;
  "lib/projects/domain/delete": typeof lib_projects_domain_delete;
  "lib/projects/domain/projectService": typeof lib_projects_domain_projectService;
  "lib/projects/handlers/access": typeof lib_projects_handlers_access;
  "lib/projects/handlers/mutations": typeof lib_projects_handlers_mutations;
  "lib/projects/handlers/queries": typeof lib_projects_handlers_queries;
  "lib/projects/handlers/ui": typeof lib_projects_handlers_ui;
  "lib/r2/domain": typeof lib_r2_domain;
  "lib/r2/handlers": typeof lib_r2_handlers;
  "lib/settings/handlers/index": typeof lib_settings_handlers_index;
  "lib/tasks/handlers/index": typeof lib_tasks_handlers_index;
  maintenance: typeof maintenance;
  "models/integrations/contentPlatforms": typeof models_integrations_contentPlatforms;
  "models/integrations/googleSheets": typeof models_integrations_googleSheets;
  "models/integrations/stitch": typeof models_integrations_stitch;
  "models/integrations/stripeConnect": typeof models_integrations_stripeConnect;
  "models/projects/validators": typeof models_projects_validators;
  onboarding: typeof onboarding;
  "platform/inviteEmail": typeof platform_inviteEmail;
  "platform/rateLimits": typeof platform_rateLimits;
  portal: typeof portal;
  projectAi: typeof projectAi;
  projects: typeof projects;
  r2: typeof r2;
  "readmodels/dashboardOverview": typeof readmodels_dashboardOverview;
  settings: typeof settings;
  tasks: typeof tasks;
  userEmails: typeof userEmails;
  users: typeof users;
  viewer: typeof viewer;
  workspaceMembers: typeof workspaceMembers;
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

export declare const components: {
  r2: {
    lib: {
      deleteMetadata: FunctionReference<
        "mutation",
        "internal",
        { bucket: string; key: string },
        null
      >;
      deleteObject: FunctionReference<
        "mutation",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          secretAccessKey: string;
        },
        null
      >;
      deleteR2Object: FunctionReference<
        "action",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          secretAccessKey: string;
        },
        null
      >;
      getMetadata: FunctionReference<
        "query",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          secretAccessKey: string;
        },
        {
          bucket: string;
          bucketLink: string;
          contentType?: string;
          key: string;
          lastModified: string;
          link: string;
          sha256?: string;
          size?: number;
          url: string;
        } | null
      >;
      listMetadata: FunctionReference<
        "query",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          cursor?: string;
          endpoint: string;
          limit?: number;
          secretAccessKey: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            bucket: string;
            bucketLink: string;
            contentType?: string;
            key: string;
            lastModified: string;
            link: string;
            sha256?: string;
            size?: number;
            url: string;
          }>;
          pageStatus?: null | "SplitRecommended" | "SplitRequired";
          splitCursor?: null | string;
        }
      >;
      store: FunctionReference<
        "action",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          secretAccessKey: string;
          url: string;
        },
        any
      >;
      syncMetadata: FunctionReference<
        "action",
        "internal",
        {
          accessKeyId: string;
          bucket: string;
          endpoint: string;
          key: string;
          onComplete?: string;
          secretAccessKey: string;
        },
        null
      >;
      upsertMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          bucket: string;
          contentType?: string;
          key: string;
          lastModified: string;
          link: string;
          sha256?: string;
          size?: number;
        },
        { isNew: boolean }
      >;
    };
  };
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
  stripe: {
    private: {
      handleCheckoutSessionCompleted: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          mode: string;
          stripeCheckoutSessionId: string;
          stripeCustomerId?: string;
        },
        null
      >;
      handleCustomerCreated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleCustomerUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        null
      >;
      handleInvoiceCreated: FunctionReference<
        "mutation",
        "internal",
        {
          amountDue: number;
          amountPaid: number;
          created: number;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
        },
        null
      >;
      handleInvoicePaid: FunctionReference<
        "mutation",
        "internal",
        { amountPaid: number; stripeInvoiceId: string },
        null
      >;
      handleInvoicePaymentFailed: FunctionReference<
        "mutation",
        "internal",
        { stripeInvoiceId: string },
        null
      >;
      handlePaymentIntentSucceeded: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
        },
        null
      >;
      handleSubscriptionCreated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      handleSubscriptionDeleted: FunctionReference<
        "mutation",
        "internal",
        { stripeSubscriptionId: string },
        null
      >;
      handleSubscriptionUpdated: FunctionReference<
        "mutation",
        "internal",
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          priceId?: string;
          quantity?: number;
          status: string;
          stripeSubscriptionId: string;
        },
        null
      >;
      updatePaymentCustomer: FunctionReference<
        "mutation",
        "internal",
        { stripeCustomerId: string; stripePaymentIntentId: string },
        null
      >;
      updateSubscriptionQuantityInternal: FunctionReference<
        "mutation",
        "internal",
        { quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
    public: {
      createOrUpdateCustomer: FunctionReference<
        "mutation",
        "internal",
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        },
        string
      >;
      getCustomer: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        {
          email?: string;
          metadata?: any;
          name?: string;
          stripeCustomerId: string;
        } | null
      >;
      getPayment: FunctionReference<
        "query",
        "internal",
        { stripePaymentIntentId: string },
        {
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        } | null
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { stripeSubscriptionId: string },
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      getSubscriptionByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        {
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        } | null
      >;
      listInvoices: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listInvoicesByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amountDue: number;
          amountPaid: number;
          created: number;
          orgId?: string;
          status: string;
          stripeCustomerId: string;
          stripeInvoiceId: string;
          stripeSubscriptionId?: string;
          userId?: string;
        }>
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByOrgId: FunctionReference<
        "query",
        "internal",
        { orgId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listPaymentsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          amount: number;
          created: number;
          currency: string;
          metadata?: any;
          orgId?: string;
          status: string;
          stripeCustomerId?: string;
          stripePaymentIntentId: string;
          userId?: string;
        }>
      >;
      listSubscriptions: FunctionReference<
        "query",
        "internal",
        { stripeCustomerId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      listSubscriptionsByUserId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<{
          cancelAt?: number;
          cancelAtPeriodEnd: boolean;
          currentPeriodEnd: number;
          metadata?: any;
          orgId?: string;
          priceId: string;
          quantity?: number;
          status: string;
          stripeCustomerId: string;
          stripeSubscriptionId: string;
          userId?: string;
        }>
      >;
      updateSubscriptionMetadata: FunctionReference<
        "mutation",
        "internal",
        {
          metadata: any;
          orgId?: string;
          stripeSubscriptionId: string;
          userId?: string;
        },
        null
      >;
      updateSubscriptionQuantity: FunctionReference<
        "action",
        "internal",
        { apiKey: string; quantity: number; stripeSubscriptionId: string },
        null
      >;
    };
  };
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string> | string;
          cc?: Array<string> | string;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
