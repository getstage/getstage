import { z } from "zod";

import { providerErrorCodeSchema, providerIdSchema } from "./engine-provider";

export const TELEMETRY_MAX_EVENTS = 100;
export const TELEMETRY_MAX_BYTES = 256 * 1024;
export const TELEMETRY_EVENTS_PER_HOUR = 600;

const timestamp = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const durationMs = z.number().int().min(0).max(86_400_000);
const count = z.number().int().min(0).max(1_000_000);
const version = z.string().max(32).regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-(?:alpha|beta|rc)\.\d{1,4})?$/);
const outcome = z.enum(["succeeded", "failed"]);
const installSource = z.enum(["native", "homebrew", "npm", "unknown"]);
export const telemetryChannelSchema = z.enum(["testing", "production"]);
export const telemetryModuleSchema = z.enum([
  "research", "research_section", "strategy", "moodboard", "styleguide", "flows",
  "wireframes", "chat", "voice", "critique", "generation",
]);
export const telemetryStepSchema = z.enum([
  "context_save", "stage-context", "brief-files", "details-context", "refero-context",
  "stage-moodboard", "moodboard-import", "figma", "stage-styleguide", "verify-provider",
  "brand-kit", "provider", "parse", "save",
]);
export const telemetryModelSchema = z.enum([
  "sonnet", "opus", "haiku", "fable", "best", "claude-sonnet", "claude-opus", "claude-haiku",
  "claude-sonnet-4-5", "claude-sonnet-4-6", "claude-sonnet-5", "claude-opus-4-8",
  "claude-opus-5", "claude-haiku-4-5", "claude-fable-5", "claude-fable-5-1",
  "claude-mythos-5-1", "gpt-5.1-codex", "gpt-5.2-codex", "gpt-5.3-codex",
  "gpt-5.4", "gpt-5.5", "other",
]);
export const telemetryErrorKindSchema = z.enum([
  "details_unauthorized", "details_not_configured", "details_timeout", "details_http_error",
  "details_empty_result", "refero_unauthorized", "refero_not_configured", "refero_timeout",
  "refero_http_error", "refero_empty_result", "figma_unauthorized", "figma_rate_limited",
  "figma_http_error", "paper_not_running", "paper_http_error", "brief_unreadable",
  "pdf_unreadable", "docx_unreadable", "doc_unreadable", "txt_unreadable", "md_unreadable",
  "image_unreadable", "provider_missing_binary", "provider_not_authenticated",
  "provider_spawn_failed", "provider_timeout", "provider_exit_nonzero", "provider_rate_limited",
  "json_extract_failed", "artifact_incomplete", "artifact_invalid", "convex_unauthorized",
  "convex_function_error", "convex_timeout", "r2_upload_failed", "r2_download_failed",
  "r2_not_configured", "r2_timeout", "r2_too_large", "cancelled_by_user", "timeout",
  "exit_nonzero", "missing_binary", "port_conflict", "session_expired", "network_error", "unknown",
]);
export const telemetryRouteSchema = z.enum([
  "/", "/dashboard", "/settings", "/auth", "/auth/desktop", "/billing/return",
  "/api/*", "/stripe/*", "/integrations/*", "/projects/$id",
  "/projects/$id/research", "/projects/$id/strategy", "/projects/$id/moodboard",
  "/projects/$id/styleguide", "/projects/$id/flows", "/projects/$id/wireframes",
  "/projects/$id/assets", "other",
]);

// Client identity and arbitrary error text are deliberately absent. The Worker must
// derive userId from verified auth; free-text diagnostics need a separate privacy review.
const clientBase = z.object({
  ts: timestamp,
  appVersion: version,
  channel: telemetryChannelSchema,
  os: z.string().max(48).regex(/^(?:macOS|Windows|Linux) \d{1,4}(?:\.\d{1,4}){0,3}$/),
  sessionId: z.uuid(),
  projectId: z.string().regex(/^[a-z0-9]{16,64}$/).optional(),
  runId: z.uuid().optional(),
});
const diagnostics = {
  errorKind: telemetryErrorKindSchema.optional(),
};
const runEvent = clientBase.extend({
  event: z.literal("run"),
  runId: z.uuid(),
  module: telemetryModuleSchema,
  provider: providerIdSchema,
  model: telemetryModelSchema.optional(),
  mode: z.enum(["default", "fast"]).optional(),
  outcome: z.enum(["succeeded", "failed", "cancelled"]),
  errorCode: providerErrorCodeSchema.optional(),
  ...diagnostics,
  failedStep: telemetryStepSchema.optional(),
  durationMs,
  tokensIn: z.number().int().min(0).max(100_000_000).optional(),
  tokensOut: z.number().int().min(0).max(100_000_000).optional(),
  projectCategory: z.enum(["websites", "web_apps", "ios_apps"]).optional(),
  wireframeKind: z.enum(["lofi", "hifi"]).optional(),
});
const stepEvent = clientBase.extend({
  event: z.literal("step"),
  runId: z.uuid(),
  module: telemetryModuleSchema,
  step: telemetryStepSchema,
  outcome: z.enum(["succeeded", "failed", "skipped"]),
  durationMs,
  ...diagnostics,
});
const dependencyOperations = {
  details_mcp: ["search_inspirations", "get_inspiration", "initialize"],
  refero_mcp: ["refero_search_screens", "refero_search_flows", "refero_get_screen", "refero_get_flow", "initialize"],
  figma: ["read", "export", "upload"],
  paper_mcp: ["read", "export"],
  convex: ["context_read", "artifact_read", "artifact_save", "run_save"],
  r2_upload: ["upload"],
  r2_download: ["brief_download", "brand_kit_download", "image_download"],
  provider_cli: ["verify", "spawn", "run", "cancel", "update"],
} as const;
const dependencyEvent = clientBase.extend({
  event: z.literal("dependency"),
  dependency: z.enum(["details_mcp", "refero_mcp", "figma", "paper_mcp", "convex", "r2_upload", "r2_download", "provider_cli"]),
  operation: z.enum([
    "search_inspirations", "get_inspiration", "initialize", "refero_search_screens",
    "refero_search_flows", "refero_get_screen", "refero_get_flow", "read", "export",
    "upload", "context_read", "artifact_read", "artifact_save", "run_save",
    "brief_download", "brand_kit_download", "image_download", "verify", "spawn", "run", "cancel", "update",
  ]),
  outcome,
  httpStatus: z.number().int().min(100).max(599).optional(),
  durationMs,
  ...diagnostics,
}).refine(
  (event) => (dependencyOperations[event.dependency] as readonly string[]).includes(event.operation),
  { path: ["operation"], message: "Operation is not allowed for this dependency." },
);
const fileCounts = z.object({ uploaded: count, loaded: count })
  .refine((value) => value.loaded <= value.uploaded, { path: ["loaded"], message: "Loaded exceeds uploaded." });
const briefFilesEvent = clientBase.extend({
  event: z.literal("brief_files"),
  runId: z.uuid(),
  uploaded: count,
  loaded: count,
  byType: z.object({
    pdf: fileCounts, docx: fileCounts, doc: fileCounts, txt: fileCounts, md: fileCounts, image: fileCounts,
  }),
  failedKinds: z.array(telemetryErrorKindSchema).max(12),
}).refine(
  (event) => Object.values(event.byType).reduce((sum, value) => sum + value.uploaded, 0) === event.uploaded
    && Object.values(event.byType).reduce((sum, value) => sum + value.loaded, 0) === event.loaded,
  { path: ["byType"], message: "Per-type totals must match uploaded and loaded." },
);

export const telemetryEventSchema = z.discriminatedUnion("event", [
  runEvent,
  stepEvent,
  dependencyEvent,
  briefFilesEvent,
  clientBase.extend({
    event: z.literal("provider_status"), provider: providerIdSchema,
    status: z.enum(["ready", "missing", "not_authenticated", "outdated"]),
    ...diagnostics,
  }),
  clientBase.extend({
    event: z.literal("provider_update"), provider: providerIdSchema, installSource,
    versionBefore: version.optional(), versionAfter: version.optional(),
    outcome: z.enum(["updated", "failed"]), durationMs, ...diagnostics,
  }),
  clientBase.extend({
    event: z.literal("export"), target: z.enum(["figma", "figjam", "code", "paper", "zip"]),
    outcome, durationMs, ...diagnostics,
  }),
  clientBase.extend({
    event: z.literal("sidecar"), kind: z.enum(["start", "crash", "restart", "idle_stop", "port_conflict"]),
    durationMs, exitCode: z.number().int().min(-255).max(255).optional(),
    signal: z.enum(["SIGTERM", "SIGKILL", "SIGABRT", "SIGSEGV", "SIGINT", "other"]).optional(),
    ...diagnostics,
  }),
  clientBase.extend({
    event: z.literal("desktop_update"), phase: z.enum(["check", "download", "install"]),
    outcome, durationMs, ...diagnostics,
  }),
  clientBase.extend({
    event: z.literal("renderer_error"), route: telemetryRouteSchema,
    kind: z.enum(["error_boundary", "uncaught_error", "unhandled_rejection"]), ...diagnostics,
  }),
  clientBase.extend({
    event: z.literal("auth"), phase: z.enum(["sign_in", "callback", "refresh", "sign_out"]),
    outcome, durationMs, ...diagnostics,
  }),
  clientBase.extend({ event: z.literal("heartbeat") }),
]);

// These are server-only contracts; /api/telemetry must not accept cloud producers.
const cloudBase = z.object({ ts: timestamp, channel: telemetryChannelSchema });
export const cloudTelemetryEventSchema = z.discriminatedUnion("event", [
  cloudBase.extend({
    event: z.literal("worker"), route: telemetryRouteSchema,
    statusClass: z.enum(["2xx", "3xx", "4xx", "5xx"]), durationMs,
  }),
  cloudBase.extend({
    event: z.literal("convex"),
    function: z.enum(["billing:createCheckoutSession", "billing:createPortalSession", "billing:webhook", "rewards:claim", "invites", "projectAi", "other"]),
    outcome: z.literal("failed"), ...diagnostics,
  }),
  cloudBase.extend({
    event: z.literal("stripe_webhook"),
    eventType: z.enum(["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "charge.refunded", "other"]),
    outcome, creditOutcome: z.enum(["granted", "revoked", "unchanged"]).optional(),
    ...diagnostics,
  }),
  cloudBase.extend({
    event: z.literal("rewards"), result: z.enum(["approved", "unrelated", "unavailable", "claimed"]),
  }),
]);

// Parse the envelope first so the Worker can enforce 100 events while dropping
// individual invalid records. Never forward the original, unvalidated envelope.
export const telemetryBatchSchema = z.object({
  events: z.array(z.unknown()).min(1).max(TELEMETRY_MAX_EVENTS),
});

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type CloudTelemetryEvent = z.infer<typeof cloudTelemetryEventSchema>;
