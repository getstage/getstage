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
import type * as builderProfiles from "../builderProfiles.js";
import type * as clients from "../clients.js";
import type * as collaborators from "../collaborators.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as desktop from "../desktop.js";
import type * as developer_apiKeys from "../developer/apiKeys.js";
import type * as developer_mcpConnect from "../developer/mcpConnect.js";
import type * as developer_testingFixtures from "../developer/testingFixtures.js";
import type * as domain_accountCleanup from "../domain/accountCleanup.js";
import type * as domain_auth_cleanup from "../domain/auth/cleanup.js";
import type * as domain_billing_plans from "../domain/billing/plans.js";
import type * as domain_collaborators_invites from "../domain/collaborators/invites.js";
import type * as domain_collaborators_service from "../domain/collaborators/service.js";
import type * as domain_demo_workspace from "../domain/demo/workspace.js";
import type * as domain_projects_apiReadModel from "../domain/projects/apiReadModel.js";
import type * as domain_projects_entitlement from "../domain/projects/entitlement.js";
import type * as domain_projects_readModel from "../domain/projects/readModel.js";
import type * as domain_projects_service from "../domain/projects/service.js";
import type * as emails from "../emails.js";
import type * as helpers_access_projectAccess from "../helpers/access/projectAccess.js";
import type * as helpers_access_seatEntitlement from "../helpers/access/seatEntitlement.js";
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
import type * as integrations_referenceProxy from "../integrations/referenceProxy.js";
import type * as integrations_resendAudience from "../integrations/resendAudience.js";
import type * as integrations_stitch from "../integrations/stitch.js";
import type * as integrations_stripeConnect from "../integrations/stripeConnect.js";
import type * as lib_aiCredentials_handlers_index from "../lib/aiCredentials/handlers/index.js";
import type * as lib_auth_handlers_index from "../lib/auth/handlers/index.js";
import type * as lib_billing_handlers_index from "../lib/billing/handlers/index.js";
import type * as lib_billing_handlers_subscriptionMirror from "../lib/billing/handlers/subscriptionMirror.js";
import type * as lib_billing_handlers_webhooks from "../lib/billing/handlers/webhooks.js";
import type * as lib_builderProfiles_catalog from "../lib/builderProfiles/catalog.js";
import type * as lib_builderProfiles_fields from "../lib/builderProfiles/fields.js";
import type * as lib_credentialVault from "../lib/credentialVault.js";
import type * as lib_credits_priceConfig from "../lib/credits/priceConfig.js";
import type * as lib_credits_service from "../lib/credits/service.js";
import type * as lib_dashboard_overview from "../lib/dashboard/overview.js";
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
import type * as lib_invites_email from "../lib/invites/email.js";
import type * as lib_invites_tokens from "../lib/invites/tokens.js";
import type * as lib_projectAi_artifacts from "../lib/projectAi/artifacts.js";
import type * as lib_projectAi_chat from "../lib/projectAi/chat.js";
import type * as lib_projectAi_context from "../lib/projectAi/context.js";
import type * as lib_projectAi_domain_artifactStore from "../lib/projectAi/domain/artifactStore.js";
import type * as lib_projectAi_domain_attachArtifactAssets from "../lib/projectAi/domain/attachArtifactAssets.js";
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
import type * as lib_projectAi_flows_canvas from "../lib/projectAi/flows/canvas.js";
import type * as lib_projectAi_flows_handlers from "../lib/projectAi/flows/handlers.js";
import type * as lib_projectAi_mcp_runStatus from "../lib/projectAi/mcp/runStatus.js";
import type * as lib_projectAi_mcp_steps from "../lib/projectAi/mcp/steps.js";
import type * as lib_projectAi_moodboard_handlers from "../lib/projectAi/moodboard/handlers.js";
import type * as lib_projectAi_moodboard_mcp from "../lib/projectAi/moodboard/mcp.js";
import type * as lib_projectAi_research_handlers from "../lib/projectAi/research/handlers.js";
import type * as lib_projectAi_research_mcp from "../lib/projectAi/research/mcp.js";
import type * as lib_projectAi_runs from "../lib/projectAi/runs.js";
import type * as lib_projectAi_strategy_handlers from "../lib/projectAi/strategy/handlers.js";
import type * as lib_projectAi_wireframes_handlers from "../lib/projectAi/wireframes/handlers.js";
import type * as lib_projects_domain_delete from "../lib/projects/domain/delete.js";
import type * as lib_projects_domain_projectCategory from "../lib/projects/domain/projectCategory.js";
import type * as lib_projects_domain_projectService from "../lib/projects/domain/projectService.js";
import type * as lib_projects_handlers_access from "../lib/projects/handlers/access.js";
import type * as lib_projects_handlers_mutations from "../lib/projects/handlers/mutations.js";
import type * as lib_projects_handlers_queries from "../lib/projects/handlers/queries.js";
import type * as lib_projects_handlers_ui from "../lib/projects/handlers/ui.js";
import type * as lib_r2_domain from "../lib/r2/domain.js";
import type * as lib_r2_handlers from "../lib/r2/handlers.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_references_details from "../lib/references/details.js";
import type * as lib_references_figma from "../lib/references/figma.js";
import type * as lib_references_imageUrl from "../lib/references/imageUrl.js";
import type * as lib_references_refero from "../lib/references/refero.js";
import type * as lib_rewards_handlers from "../lib/rewards/handlers.js";
import type * as lib_settings_githubImport from "../lib/settings/githubImport.js";
import type * as lib_settings_handlers_index from "../lib/settings/handlers/index.js";
import type * as lib_tasks_handlers_index from "../lib/tasks/handlers/index.js";
import type * as maintenance from "../maintenance.js";
import type * as mcpHome from "../mcpHome.js";
import type * as models_integrations_contentPlatforms from "../models/integrations/contentPlatforms.js";
import type * as models_integrations_googleSheets from "../models/integrations/googleSheets.js";
import type * as models_integrations_stitch from "../models/integrations/stitch.js";
import type * as models_integrations_stripeConnect from "../models/integrations/stripeConnect.js";
import type * as models_projects_validators from "../models/projects/validators.js";
import type * as onboarding from "../onboarding.js";
import type * as portal from "../portal.js";
import type * as presence from "../presence.js";
import type * as projectAi from "../projectAi.js";
import type * as projects from "../projects.js";
import type * as r2 from "../r2.js";
import type * as rewards from "../rewards.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as userEmails from "../userEmails.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";
import type * as workflows_jobs from "../workflows/jobs.js";
import type * as workflows_moodboardImport from "../workflows/moodboardImport.js";
import type * as workflows_research from "../workflows/research.js";
import type * as workspaceInvites from "../workspaceInvites.js";
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
  builderProfiles: typeof builderProfiles;
  clients: typeof clients;
  collaborators: typeof collaborators;
  credits: typeof credits;
  crons: typeof crons;
  dashboard: typeof dashboard;
  desktop: typeof desktop;
  "developer/apiKeys": typeof developer_apiKeys;
  "developer/mcpConnect": typeof developer_mcpConnect;
  "developer/testingFixtures": typeof developer_testingFixtures;
  "domain/accountCleanup": typeof domain_accountCleanup;
  "domain/auth/cleanup": typeof domain_auth_cleanup;
  "domain/billing/plans": typeof domain_billing_plans;
  "domain/collaborators/invites": typeof domain_collaborators_invites;
  "domain/collaborators/service": typeof domain_collaborators_service;
  "domain/demo/workspace": typeof domain_demo_workspace;
  "domain/projects/apiReadModel": typeof domain_projects_apiReadModel;
  "domain/projects/entitlement": typeof domain_projects_entitlement;
  "domain/projects/readModel": typeof domain_projects_readModel;
  "domain/projects/service": typeof domain_projects_service;
  emails: typeof emails;
  "helpers/access/projectAccess": typeof helpers_access_projectAccess;
  "helpers/access/seatEntitlement": typeof helpers_access_seatEntitlement;
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
  "integrations/referenceProxy": typeof integrations_referenceProxy;
  "integrations/resendAudience": typeof integrations_resendAudience;
  "integrations/stitch": typeof integrations_stitch;
  "integrations/stripeConnect": typeof integrations_stripeConnect;
  "lib/aiCredentials/handlers/index": typeof lib_aiCredentials_handlers_index;
  "lib/auth/handlers/index": typeof lib_auth_handlers_index;
  "lib/billing/handlers/index": typeof lib_billing_handlers_index;
  "lib/billing/handlers/subscriptionMirror": typeof lib_billing_handlers_subscriptionMirror;
  "lib/billing/handlers/webhooks": typeof lib_billing_handlers_webhooks;
  "lib/builderProfiles/catalog": typeof lib_builderProfiles_catalog;
  "lib/builderProfiles/fields": typeof lib_builderProfiles_fields;
  "lib/credentialVault": typeof lib_credentialVault;
  "lib/credits/priceConfig": typeof lib_credits_priceConfig;
  "lib/credits/service": typeof lib_credits_service;
  "lib/dashboard/overview": typeof lib_dashboard_overview;
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
  "lib/invites/email": typeof lib_invites_email;
  "lib/invites/tokens": typeof lib_invites_tokens;
  "lib/projectAi/artifacts": typeof lib_projectAi_artifacts;
  "lib/projectAi/chat": typeof lib_projectAi_chat;
  "lib/projectAi/context": typeof lib_projectAi_context;
  "lib/projectAi/domain/artifactStore": typeof lib_projectAi_domain_artifactStore;
  "lib/projectAi/domain/attachArtifactAssets": typeof lib_projectAi_domain_attachArtifactAssets;
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
  "lib/projectAi/flows/canvas": typeof lib_projectAi_flows_canvas;
  "lib/projectAi/flows/handlers": typeof lib_projectAi_flows_handlers;
  "lib/projectAi/mcp/runStatus": typeof lib_projectAi_mcp_runStatus;
  "lib/projectAi/mcp/steps": typeof lib_projectAi_mcp_steps;
  "lib/projectAi/moodboard/handlers": typeof lib_projectAi_moodboard_handlers;
  "lib/projectAi/moodboard/mcp": typeof lib_projectAi_moodboard_mcp;
  "lib/projectAi/research/handlers": typeof lib_projectAi_research_handlers;
  "lib/projectAi/research/mcp": typeof lib_projectAi_research_mcp;
  "lib/projectAi/runs": typeof lib_projectAi_runs;
  "lib/projectAi/strategy/handlers": typeof lib_projectAi_strategy_handlers;
  "lib/projectAi/wireframes/handlers": typeof lib_projectAi_wireframes_handlers;
  "lib/projects/domain/delete": typeof lib_projects_domain_delete;
  "lib/projects/domain/projectCategory": typeof lib_projects_domain_projectCategory;
  "lib/projects/domain/projectService": typeof lib_projects_domain_projectService;
  "lib/projects/handlers/access": typeof lib_projects_handlers_access;
  "lib/projects/handlers/mutations": typeof lib_projects_handlers_mutations;
  "lib/projects/handlers/queries": typeof lib_projects_handlers_queries;
  "lib/projects/handlers/ui": typeof lib_projects_handlers_ui;
  "lib/r2/domain": typeof lib_r2_domain;
  "lib/r2/handlers": typeof lib_r2_handlers;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/references/details": typeof lib_references_details;
  "lib/references/figma": typeof lib_references_figma;
  "lib/references/imageUrl": typeof lib_references_imageUrl;
  "lib/references/refero": typeof lib_references_refero;
  "lib/rewards/handlers": typeof lib_rewards_handlers;
  "lib/settings/githubImport": typeof lib_settings_githubImport;
  "lib/settings/handlers/index": typeof lib_settings_handlers_index;
  "lib/tasks/handlers/index": typeof lib_tasks_handlers_index;
  maintenance: typeof maintenance;
  mcpHome: typeof mcpHome;
  "models/integrations/contentPlatforms": typeof models_integrations_contentPlatforms;
  "models/integrations/googleSheets": typeof models_integrations_googleSheets;
  "models/integrations/stitch": typeof models_integrations_stitch;
  "models/integrations/stripeConnect": typeof models_integrations_stripeConnect;
  "models/projects/validators": typeof models_projects_validators;
  onboarding: typeof onboarding;
  portal: typeof portal;
  presence: typeof presence;
  projectAi: typeof projectAi;
  projects: typeof projects;
  r2: typeof r2;
  rewards: typeof rewards;
  settings: typeof settings;
  tasks: typeof tasks;
  userEmails: typeof userEmails;
  users: typeof users;
  viewer: typeof viewer;
  "workflows/jobs": typeof workflows_jobs;
  "workflows/moodboardImport": typeof workflows_moodboardImport;
  "workflows/research": typeof workflows_research;
  workspaceInvites: typeof workspaceInvites;
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
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};
