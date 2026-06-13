import type {
  ProviderId,
  ProviderListResponse,
  ProviderStatusRecord,
} from "@stage/data-ops/contracts";

const PROVIDER_STATUS_UNAVAILABLE_MESSAGE =
  "Could not verify AI provider status. Open Settings → Integrations and tap Refresh.";

function providerLabel(providerId: ProviderId) {
  return providerId === "claude" ? "Claude" : "Codex";
}

/** Query boundary: no ambiguous `undefined` past this point. */
export type ProviderStatusSnapshot =
  | { state: "loading" }
  | { state: "unavailable"; message: string }
  | { state: "loaded"; providers: ProviderStatusRecord[] };

export function resolveProviderStatusSnapshot(args: {
  data: ProviderListResponse | undefined;
  isError: boolean;
}): ProviderStatusSnapshot {
  if (args.data === undefined) {
    if (args.isError) {
      return {
        state: "unavailable",
        message: PROVIDER_STATUS_UNAVAILABLE_MESSAGE,
      };
    }
    return { state: "loading" };
  }

  return { state: "loaded", providers: args.data.providers };
}

/** Explicit preflight outcome — like Rust `Result`, with a dedicated loading state. */
export type ProviderPreflightResult =
  | { state: "loading" }
  | { state: "blocked"; message: string }
  | { state: "ready"; provider: ProviderStatusRecord };

export function evaluateProviderPreflight(args: {
  providerId: ProviderId;
  snapshot: ProviderStatusSnapshot;
  isEnabled: boolean;
  context?: "chat" | "run";
}): ProviderPreflightResult {
  const label = providerLabel(args.providerId);
  const disabledMessage =
    args.context === "chat"
      ? `Connect ${label} in Settings → Integrations before using it in Stage chat.`
      : `Connect ${label} in Settings → Integrations before running.`;

  if (!args.isEnabled) {
    return { state: "blocked", message: disabledMessage };
  }

  switch (args.snapshot.state) {
    case "loading":
      return { state: "loading" };
    case "unavailable":
      return { state: "blocked", message: args.snapshot.message };
    case "loaded": {
      const provider = args.snapshot.providers.find((entry) => entry.id === args.providerId);
      if (!provider || provider.status !== "ready") {
        return {
          state: "blocked",
          message:
            provider?.setupHint ??
            `${label} is not set up yet. Open Settings → Integrations and try again.`,
        };
      }
      return { state: "ready", provider };
    }
  }
}

export function isProviderStatusPending(snapshot: ProviderStatusSnapshot) {
  return snapshot.state === "loading";
}

export function getProviderPreflightError(args: {
  providerId: ProviderId;
  snapshot: ProviderStatusSnapshot;
  isEnabled: boolean;
  context?: "chat" | "run";
}): string | null {
  const result = evaluateProviderPreflight(args);
  return result.state === "blocked" ? result.message : null;
}

export function assertProviderPreflightReady(args: {
  providerId: ProviderId;
  snapshot: ProviderStatusSnapshot;
  isEnabled: boolean;
  context?: "chat" | "run";
}): ProviderStatusRecord {
  const result = evaluateProviderPreflight(args);

  if (result.state === "loading") {
    throw new Error("Checking AI provider status. Try again in a moment.");
  }
  if (result.state === "blocked") {
    throw new Error(result.message);
  }

  return result.provider;
}
