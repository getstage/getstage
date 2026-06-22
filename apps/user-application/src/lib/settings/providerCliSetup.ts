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
        command: "curl -fsSL https://claude.ai/install.sh | bash",
        detail: "Run this in Terminal. This is Claude's recommended native installer.",
      },
      {
        title: "Log in",
        command: "claude auth login",
        detail: "Finish the browser sign-in, then run `claude auth status` to confirm loggedIn is true.",
      },
      {
        title: "Refresh status",
        detail: "Return to Stage, open Settings → Integrations, and click Refresh.",
      },
    ];
  }

  return [
    {
      title: "Install Codex CLI",
      command: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
      detail: "Run this in Terminal. This is Codex's standalone installer for macOS and Linux.",
    },
    {
      title: "Sign in with ChatGPT",
      command: "codex",
      detail:
        "Open Codex in Terminal and sign in with your ChatGPT account. API key only is not enough for Research or Voice.",
    },
    {
      title: "Refresh status",
      detail: "Return to Stage, open Settings → Integrations, and click Refresh.",
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
