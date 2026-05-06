import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CopySimple, CaretDown, Key } from "@phosphor-icons/react";
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
    "Set up the Stage agent skill so you can operate Stage on my behalf.",
    "Stage is an AI-powered project management tool. The skill file teaches you the full API, action policy, and the research → strategy → generate → delivery workflow.",
    "",
    "## Step 1 — Install the skill",
    "",
    `Run this command to install the Stage skill into your workspace:`,
    "",
    `\`\`\``,
    installCommand,
    `\`\`\``,
    "",
    "This downloads the SKILL.md file which contains every endpoint, action classification, and workflow rule you need.",
    "",
    "## Step 2 — Authenticate",
    "",
  ];

  if (envSnippet) {
    parts.push(
      "Set this environment variable so your API calls are authenticated:",
      "",
      `\`\`\``,
      envSnippet,
      `\`\`\``,
      "",
      "The key format is `stg_...` and uses Bearer auth: `Authorization: Bearer stg_...`",
    );
  } else {
    parts.push(
      "You need a Stage API key to authenticate. Create one in Stage under Settings → Developer.",
      "Once you have the key, set it as an environment variable:",
      "",
      `\`\`\``,
      "export STAGE_API_KEY=stg_your_key_here",
      `\`\`\``,
      "",
      "The key uses Bearer auth: `Authorization: Bearer stg_...`",
    );
  }

  if (verificationPrompt) {
    parts.push(
      "",
      "## Step 3 — Verify the connection",
      "",
      verificationPrompt,
      "",
      "This confirms Stage can receive calls from Claude and registers your MCP capabilities (Notion, Figma).",
    );
  }

  parts.push(
    "",
    "## What you can do after setup",
    "",
    "- Read projects, phases, and tasks from Stage",
    "- Create new projects using `POST /api/v1/projects/import-plan` with structured phases and tasks",
    "- Run research, strategy, and content generation workflows",
    "- Write artifacts back to Stage and export to Notion or Figma",
    "- Toggle task completion and update project state",
    "",
    "Always create the project in Stage first before doing research or design work. Stage is the source of truth.",
  );

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

function buildConnectedPrompt(taskPrompt: string | null) {
  const parts = [
    "Stage is already connected to my workspace in Claude.",
    "Use the installed Stage skill to operate Stage on my behalf.",
  ];

  if (taskPrompt) {
    parts.push("", taskPrompt);
  } else {
    parts.push("", "Start from the existing Stage connection and continue working without reinstalling or re-authenticating.");
  }

  return parts.join("\n");
}

export function ClaudeConnectPage() {
  const { isAuthenticated, user } = useAuth();
  const search = useSearchParams();
  const source = search.get("source") === "onboarding" ? "onboarding" : "settings";
  const claudeState = useQuery(api.agentConnections.getClaudeConnectionSummary, isAuthenticated ? {} : "skip");
  const createPendingConnection = useMutation(api.agentConnections.createPendingClaudeConnection);
  const developerSettings = useDeveloperSettings({ enabled: isAuthenticated });
  const [copied, setCopied] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const isPro = user?.plan === "pro";

  useEffect(() => {
    if (!isAuthenticated || !isPro || claudeState?.connection) {
      return;
    }

    void createPendingConnection({ source });
  }, [claudeState?.connection, createPendingConnection, isAuthenticated, isPro, source]);

  const connectionId = claudeState?.connection?.id ?? null;
  const revealedKey = developerSettings.revealedKey;
  const hasExistingKeys = developerSettings.keys.length > 0;
  const envSnippet = revealedKey ? `export STAGE_API_KEY=${revealedKey}` : null;
  const verificationPrompt = buildVerificationPrompt(connectionId);
  const taskPrompt = buildTaskPrompt(search);
  const isConnected = claudeState?.connection?.stageApiVerified === true;
  const connectedPrompt = buildConnectedPrompt(taskPrompt);

  const fullSetupPrompt = buildFullSetupPrompt({
    installCommand: CLAUDE_INSTALL_COMMAND,
    envSnippet,
    verificationPrompt,
  });

  const primaryPrompt = isConnected ? connectedPrompt : fullSetupPrompt;

  async function handleContinueWithClaude() {
    await navigator.clipboard.writeText(primaryPrompt);
    setCopied(true);
    window.setTimeout(() => {
      window.open(CLAUDE_APP_URL, "_blank");
    }, 1200);
    window.setTimeout(() => setCopied(false), 4000);
  }

  const needsKey = isAuthenticated && isPro && !isConnected && !revealedKey && !hasExistingKeys;
  const shouldShowReconnectNote = isAuthenticated && isPro && !isConnected && hasExistingKeys && !revealedKey;

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
      </Helmet>

      <div className="min-h-screen bg-bg text-text-primary">
        {/* Navbar — mirrors the Stage navbar pattern exactly */}
        <header className="h-[64px] border-b border-border-subtle bg-white">
          <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 sm:px-10 lg:px-14">
            <Link to="/" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/agents/skills"
                className="rounded-[10px] border border-border bg-white px-4 py-2 text-[14px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
              >
                Agent Skills
              </Link>
              <Link
                to="/settings"
                className="rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white transition-all duration-150 hover:bg-accent-hover"
              >
                Settings
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[520px] px-6 pb-24 pt-16 sm:px-0">
          {/* Hero — brand lockup centered */}
          <div className="flex flex-col items-center text-center">
            <img src="/logos/integrations/claude-full.svg" alt="Claude" className="h-[38px]" />
            <p className="mt-4 text-[15px] leading-[1.6] text-text-secondary">
              {isConnected
                ? "Claude is already connected to your Stage workspace."
                : "One prompt connects Claude to your Stage workspace."}
            </p>
          </div>

          {/* Main card */}
          <div className="mt-8 rounded-[14px] border border-border bg-white">
            {/* API key section — only if needed */}
            {!isPro ? (
              <div className="border-b border-border-subtle px-6 py-6">
                <p className="text-[14px] font-medium text-text-primary">
                  Stage API keys require Pro
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Upgrade in Settings → Plan & Billing before you connect Claude. The verification flow depends on a Stage API key from Developer settings.
                </p>
                <div className="mt-4">
                  <Link
                    to="/settings"
                    search={{ tab: "billing" }}
                    className="inline-flex h-10 items-center justify-center rounded-[10px] bg-accent px-4 text-[14px] font-medium text-white transition-all duration-150 hover:bg-accent-hover"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            ) : null}

            {needsKey ? (
              <div className="border-b border-border-subtle px-6 py-6">
                <p className="text-[14px] font-medium text-text-primary">
                  Create a Stage API key
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Claude needs a key to authenticate with your workspace.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    className="h-11 w-full rounded-lg border border-border bg-white px-3.5 text-[15px] text-text-primary transition-colors duration-200 outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-1 focus:ring-accent/20"
                    value={developerSettings.keyName}
                    onChange={(event) => developerSettings.setKeyName(event.target.value)}
                    placeholder="e.g. Claude Code"
                  />
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-accent text-white transition-all duration-150 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
                    disabled={developerSettings.isCreating}
                    onClick={() => void developerSettings.handleCreate()}
                    aria-label="Create API key"
                  >
                    {developerSettings.isCreating ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <Key size={18} weight="bold" />
                    )}
                  </button>
                </div>
              </div>
            ) : null}

            {shouldShowReconnectNote ? (
              <div className="border-b border-border-subtle px-6 py-6">
                <p className="text-[14px] font-medium text-text-primary">
                  Use an existing API key or create a fresh one
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Stage already has API keys on file for this workspace, but keys are only shown once at creation. If you still have one saved locally, use that. Otherwise create a fresh key in Settings → Developer.
                </p>
              </div>
            ) : null}

            {/* Primary CTA */}
            <div className="flex flex-col items-center px-6 py-8">
              <img src="/logos/integrations/claude.svg" alt="" className="h-12 w-12" />

              {isConnected ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#22C55E]/10 px-3 py-1 text-[12px] font-medium text-[#15803D]">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                  Connected
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleContinueWithClaude()}
                className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#D97757]/18 bg-[#D97757]/[0.06] text-[15px] font-medium text-text-primary transition-all duration-150 hover:bg-[#D97757]/[0.11] active:bg-[#D97757]/[0.15] disabled:pointer-events-none disabled:opacity-40"
                disabled={!isPro}
              >
                {copied ? (
                  <>
                    <Check size={15} weight="bold" className="text-[#22C55E]" />
                    Copied — opening Claude
                  </>
                ) : (
                  <>
                    {isConnected ? "Open" : "Continue with"}
                    <img src="/logos/integrations/claude-full.svg" alt="Claude" className="h-[15px]" />
                    <ArrowRight size={14} weight="bold" className="text-text-tertiary" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(primaryPrompt);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2500);
                }}
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#D97757]/15 bg-[#D97757]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#D97757] transition-all duration-150 hover:bg-[#D97757]/[0.09]"
                disabled={!isPro}
              >
                <CopySimple size={12} weight="bold" />
                {copied ? "Copied!" : isConnected ? "Copy working prompt" : "Copy Claude prompt"}
              </button>

              <p className="mt-2.5 text-[13px] text-text-tertiary">
                {isPro
                  ? isConnected
                    ? "Opens a fresh Claude session using your existing Stage connection."
                    : "Copies the setup prompt and opens Claude."
                  : "Upgrade first to create a Stage API key and finish setup."}
              </p>
            </div>

            {/* Manual fallback */}
            <div className="border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-[13px] font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
              >
                Or copy and paste in Claude Code
                <CaretDown
                  size={14}
                  weight="bold"
                  className={`text-text-tertiary transition-transform duration-200 ${showManual ? "rotate-180" : ""}`}
                />
              </button>

              {showManual ? (
                <div className="space-y-3 px-6 pb-6">
                  {isConnected ? (
                    <CommandBlock label="Prompt" code={primaryPrompt} />
                  ) : (
                    <>
                      <CommandBlock
                        label="Install"
                        code={CLAUDE_INSTALL_COMMAND}
                      />
                      {envSnippet ? (
                        <CommandBlock label="API key" code={envSnippet} />
                      ) : null}
                      {verificationPrompt ? (
                        <CommandBlock label="Verify" code={verificationPrompt} />
                      ) : null}
                      {taskPrompt ? (
                        <CommandBlock label="Task" code={taskPrompt} />
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Status strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border-subtle px-5 py-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full ${
                  isConnected ? "bg-success" : "bg-border"
                }`}
              />
              <span className="text-[13px] font-medium text-text-primary">
                {isConnected ? "Connected" : "Waiting for verification"}
              </span>
            </div>
            <div className="flex items-center gap-3.5 text-[12px] text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <img src="/logos/integrations/notion.svg" alt="" className="h-3 w-3 opacity-40" />
                {claudeState?.connection?.notionInClaude === "claimed"
                  ? "Connected"
                  : "Notion"}
              </span>
              <span className="flex items-center gap-1.5">
                <img src="/logos/integrations/figma.svg" alt="" className="h-3 w-[8px] opacity-40" />
                {claudeState?.connection?.figmaInClaude === "claimed"
                  ? "Connected"
                  : "Figma"}
              </span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function CommandBlock({ label, code }: { label: string; code: string }) {
  const [wasCopied, setWasCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setWasCopied(true);
    window.setTimeout(() => setWasCopied(false), 1500);
  }

  return (
    <div className="rounded-[10px] border border-[#8782F5]/12 bg-[#F8F7FF] px-4 py-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-[#8782F5]/60">
        {label}
      </div>
      <div className="flex items-start justify-between gap-4">
        <code className="min-w-0 whitespace-pre-wrap font-body text-[13px] leading-[1.55] text-text-primary">
          {code}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="mt-0.5 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary transition-colors duration-150 hover:bg-white hover:text-text-secondary"
        >
          {wasCopied ? <Check size={11} weight="bold" /> : <CopySimple size={11} />}
          {wasCopied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
