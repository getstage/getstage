import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CopySimple,
  Terminal,
  FileCode,
} from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useState } from "react";

const PAGE_TITLE = "Agent Skills for Stage";
const PAGE_DESCRIPTION =
  "Install the Stage skill into Claude Code or any compatible agent. It teaches the agent Stage's API, action policy, and the research-to-strategy-to-generate workflow.";

const INSTALL_COMMAND = "npx skills add getstage/agent-mode";

const SUPPORTED_CLIENTS = [
  {
    name: "Claude Code",
    description: "Install via the CLI and the skill is available immediately.",
  },
  {
    name: "Cursor",
    description:
      "Drop the skill file into your workspace rules or project context.",
  },
  {
    name: "Windsurf",
    description: "Add the skill file to your project context for agent access.",
  },
  {
    name: "Any MCP-compatible client",
    description:
      "Use the skill file as context for any agent that supports tool use.",
  },
];

const SETUP_STEPS = [
  {
    step: "1",
    title: "Install the skill",
    description:
      "Run the install command to add the Stage skill to your agent workspace. Or download the skill file manually.",
    code: INSTALL_COMMAND,
    codeLabel: "Install",
    color: "rgba(13,148,136,0.10)",
    border: "rgba(13,148,136,0.16)",
  },
  {
    step: "2",
    title: "Add your API key",
    description:
      "Go to Settings > Developer in Stage and generate an API key. Set it as an environment variable or pass it in your agent config.",
    code: "export STAGE_API_KEY=stg_a1b2c3d4e5f6…",
    codeLabel: "Environment variable",
    color: "rgba(135,130,245,0.10)",
    border: "rgba(135,130,245,0.16)",
  },
  {
    step: "3",
    title: "Create a project first",
    description:
      "Tell your agent to create or import the project in Stage first. Stage stays the source of truth before research or design work starts.",
    code: '"Set up a website project for Lumen Apps with discovery, strategy, and delivery phases"',
    codeLabel: "Example prompt",
    color: "rgba(135,130,245,0.10)",
    border: "rgba(135,130,245,0.16)",
  },
  {
    step: "4",
    title: "Run the workflow in Claude",
    description:
      "After the project exists, use Claude to run research, strategy, generate, and Claude-mediated exports while writing the state back into Stage.",
    code: '"Research this client, generate strategy sections, then add the summary to Notion"',
    codeLabel: "Example prompt",
    color: "rgba(59,175,218,0.10)",
    border: "rgba(59,175,218,0.18)",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-text-tertiary transition-colors hover:text-text-secondary"
    >
      {copied ? <Check size={14} weight="bold" /> : <CopySimple size={14} />}
    </button>
  );
}

export function SkillsPage() {
  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen overflow-hidden bg-bg text-text-primary">
        {/* Ambient blurs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-140px] top-[120px] h-[320px] w-[320px] rounded-full bg-[rgba(13,148,136,0.10)] blur-3xl" />
          <div className="absolute right-[-120px] top-[220px] h-[320px] w-[320px] rounded-full bg-[rgba(135,130,245,0.08)] blur-3xl" />
          <div className="absolute left-[42%] top-[760px] h-[260px] w-[260px] rounded-full bg-[rgba(59,175,218,0.08)] blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative border-b border-border-subtle bg-white/88 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-10 sm:py-5">
            <Link to="/" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/agents"
                className="rounded-[14px] border border-border bg-white px-5 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                All integrations
              </Link>
              <Link
                to="/docs"
                className="rounded-[14px] bg-accent px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                API Docs
              </Link>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-10 sm:pt-16">
          {/* Hero */}
          <section className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(13,148,136,0.16)] bg-[rgba(13,148,136,0.10)] px-4 py-2 text-[13px] font-medium text-text-primary">
              <FileCode size={16} weight="bold" />
              Agent skill file
            </div>

            <h1 className="mt-6 max-w-[600px] font-heading text-[42px] font-semibold leading-[1.06] tracking-[-1.2px] text-text-primary sm:text-[52px]">
              Teach your agent how to operate Stage
            </h1>

            <p className="mt-5 max-w-[540px] text-[17px] leading-[1.75] text-text-secondary">
              Install the Stage skill from GitHub and your agent learns the API, action
              policy, and the full workflow from project setup to research, strategy,
              generate, and delivery. Stage stores the truth. Claude does the work.
            </p>

            {/* Primary CTA: install command */}
            <div className="mt-8 max-w-lg">
              <div className="relative rounded-[16px] border border-[#8782F5]/12 bg-[#F8F7FF] px-5 py-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8782F5]/60">
                  Install
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Terminal
                      size={14}
                      weight="bold"
                      className="text-accent"
                    />
                    <code className="text-[14px] leading-[1.6] text-text-primary">
                      {INSTALL_COMMAND}
                    </code>
                  </div>
                  <CopyButton text={INSTALL_COMMAND} />
                </div>
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="mt-4 flex flex-wrap gap-4">
              <a
                href="/SKILL.md"
                className="inline-flex items-center gap-2 rounded-[16px] border border-border bg-white px-6 py-4 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Download SKILL.md manually
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>
          </section>

          {/* Setup steps */}
          <section className="mt-20">
            <div className="text-center">
              <h2 className="font-heading text-[32px] font-semibold tracking-[-0.04em] text-text-primary">
                Setup
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[16px] leading-[1.7] text-text-secondary">
                Install, authenticate, and let your agent start building
                projects.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
              {SETUP_STEPS.map((step) => (
                <div
                  key={step.step}
                  className="rounded-[24px] border bg-white p-6 shadow-[0_12px_30px_rgba(17,24,39,0.04)]"
                  style={{ borderColor: step.border }}
                >
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-text-primary"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.step}
                  </span>
                  <h3 className="mt-4 font-heading text-[18px] font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.7] text-text-secondary">
                    {step.description}
                  </p>
                  <div
                    className="mt-4 rounded-[12px] border px-4 py-3"
                    style={{ borderColor: step.border, backgroundColor: step.color }}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
                        {step.codeLabel}
                      </span>
                      <CopyButton text={step.code} />
                    </div>
                    <code className="text-[12px] leading-[1.6] text-text-primary">
                      {step.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Supported clients */}
          <section className="mt-20 rounded-[30px] border border-border-subtle bg-white p-8 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(13,148,136,0.10)] text-[#0d9488]">
                <Terminal size={20} weight="bold" />
              </span>
              <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
                Supported clients
              </h2>
            </div>
            <p className="mt-3 max-w-[540px] text-[15px] leading-[1.7] text-text-secondary">
              The skill file works with any agent that can read context files.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {SUPPORTED_CLIENTS.map((client) => (
                <div
                  key={client.name}
                  className="rounded-[18px] bg-[rgba(13,148,136,0.05)] px-5 py-4"
                >
                  <span className="text-[14px] font-semibold text-[#0d9488]">
                    {client.name}
                  </span>
                  <p className="mt-1 text-[13px] leading-[1.6] text-text-secondary">
                    {client.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What the skill teaches */}
          <section className="mt-20">
            <div className="text-center">
              <h2 className="font-heading text-[32px] font-semibold tracking-[-0.04em] text-text-primary">
                What the skill teaches
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[16px] leading-[1.7] text-text-secondary">
                The skill file gives your agent a complete understanding of
                Stage.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Action policy",
                  desc: "Read, Create, Update, and Destructive action classification with safety rules.",
                  color: "#0d9488",
                  bg: "rgba(13,148,136,0.08)",
                },
                {
                  title: "API endpoints",
                  desc: "Every Stage endpoint the agent needs — projects, phases, tasks, and Stitch sync.",
                  color: "#8782f5",
                  bg: "rgba(135,130,245,0.08)",
                },
                {
                  title: "Project-first workflow",
                  desc: "Create the project in Stage first, then design in Stitch, then sync previews back.",
                  color: "#0891b2",
                  bg: "rgba(59,175,218,0.08)",
                },
                {
                  title: "Destructive confirmation",
                  desc: "Never delete or archive without explicit user confirmation. Always preview first.",
                  color: "#dc2626",
                  bg: "rgba(220,38,38,0.08)",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[18px] px-5 py-4"
                  style={{ backgroundColor: item.bg }}
                >
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.title}
                  </span>
                  <p className="mt-1 text-[13px] leading-[1.6] text-text-secondary">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 text-center">
            <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
              Ready to install?
            </h2>
            <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-[1.7] text-text-secondary">
              One command to teach your agent everything about Stage.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 rounded-[16px] bg-accent px-6 py-4 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Read the API docs
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                to="/agents/stitch"
                className="inline-flex items-center gap-2 rounded-[16px] border border-border bg-white px-6 py-4 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Learn about Stitch
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
