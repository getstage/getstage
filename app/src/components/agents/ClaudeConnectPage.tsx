import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { useDeveloperSettings } from "@/features/settings/useDeveloperSettings";
import { CLAUDE_INSTALL_COMMAND } from "@/features/settings/useIntegrationsSettings";

const PAGE_TITLE = "Connect Claude to Stage";
const PAGE_DESCRIPTION =
  "Connect Claude Code to your Stage workspace for AI-powered research, strategy, and generation.";

const CLAUDE_APP_URL = "https://claude.ai/new";

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
  const [copied, setCopied] = useState(false);
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

  async function handleContinueWithClaude() {
    await navigator.clipboard.writeText(fullSetupPrompt);
    setCopied(true);
    window.open(CLAUDE_APP_URL, "_blank");
    window.setTimeout(() => setCopied(false), 4000);
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

        <main className="mx-auto max-w-xl px-6 pb-20 pt-16">
          {/* Hero — just the Claude logo */}
          <section className="flex flex-col items-center text-center">
            <img
              src="/claude-full.svg"
              alt="Claude"
              className="h-9 sm:h-11"
            />
            <p className="mt-5 max-w-[400px] text-[16px] leading-[1.65] text-text-secondary">
              One prompt connects Claude to your Stage workspace.
            </p>
          </section>

          {/* Main card */}
          <section className="mt-8">
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
                  className="h-14 w-14 sm:h-16 sm:w-16"
                />

                <button
                  type="button"
                  onClick={() => void handleContinueWithClaude()}
                  className="mt-6 inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-accent text-[15px] font-semibold text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all hover:bg-accent-hover active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check size={18} weight="bold" />
                      Copied — opening Claude
                    </>
                  ) : (
                    <>
                      Continue with
                      <img src="/claude-full.svg" alt="Claude" className="h-[18px] brightness-0 invert" />
                      <ArrowRight size={18} weight="bold" />
                    </>
                  )}
                </button>

                <p className="mt-3 text-[13px] text-text-tertiary">
                  Copies the setup prompt and opens Claude.
                </p>
              </div>

              {/* Manual fallback */}
              <div className="mt-8 border-t border-border-subtle pt-5">
                <button
                  type="button"
                  onClick={() => setShowManual(!showManual)}
                  className="flex w-full cursor-pointer items-center justify-between text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  Or copy and paste in Claude Code
                  <span
                    className="inline-block text-[16px] transition-transform"
                    style={{ transform: showManual ? "rotate(90deg)" : "none" }}
                  >
                    &rsaquo;
                  </span>
                </button>

                {showManual ? (
                  <div className="mt-4 space-y-3">
                    <ManualCodeBlock
                      label="Install"
                      code={CLAUDE_INSTALL_COMMAND}
                    />
                    {envSnippet ? (
                      <ManualCodeBlock label="API key" code={envSnippet} />
                    ) : null}
                    {verificationPrompt ? (
                      <ManualCodeBlock label="Verify" code={verificationPrompt} />
                    ) : null}
                    {taskPrompt ? (
                      <ManualCodeBlock label="Task" code={taskPrompt} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Status bar */}
            <div className="mt-3 rounded-2xl border border-border-subtle bg-white px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isConnected ? "bg-[#22C55E]" : "animate-pulse bg-[#D9D9D9]"
                    }`}
                  />
                  <span className="text-[13px] font-medium text-text-primary">
                    {isConnected ? "Connected" : "Waiting for verification"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-text-tertiary">
                  <span className="flex items-center gap-1.5">
                    <img src="/notion.svg" alt="" className="h-3 w-3 opacity-60" />
                    {claudeState?.connection?.notionInClaude === "claimed" ? (
                      <span className="text-text-secondary">Connected</span>
                    ) : (
                      "Notion"
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <img src="/figma.svg" alt="" className="h-3 w-[8px] opacity-60" />
                    {claudeState?.connection?.figmaInClaude === "claimed" ? (
                      <span className="text-text-secondary">Connected</span>
                    ) : (
                      "Figma"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function ManualCodeBlock({
  label,
  code,
}: {
  label: string;
  code: string;
}) {
  const [wasCopied, setWasCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setWasCopied(true);
    window.setTimeout(() => setWasCopied(false), 1500);
  }

  return (
    <div className="rounded-xl bg-bg-subtle px-4 py-3">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
        {label}
      </div>
      <div className="flex items-start justify-between gap-3">
        <code className="min-w-0 whitespace-pre-wrap text-[13px] leading-[1.6] text-text-primary">
          {code}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="mt-0.5 shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-medium text-text-tertiary transition-colors hover:bg-white hover:text-text-secondary"
        >
          {wasCopied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
