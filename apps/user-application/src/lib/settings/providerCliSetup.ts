import type { ProviderId, ProviderStatusRecord } from "@stage/data-ops/contracts";

export type ProviderCliSetupStep = {
  title: string;
  command?: string;
  detail: string;
};

export function providerLabel(providerId: ProviderId) {
  return providerId === "claude" ? "Claude" : "Codex";
}

export function getProviderCliSetupSteps(providerId: ProviderId): ProviderCliSetupStep[] {
  if (providerId === "claude") {
    return [
      {
        title: "Install Claude Code",
        command: "npm i -g @anthropic-ai/claude-code",
        detail: "Run this in Terminal. Homebrew installs work too after you quit and reopen Stage.",
      },
      {
        title: "Log in",
        command: "claude auth login",
        detail: "Finish the browser sign-in, then run claude auth status to confirm loggedIn is true.",
      },
      {
        title: "Refresh Stage",
        detail:
          "Quit Stage completely (Cmd+Q), reopen the app, open Settings → Integrations, and click Refresh.",
      },
    ];
  }

  return [
    {
      title: "Install Codex CLI",
      command: "npm i -g @openai/codex",
      detail: "Run this in Terminal.",
    },
    {
      title: "Sign in with ChatGPT",
      command: "codex",
      detail:
        "Open Codex in Terminal and sign in with your ChatGPT account. API key only is not enough for Research or Voice.",
    },
    {
      title: "Refresh Stage",
      detail:
        "Quit Stage completely (Cmd+Q), reopen the app, open Settings → Integrations, and click Refresh.",
    },
  ];
}

export function isProviderCliReady(provider: ProviderStatusRecord | undefined) {
  return Boolean(provider?.installed && provider.authenticated && provider.status === "ready");
}

export function providerCliSetupIssue(
  provider: ProviderStatusRecord | undefined,
): "missing" | "auth" | "ready" {
  if (!provider?.installed) {
    return "missing";
  }

  if (!provider.authenticated || provider.status !== "ready") {
    return "auth";
  }

  return "ready";
}

export function providerCliSetupHeadline(
  providerId: ProviderId,
  issue: ReturnType<typeof providerCliSetupIssue>,
) {
  const label = providerLabel(providerId);

  if (issue === "missing") {
    return `${label} CLI is not installed yet`;
  }

  if (issue === "auth") {
    return `${label} is installed but not logged in`;
  }

  return `${label} is ready to connect`;
}
