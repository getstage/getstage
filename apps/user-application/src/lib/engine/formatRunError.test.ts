import assert from "node:assert/strict";
import test from "node:test";
import {
  CHAT_RUN_FAILED_USER_MESSAGE,
  toEngineErrorUserMessage,
  WIREFRAMES_RUN_FAILED_USER_MESSAGE,
} from "./formatRunError";

test("does not invent a quota banner from echoed research JSON", () => {
  const dump = JSON.stringify({
    artifactKind: "researchArtifact",
    copy: "Configure promo code, reward, and usage limits before confirmation.",
  });
  const message = toEngineErrorUserMessage(
    {
      code: "provider_process_failed",
      message: dump,
      detail: dump,
      retryable: false,
      providerId: "codex",
    },
    WIREFRAMES_RUN_FAILED_USER_MESSAGE,
  );
  assert.equal(message, WIREFRAMES_RUN_FAILED_USER_MESSAGE);
  assert.doesNotMatch(message, /Stage credits are unaffected/);
});

test("passes through a short real Codex limit message", () => {
  const engineMessage =
    "Codex usage limit reached. Try again at Jul 30th, 2026 1:50 PM.";
  const message = toEngineErrorUserMessage(
    {
      code: "provider_process_failed",
      message: engineMessage,
      retryable: true,
      providerId: "codex",
    },
    CHAT_RUN_FAILED_USER_MESSAGE,
  );
  assert.equal(message, engineMessage);
  assert.doesNotMatch(message, /Stage credits are unaffected/);
});

test("maps wireframes JSON dumps to the generic wireframes fallback", () => {
  const message = toEngineErrorUserMessage(
    {
      code: "provider_process_failed",
      message: '{"artifactKind":"wireframesArtifact","usage":"limit"}',
      retryable: false,
      providerId: "codex",
    },
    WIREFRAMES_RUN_FAILED_USER_MESSAGE,
  );
  assert.equal(message, WIREFRAMES_RUN_FAILED_USER_MESSAGE);
});

test("an MCP server's sign-in challenge is not shown as Codex being logged out", () => {
  const message = toEngineErrorUserMessage({
    code: "provider_process_failed",
    message:
      'Codex failed: "Bearer resource_metadata=\\"https://mcp.firecrawl.dev/.well-known/oauth-protected-resource/v2/mcp-oauth\\""',
    providerId: "codex",
    retryable: true,
  });
  assert.doesNotMatch(message, /not logged in/);
});
