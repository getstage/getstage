import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BracketsAngle,
  PlugsConnected,
  FileCode,
  Robot,
  Sparkle,
} from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";

const PAGE_TITLE = "Stage for Agents";
const PAGE_DESCRIPTION =
  "Connect AI agents to Stage through REST API, MCP, Claude Code skills, OpenClaw, or Stitch. Five ways to let agents create and manage projects.";

type IntegrationCard = {
  id: string;
  title: string;
  description: string;
  icon: "api" | "skill" | "mcp" | "openclaw" | "stitch";
  href: string;
  isExternal?: boolean;
  badge?: string;
  accentColor: string;
  accentBg: string;
  borderColor: string;
  gradientBg: string;
};

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: "stitch",
    title: "Stitch",
    description:
      "Link a Google Stitch project to your Stage project. Stage stores the latest synced previews so your team always sees the current design state.",
    icon: "stitch",
    href: "/agents/stitch",
    badge: "Design",
    accentColor: "text-[#0891b2]",
    accentBg: "bg-[rgba(59,175,218,0.10)]",
    borderColor: "border-[rgba(59,175,218,0.18)]",
    gradientBg:
      "bg-[linear-gradient(180deg,rgba(59,175,218,0.06)_0%,#ffffff_100%)]",
  },
  {
    id: "rest-api",
    title: "REST API",
    description:
      "Full REST API with Bearer token auth. Create projects, manage phases and tasks, import plans — all via structured HTTP calls.",
    icon: "api",
    href: "/docs",
    badge: "Core",
    accentColor: "text-accent",
    accentBg: "bg-[rgba(135,130,245,0.10)]",
    borderColor: "border-[rgba(135,130,245,0.16)]",
    gradientBg:
      "bg-[linear-gradient(180deg,rgba(135,130,245,0.06)_0%,#ffffff_100%)]",
  },
  {
    id: "agent-skills",
    title: "Agent Skills",
    description:
      "Install a skill into Claude Code or any compatible agent. It teaches the agent Stage's API, action policy, and the full project-then-design workflow.",
    icon: "skill",
    href: "/agents/skills",
    accentColor: "text-[#0d9488]",
    accentBg: "bg-[rgba(13,148,136,0.10)]",
    borderColor: "border-[rgba(13,148,136,0.16)]",
    gradientBg:
      "bg-[linear-gradient(180deg,rgba(13,148,136,0.06)_0%,#ffffff_100%)]",
  },
  {
    id: "mcp",
    title: "MCP Server",
    description:
      "Model Context Protocol server for Claude Desktop and compatible clients. Exposes Stage tools natively inside the conversation.",
    icon: "mcp",
    href: "/agents/mcp",
    badge: "Coming soon",
    accentColor: "text-[#2563eb]",
    accentBg: "bg-[rgba(37,99,235,0.10)]",
    borderColor: "border-[rgba(37,99,235,0.16)]",
    gradientBg:
      "bg-[linear-gradient(180deg,rgba(37,99,235,0.06)_0%,#ffffff_100%)]",
  },
  {
    id: "openclaw",
    title: "OpenClaw",
    description:
      "Conversational AI layer that interprets prompts and calls Stage with structured actions. Currently in preview.",
    icon: "openclaw",
    href: "/openclaw",
    badge: "Coming soon",
    accentColor: "text-[#dc2626]",
    accentBg: "bg-[rgba(255,77,77,0.10)]",
    borderColor: "border-[rgba(255,77,77,0.16)]",
    gradientBg:
      "bg-[linear-gradient(180deg,rgba(255,77,77,0.06)_0%,#ffffff_100%)]",
  },
];

function CardIcon({ icon }: { icon: IntegrationCard["icon"] }) {
  switch (icon) {
    case "api":
      return <BracketsAngle size={22} weight="bold" />;
    case "skill":
      return <FileCode size={22} weight="bold" />;
    case "mcp":
      return <PlugsConnected size={22} weight="bold" />;
    case "openclaw":
      return <img src="/openclaw.svg" alt="" className="h-[22px] w-[22px]" />;
    case "stitch":
      return (
        <img src="/stitch.png" alt="" className="h-[22px] w-[22px] rounded-[6px]" />
      );
  }
}

function IntegrationCardComponent({ card }: { card: IntegrationCard }) {
  const inner = (
    <div
      className={`group relative flex h-full flex-col rounded-[24px] border ${card.borderColor} ${card.gradientBg} p-6 shadow-[0_12px_40px_rgba(17,24,39,0.04)] transition-all hover:shadow-[0_18px_50px_rgba(17,24,39,0.08)] hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-white ${card.accentColor} shadow-[0_10px_24px_rgba(15,23,42,0.06)]`}
        >
          <CardIcon icon={card.icon} />
        </div>
        {card.badge && (
          <span
            className={`rounded-full ${card.accentBg} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${card.accentColor}`}
          >
            {card.badge}
          </span>
        )}
      </div>

      <h3 className="mt-5 font-heading text-[20px] font-semibold text-text-primary">
        {card.title}
      </h3>
      <p className="mt-2 flex-1 text-[14px] leading-[1.7] text-text-secondary">
        {card.description}
      </p>

      <div
        className={`mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium ${card.accentColor} transition-all group-hover:gap-2.5`}
      >
        {card.badge === "Coming soon" ? "Learn more" : "Get started"}
        <ArrowRight size={14} weight="bold" />
      </div>
    </div>
  );

  if (card.isExternal) {
    return (
      <a href={card.href} className="block h-full">
        {inner}
      </a>
    );
  }

  if (card.badge === "Coming soon") {
    return <div className="block h-full cursor-default">{inner}</div>;
  }

  return (
    <Link to={card.href} className="block h-full">
      {inner}
    </Link>
  );
}

export function AgentsPage() {
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
          <div className="absolute left-[-140px] top-[120px] h-[320px] w-[320px] rounded-full bg-[rgba(135,130,245,0.10)] blur-3xl" />
          <div className="absolute right-[-120px] top-[220px] h-[320px] w-[320px] rounded-full bg-[rgba(255,77,77,0.08)] blur-3xl" />
          <div className="absolute left-[42%] top-[760px] h-[260px] w-[260px] rounded-full bg-[rgba(59,175,218,0.08)] blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative border-b border-border-subtle bg-white/88 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
            <Link to="/" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/docs"
                className="rounded-[14px] border border-border bg-white px-5 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                API Reference
              </Link>
              <Link
                to="/auth"
                className="rounded-[14px] bg-accent px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Get API Key
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 sm:px-10">
          {/* Hero */}
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[rgba(135,130,245,0.16)] bg-[rgba(135,130,245,0.10)] px-4 py-2 text-[13px] font-medium text-text-primary">
              <Robot size={16} weight="bold" />
              Agent integrations
            </div>

            <h1 className="mx-auto mt-6 max-w-[800px] font-heading text-[46px] font-semibold leading-[1.06] tracking-[-1.4px] text-text-primary sm:text-[60px]">
              Let agents build projects for you
            </h1>

            <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-[1.75] text-text-secondary">
              Create the full project in Stage, then link your design work from
              Stitch. Multiple ways to connect — pick the one that fits.
            </p>
          </div>

          {/* Integration cards grid */}
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((card) => (
              <IntegrationCardComponent key={card.id} card={card} />
            ))}
          </div>

          {/* How it works */}
          <section className="mt-20">
            <div className="text-center">
              <h2 className="font-heading text-[32px] font-semibold tracking-[-0.04em] text-text-primary">
                How it works
              </h2>
              <p className="mx-auto mt-3 max-w-[540px] text-[16px] leading-[1.7] text-text-secondary">
                Stage is the executor. Your AI agent is the interpreter. Stage
                never calls LLMs — it authenticates, validates, and stores.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Create the project",
                  desc: "Your agent builds the full project plan — name, phases, tasks, timeline — and imports it into Stage via the API.",
                  color: "rgba(135,130,245,0.10)",
                  border: "rgba(135,130,245,0.16)",
                },
                {
                  step: "2",
                  title: "Design in Stitch",
                  desc: "You or your agent works in Google Stitch to create the UI. Stage links the Stitch project back to your Stage project.",
                  color: "rgba(59,175,218,0.10)",
                  border: "rgba(59,175,218,0.18)",
                },
                {
                  step: "3",
                  title: "Sync latest previews",
                  desc: "Stage stores the latest synced design previews. Your whole team sees the current state without leaving Stage.",
                  color: "rgba(13,148,136,0.10)",
                  border: "rgba(13,148,136,0.16)",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`rounded-[24px] border border-[${item.border}] bg-white p-6 shadow-[0_12px_30px_rgba(17,24,39,0.04)]`}
                  style={{ borderColor: item.border }}
                >
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-text-primary"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-heading text-[18px] font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.7] text-text-secondary">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Action policy */}
          <section className="mt-20 rounded-[30px] border border-border-subtle bg-white p-8 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
            <div className="text-center">
              <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
                Action policy
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.7] text-text-secondary">
                Every agent integration follows the same safety rules.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Read",
                  rule: "Run immediately — no confirmation needed.",
                  color: "#0d9488",
                  bg: "rgba(13,148,136,0.08)",
                },
                {
                  label: "Create",
                  rule: "Run only at high confidence from the prompt.",
                  color: "#2563eb",
                  bg: "rgba(37,99,235,0.08)",
                },
                {
                  label: "Update",
                  rule: "Run when the target and change are unambiguous.",
                  color: "#d97706",
                  bg: "rgba(217,119,6,0.08)",
                },
                {
                  label: "Destructive",
                  rule: "Always require explicit user confirmation first.",
                  color: "#dc2626",
                  bg: "rgba(220,38,38,0.08)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-[18px] px-5 py-4"
                  style={{ backgroundColor: item.bg }}
                >
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow-[0_6px_14px_rgba(17,24,39,0.06)]"
                    style={{ color: item.color }}
                  >
                    {item.label[0]}
                  </span>
                  <div>
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                    <p className="mt-0.5 text-[13px] leading-[1.6] text-text-secondary">
                      {item.rule}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 text-center">
            <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
              Ready to connect?
            </h2>
            <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-[1.7] text-text-secondary">
              Create an API key in your Developer settings and start building.
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
                to="/agents/skills"
                className="inline-flex items-center gap-2 rounded-[16px] border border-border bg-white px-6 py-4 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Install Agent Skills
                <Sparkle size={16} weight="bold" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
