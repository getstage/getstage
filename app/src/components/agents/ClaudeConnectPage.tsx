import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Key, Terminal } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { useDeveloperSettings } from "@/features/settings/useDeveloperSettings";
import { CLAUDE_INSTALL_COMMAND } from "@/features/settings/useIntegrationsSettings";

const PAGE_TITLE = "Connect Claude to Stage";
const PAGE_DESCRIPTION =
  "Install the Stage skill into Claude Code, create a Stage API key, and verify the Claude connection.";

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

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
      </Helmet>

      <div className="min-h-screen bg-bg text-text-primary">
        <header className="border-b border-border-subtle bg-white/88 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
            <Link to="/" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/agents/skills"
                className="rounded-[14px] border border-border bg-white px-5 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Agent Skills
              </Link>
              <Link
                to="/settings"
                className="rounded-[14px] bg-accent px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-20 pt-14 sm:px-10">
          <section className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(13,148,136,0.16)] bg-[rgba(13,148,136,0.10)] px-4 py-2 text-[13px] font-medium text-text-primary">
              <img src="/claude.svg" alt="" className="h-4 w-4" />
              Claude Code setup
            </div>

            <h1 className="mt-6 font-heading text-[42px] font-semibold leading-[1.06] tracking-[-1.2px] text-text-primary sm:text-[52px]">
              Connect Claude to Stage
            </h1>
            <p className="mt-5 max-w-[620px] text-[17px] leading-[1.75] text-text-secondary">
              Install the Stage skill, create a Stage API key, connect Notion and Figma inside
              Claude, then run the verification prompt so Stage can confirm the connection.
            </p>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <SetupCard
                icon={<Key size={18} weight="bold" />}
                title="1. Create a Stage API key"
                description="Create a dedicated API key for Claude Code. Keys are shown once."
              >
                {isAuthenticated ? (
                  <>
                    {!revealedKey ? (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[14px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
                          value={developerSettings.keyName}
                          onChange={(event) => developerSettings.setKeyName(event.target.value)}
                          placeholder="e.g. Claude Code"
                        />
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-[10px] bg-accent px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={developerSettings.isCreating}
                          onClick={() => void developerSettings.handleCreate()}
                        >
                          {developerSettings.isCreating ? "Creating..." : "Create key"}
                        </button>
                      </div>
                    ) : null}
                    <CodeBlock
                      label="Environment variable"
                      code={envSnippet}
                      copied={copied === "env"}
                      onCopy={() => void handleCopy(envSnippet, "env")}
                    />
                  </>
                ) : (
                  <p className="text-[14px] leading-[1.6] text-text-secondary">
                    Sign in to Stage first so this page can create a dedicated API key for you.
                  </p>
                )}
              </SetupCard>

              <SetupCard
                icon={<Terminal size={18} weight="bold" />}
                title="2. Install the Stage skill"
                description="Run this in Claude Code to install the Stage skill."
              >
                <CodeBlock
                  label="Install"
                  code={CLAUDE_INSTALL_COMMAND}
                  copied={copied === "install"}
                  onCopy={() => void handleCopy(CLAUDE_INSTALL_COMMAND, "install")}
                />
              </SetupCard>

              <SetupCard
                icon={<img src="/notion.svg" alt="" className="h-4 w-4" />}
                title="3. Connect Notion in Claude"
                description="Use Claude's Notion MCP connection flow so Claude can export research and strategy docs."
              >
                <p className="text-[14px] leading-[1.7] text-text-secondary">
                  After Notion is available inside Claude, Stage will mark it as available when you
                  run the verification prompt.
                </p>
              </SetupCard>

              <SetupCard
                icon={<img src="/figma.svg" alt="" className="h-4 w-4" />}
                title="4. Connect Figma in Claude"
                description="Use Claude's Figma tooling so Claude can open and iterate generated outputs."
              >
                <p className="text-[14px] leading-[1.7] text-text-secondary">
                  Figma availability is tracked through Claude. Stage does not use direct Figma OAuth in V1.
                </p>
              </SetupCard>

              <SetupCard
                icon={<ArrowRight size={18} weight="bold" />}
                title="5. Run the verification prompt"
                description="Paste this into Claude after the skill and API key are ready."
              >
                <CodeBlock
                  label="Verify"
                  code={verificationPrompt}
                  copied={copied === "verify"}
                  onCopy={() => void handleCopy(verificationPrompt, "verify")}
                />
              </SetupCard>

              {taskPrompt ? (
                <SetupCard
                  icon={<Terminal size={18} weight="bold" />}
                  title="6. Continue the active Stage task"
                  description="This prompt matches the research, strategy, generate, or export action that opened this page."
                >
                  <CodeBlock
                    label="Task prompt"
                    code={taskPrompt}
                    copied={copied === "task"}
                    onCopy={() => void handleCopy(taskPrompt, "task")}
                  />
                </SetupCard>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="rounded-[24px] border border-border-subtle bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                      Live status
                    </div>
                    <div className="mt-1 font-heading text-[24px] font-semibold text-text-primary">
                      {claudeState?.connection?.stageApiVerified ? "Connected" : "Waiting for verification"}
                    </div>
                  </div>
                  <span className="rounded-full bg-bg-subtle px-3 py-1 text-[12px] font-medium text-text-secondary">
                    {source}
                  </span>
                </div>

                <div className="mt-5 space-y-2 text-[14px] text-text-secondary">
                  <div>
                    Connection ID: <span className="text-text-primary">{connectionId ?? "Preparing..."}</span>
                  </div>
                  <div>
                    Notion in Claude:{" "}
                    <span className="text-text-primary">
                      {claudeState?.connection?.notionInClaude === "claimed" ? "Available" : "Unknown"}
                    </span>
                  </div>
                  <div>
                    Figma in Claude:{" "}
                    <span className="text-text-primary">
                      {claudeState?.connection?.figmaInClaude === "claimed" ? "Available" : "Unknown"}
                    </span>
                  </div>
                  <div>
                    Last handshake:{" "}
                    <span className="text-text-primary">
                      {formatTimestamp(claudeState?.connection?.lastHandshakeAt ?? null)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-border-subtle bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
                <div className="font-heading text-[20px] font-semibold text-text-primary">
                  What happens next
                </div>
                <ul className="mt-4 space-y-3 text-[14px] leading-[1.7] text-text-secondary">
                  <li>Research, strategy, and generate runs will launch through Claude.</li>
                  <li>Stage stores run state, artifacts, approvals, and export history.</li>
                  <li>Notion and Figma stay Claude-connected in V1. Direct Stage OAuth comes later.</li>
                </ul>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function SetupCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border-subtle bg-white p-6 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(13,148,136,0.10)] text-[#0d9488]">
          {icon}
        </span>
        <div>
          <h2 className="font-heading text-[20px] font-semibold text-text-primary">{title}</h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function CodeBlock({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-[16px] bg-[#1e1e2e] px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6c7086]">
          {label}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 text-[12px] font-medium text-[#cdd6f4]"
        >
          {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="block whitespace-pre-wrap text-[13px] leading-[1.7] text-[#cdd6f4]">{code}</code>
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
