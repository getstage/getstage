import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { Check, Copy, ArrowRight } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { useDeveloperSettings } from "@/features/settings/useDeveloperSettings";
import { CLAUDE_INSTALL_COMMAND } from "@/features/settings/useIntegrationsSettings";

const PAGE_TITLE = "Connect Claude to Stage";
const PAGE_DESCRIPTION =
  "Connect Claude Code to your Stage workspace for AI-powered research, strategy, and generation.";

function useSearchParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function buildVerificationPrompt(connectionId: string | null) {
  if (!connectionId) {
    return null;
  }

  return [
    "Use the installed Stage skill and verify Stage connectivity.",
    `Handshake connectionId "${connectionId}" with client "claude_code".`,
    "If Notion MCP is available set notionMcp=true.",
    "If Figma MCP is available set figmaMcp=true.",
    "Return a short success summary.",
  ].join(" ");
}

function buildFullSetupPrompt({
  installCommand,
  envSnippet,
  verificationPrompt,
}: {
  installCommand: string;
  envSnippet: string | null;
  verificationPrompt: string | null;
}) {
  const parts = [
    "Set up the Stage skill in this project.",
    "",
    `1. Run: ${installCommand}`,
  ];

  if (envSnippet) {
    parts.push(`2. Set the environment variable: ${envSnippet}`);
  }

  if (verificationPrompt) {
    parts.push(
      "",
      `${envSnippet ? "3" : "2"}. Then verify the connection:`,
      verificationPrompt,
    );
  }

  return parts.join("\n");
}

function buildTaskPrompt(search: URLSearchParams) {
  const projectId = search.get("projectId");
  const module = search.get("module");
  const runId = search.get("runId");
  const artifactId = search.get("artifactId");
  const provider = search.get("provider");
  const action = search.get("action");

  if (projectId && module && runId) {
    return [
      `Continue the Stage ${module} workflow for project "${projectId}".`,
      `Use runId "${runId}" as the primary Stage run identifier.`,
      "Read the project AI context and any existing artifacts first.",
      "Do the work inside Claude, then write the resulting artifact back to Stage.",
      "If the output is incomplete, keep the run in progress and explain what input is missing.",
    ].join(" ");
  }

  if (projectId && artifactId && provider && action) {
    return [
      `Continue the Stage export workflow for project "${projectId}".`,
      `Use artifactId "${artifactId}" and send it to "${provider}" with action "${action}".`,
      "Complete the external step in Claude, then mark the Stage export request with the latest status and destination URL if one exists.",
      "Return a short summary of what was exported.",
    ].join(" ");
  }

  return null;
}

export function ClaudeConnectPage() {
  const { isAuthenticated } = useAuth();
  const search = useSearchParams();
  const source = search.get("source") === "onboarding" ? "onboarding" : "settings";
  const claudeState = useQuery(api.agentConnections.getClaudeConnectionSummary, isAuthenticated ? {} : "skip");
  const createPendingConnection = useMutation(api.agentConnections.createPendingClaudeConnection);
  const developerSettings = useDeveloperSettings({ enabled: isAuthenticated });
  const [copied, setCopied] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || claudeState?.connection) {
      return;
    }

    void createPendingConnection({ source });
  }, [claudeState?.connection, createPendingConnection, isAuthenticated, source]);

  const connectionId = claudeState?.connection?.id ?? null;
  const revealedKey = developerSettings.revealedKey;
  const envSnippet = revealedKey ? `export STAGE_API_KEY=${revealedKey}` : null;
  const verificationPrompt = buildVerificationPrompt(connectionId);
  const taskPrompt = buildTaskPrompt(search);

  const fullSetupPrompt = buildFullSetupPrompt({
    installCommand: CLAUDE_INSTALL_COMMAND,
    envSnippet,
    verificationPrompt,
  });

  async function handleCopy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  }

  async function handleContinueWithClaude() {
    await navigator.clipboard.writeText(fullSetupPrompt);
    setCopied("full");
    window.setTimeout(() => setCopied(null), 3000);
  }

  const isConnected = claudeState?.connection?.stageApiVerified === true;
  const needsKey = isAuthenticated && !revealedKey;

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
      </Helmet>

      <div className="min-h-screen bg-bg text-text-primary">
        <header className="border-b border-border-subtle bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to="/" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-9 w-auto" />
            </Link>
            <div className="flex items-center gap-2.5">
              <Link
                to="/agents/skills"
                className="rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Agent Skills
              </Link>
              <Link
                to="/settings"
                className="rounded-xl bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 pb-20 pt-16">
          {/* Hero */}
          <section className="flex flex-col items-center text-center">
            <img
              src="/claude-full.svg"
              alt="Claude"
              className="h-8 sm:h-10"
            />
            <h1 className="mt-6 font-heading text-[36px] font-semibold leading-[1.08] tracking-[-0.8px] text-text-primary sm:text-[44px]">
              Connect Claude to Stage
            </h1>
            <p className="mt-4 max-w-[460px] text-[16px] leading-[1.65] text-text-secondary">
              One prompt sets up the Stage skill, connects your API key, and verifies
              that Claude can talk to your workspace.
            </p>
          </section>

          {/* Main card */}
          <section className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl border border-border-subtle bg-white p-8 sm:p-10">
              {/* Key creation (only if no key yet) */}
              {needsKey ? (
                <div className="mb-8">
                  <p className="text-[14px] font-medium text-text-primary">
                    First, create a Stage API key
                  </p>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    This key lets Claude authenticate with your workspace.
                  </p>
                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    <input
                      type="text"
                      className="w-full rounded-xl border border-transparent bg-input-bg px-4 py-2.5 text-[14px] text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-border focus:bg-white"
                      value={developerSettings.keyName}
                      onChange={(event) => developerSettings.setKeyName(event.target.value)}
                      placeholder="e.g. Claude Code"
                    />
                    <button
                      type="button"
                      className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={developerSettings.isCreating}
                      onClick={() => void developerSettings.handleCreate()}
                    >
                      {developerSettings.isCreating ? "Creating..." : "Create key"}
                    </button>
                  </div>
                  <div className="mt-6 border-t border-border-subtle" />
                </div>
              ) : null}

              {/* Continue with Claude CTA */}
              <div className="flex flex-col items-center text-center">
                <img
                  src="/claude.svg"
                  alt=""
                  className="h-16 w-16 sm:h-20 sm:w-20"
                />

                <button
                  type="button"
                  onClick={() => void handleContinueWithClaude()}
                  className="mt-6 inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-text-primary text-[15px] font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  {copied === "full" ? (
                    <>
                      <Check size={18} weight="bold" />
                      Copied — paste in Claude Code
                    </>
                  ) : (
                    <>
                      Continue with Claude
                      <ArrowRight size={18} weight="bold" />
                    </>
                  )}
                </button>

                <p className="mt-3 text-[13px] text-text-secondary">
                  Copies the full setup prompt to your clipboard.
                  <br />
                  Open Claude Code and paste to get started.
                </p>
              </div>

              {/* Manual alternative */}
              <div className="mt-8 border-t border-border-subtle pt-6">
                <button
                  type="button"
                  onClick={() => setShowManual(!showManual)}
                  className="flex w-full cursor-pointer items-center justify-between text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  Or set up manually
                  <span className={`text-[12px] transition-transform ${showManual ? "rotate-90" : ""}`}>
                    &rsaquo;
                  </span>
                </button>

                {showManual ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="mb-2 text-[13px] font-medium text-text-primary">
                        Install the Stage skill
                      </p>
                      <CodeBlock
                        code={CLAUDE_INSTALL_COMMAND}
                        copied={copied === "install"}
                        onCopy={() => void handleCopy(CLAUDE_INSTALL_COMMAND, "install")}
                      />
                    </div>

                    {envSnippet ? (
                      <div>
                        <p className="mb-2 text-[13px] font-medium text-text-primary">
                          Set your API key
                        </p>
                        <CodeBlock
                          code={envSnippet}
                          copied={copied === "env"}
                          onCopy={() => void handleCopy(envSnippet, "env")}
                        />
                      </div>
                    ) : null}

                    {verificationPrompt ? (
                      <div>
                        <p className="mb-2 text-[13px] font-medium text-text-primary">
                          Verify the connection
                        </p>
                        <CodeBlock
                          code={verificationPrompt}
                          copied={copied === "verify"}
                          onCopy={() => void handleCopy(verificationPrompt, "verify")}
                        />
                      </div>
                    ) : null}

                    {taskPrompt ? (
                      <div>
                        <p className="mb-2 text-[13px] font-medium text-text-primary">
                          Continue your task
                        </p>
                        <CodeBlock
                          code={taskPrompt}
                          copied={copied === "task"}
                          onCopy={() => void handleCopy(taskPrompt, "task")}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Status bar */}
            <div className="mt-4 rounded-2xl border border-border-subtle bg-white px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isConnected ? "bg-[#22C55E]" : "animate-pulse bg-[#D9D9D9]"
                    }`}
                  />
                  <span className="text-[14px] font-medium text-text-primary">
                    {isConnected ? "Connected" : "Waiting for verification"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[13px] text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <img src="/notion.svg" alt="" className="h-3.5 w-3.5" />
                    {claudeState?.connection?.notionInClaude === "claimed" ? (
                      <span className="text-text-primary">Notion connected</span>
                    ) : (
                      "Notion"
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <img src="/figma.svg" alt="" className="h-3.5 w-[10px]" />
                    {claudeState?.connection?.figmaInClaude === "claimed" ? (
                      <span className="text-text-primary">Figma connected</span>
                    ) : (
                      "Figma"
                    )}
                  </span>
                  {claudeState?.connection?.lastHandshakeAt ? (
                    <span>
                      Synced {formatTimestamp(claudeState.connection.lastHandshakeAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function CodeBlock({
  code,
  copied,
  onCopy,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl bg-[#1e1e2e] px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <code className="min-w-0 whitespace-pre-wrap text-[13px] leading-[1.65] text-[#cdd6f4]">
          {code}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-transparent px-2 py-1 text-[12px] font-medium text-[#cdd6f4]/70 transition-colors hover:bg-white/5 hover:text-[#cdd6f4]"
        >
          {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function formatTimestamp(value: number | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
