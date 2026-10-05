import { IS_TESTING_BUILD } from "./build-channel";

export const ENGINE_DEFAULT_PORT = IS_TESTING_BUILD ? 48_231 : 48_221;

// First `cargo run` can take minutes while dependencies compile in development.
export const ENGINE_READINESS_ATTEMPTS = 240;
export const ENGINE_READINESS_INTERVAL_MS = 500;
export const ENGINE_READINESS_TIMEOUT_MS = 350;

export const ENGINE_SHUTDOWN_TIMEOUT_MS = 1_500;
export const ENGINE_IDLE_SHUTDOWN_MS = 7 * 60 * 1000;

export const ENGINE_REQUEST_TIMEOUT_MS = 10_000;
export const PROVIDER_STATUS_TIMEOUT_MS = 20_000;
// Slightly above the engine's 30-minute update limit (`codex update` downloads a full package).
export const PROVIDER_UPDATE_TIMEOUT_MS = 31 * 60 * 1000;

export const RUN_EVENT_STREAM_RECONNECT_DELAY_MS = 1_000;
export const RUN_EVENT_STREAM_MAX_MS = 45 * 60 * 1000;
