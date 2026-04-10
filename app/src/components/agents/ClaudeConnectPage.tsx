import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { Check, Copy } from "@phosphor-icons/react";
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
    return "Open the Stage Claude setup page again after the pending connection is created.";
  }

  return [
    "Use the installed Stage skill and verify Stage connectivity.",
    `Handshake connectionId "${connectionId}" with client "claude_code".`,
    "If Notion MCP is available set notionMcp=true.",
    "If Figma MCP is available set figmaMcp=true.",
    "Return a short success summary.",
  ].join(" ");
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

  useEffect(() => {
    if (!isAuthenticated || claudeState?.connection) {
      return;
    }

    void createPendingConnection({ source });
  }, [claudeState?.connection, createPendingConnection, isAuthenticated, source]);

  const connectionId = claudeState?.connection?.id ?? null;
  const verificationPrompt = buildVerificationPrompt(connectionId);
  const taskPrompt = buildTaskPrompt(search);
  const revealedKey = developerSettings.revealedKey;
  const envSnippet = revealedKey ? `export STAGE_API_KEY=${revealedKey}` : "export STAGE_API_KEY=stg_...";

  async function handleCopy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const isConnected = claudeState?.connection?.stageApiVerified === true;

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

        <main className="mx-auto max-w-5xl px-6 pb-20 pt-12">
          <section className="max-w-2xl">
            <p className="flex items-center gap-2 text-[13px] font-medium text-text-secondary">
              <img src="/claude.svg" alt="" className="h-4 w-4" />
              Setup
            </p>
            <h1 className="mt-3 font-heading text-[36px] font-semibold leading-[1.08] tracking-[-0.8px] text-text-primary sm:text-[44px]">
              Connect Claude to Stage
            </h1>
            <p className="mt-4 max-w-[520px] text-[16px] leading-[1.65] text-text-secondary">
              Follow these steps to link Claude Code with your Stage workspace.
              Once verified, all AI workflows run through Claude.
            </p>
          </section>

          <section className="mt-10 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <StepCard
                number={1}
                title="Create a Stage API key"
                description="Generate a dedicated key for Claude Code."
              >
                {isAuthenticated ? (
                  <>
                    {!revealedKey ? (
                      <div className="flex flex-col gap-2.5 sm:flex-row">
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
                    ) : null}
                    <CodeBlock
                      code={envSnippet}
                      copied={copied === "env"}
                      onCopy={() => void handleCopy(envSnippet, "env")}
                    />
                  </>
                ) : (
                  <p className="text-[14px] text-text-secondary">
                    Sign in to Stage first to generate an API key.
                  </p>
                )}
              </StepCard>

              <StepCard
                number={2}
                title="Install the Stage skill"
                description="Run this command in Claude Code."
              >
                <CodeBlock
                  code={CLAUDE_INSTALL_COMMAND}
                  copied={copied === "install"}
                  onCopy={() => void handleCopy(CLAUDE_INSTALL_COMMAND, "install")}
                />
              </StepCard>

              <StepCard
                number={3}
                title="Connect Notion"
                description="Enable the Notion MCP in Claude so Stage can export research and strategy docs."
              >
                <p className="text-[14px] leading-[1.6] text-text-secondary">
                  Once Notion is available in Claude, the verification step will detect it automatically.
                </p>
              </StepCard>

              <StepCard
                number={4}
                title="Connect Figma"
                description="Enable Figma tooling in Claude for design iteration and generation."
              >
                <p className="text-[14px] leading-[1.6] text-text-secondary">
                  Figma availability is detected automatically during verification.
                </p>
              </StepCard>

              <StepCard
                number={5}
                title="Verify the connection"
                description="Paste this prompt into Claude after completing the steps above."
              >
                <CodeBlock
                  code={verificationPrompt}
                  copied={copied === "verify"}
                  onCopy={() => void handleCopy(verificationPrompt, "verify")}
                />
              </StepCard>

              {taskPrompt ? (
                <StepCard
                  number={6}
                  title="Continue your task"
                  description="This prompt continues the workflow that brought you here."
                >
                  <CodeBlock
                    code={taskPrompt}
                    copied={copied === "task"}
                    onCopy={() => void handleCopy(taskPrompt, "task")}
                  />
                </StepCard>
              ) : null}
            </div>

            <div className="space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-border-subtle bg-white p-6">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      isConnected ? "bg-[#22C55E]" : "animate-pulse bg-[#D9D9D9]"
                    }`}
                  />
                  <span className="font-heading text-[20px] font-semibold text-text-primary">
                    {isConnected ? "Connected" : "Waiting for verification"}
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-[13px]">
                  <StatusRow
                    label="Notion"
                    value={claudeState?.connection?.notionInClaude === "claimed" ? "Connected" : "Not detected"}
                    active={claudeState?.connection?.notionInClaude === "claimed"}
                  />
                  <StatusRow
                    label="Figma"
                    value={claudeState?.connection?.figmaInClaude === "claimed" ? "Connected" : "Not detected"}
                    active={claudeState?.connection?.figmaInClaude === "claimed"}
                  />
                  <StatusRow
                    label="Last sync"
                    value={formatTimestamp(claudeState?.connection?.lastHandshakeAt ?? null)}
                    active={Boolean(claudeState?.connection?.lastHandshakeAt)}
                  />
                </div>

                <a
                  href="/settings"
                  className="mt-5 inline-flex items-center text-[13px] font-medium text-accent transition-colors hover:text-accent-hover"
                >
                  Open settings &rarr;
                </a>
              </div>

              <div className="rounded-2xl border border-border-subtle bg-white p-6">
                <div className="font-heading text-[17px] font-semibold text-text-primary">
                  What happens next
                </div>
                <ul className="mt-4 space-y-2.5 text-[14px] leading-[1.6] text-text-secondary">
                  <li className="flex gap-2.5">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                    Research, strategy, and generate workflows run through Claude.
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                    Stage tracks run state, artifacts, approvals, and export history.
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-text-tertiary" />
                    Notion and Figma stay connected through Claude&apos;s native integrations.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function StepCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-[13px] font-semibold text-accent">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
          <p className="mt-1 text-[14px] leading-[1.5] text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="mt-4 pl-[38px]">{children}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className={`flex items-center gap-1.5 ${active ? "text-text-primary" : "text-text-tertiary"}`}>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> : null}
        {value}
      </span>
    </div>
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
