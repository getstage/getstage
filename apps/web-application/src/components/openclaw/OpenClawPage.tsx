import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BracketsAngle,
  Check,
  Copy,
  ShieldCheckered,
} from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { useState } from "react";

const PAGE_TITLE = "OpenClaw for Stage";
const PAGE_DESCRIPTION =
  "Set up OpenClaw as the conversational layer for Stage in 3 steps. Let the AI interpret prompts and call Stage with structured actions.";

/* ─── setup steps ─── */
const SETUP_STEPS = [
  {
    number: "1",
    title: "Get your API key",
    description:
      "Go to Settings > Developer in Stage and generate an API key. You'll see it once — copy it somewhere safe.",
    code: "stg_a1b2c3d4e5f6…",
    codeLabel: "Your API key format",
  },
  {
    number: "2",
    title: "Download the skill file",
    description:
      "Drop SKILL.md into your agent workspace. It teaches the agent Stage's endpoints, action policy, and request format.",
    code: "curl -O https://getstage.co/SKILL.md",
    codeLabel: "Download",
  },
  {
    number: "3",
    title: "Start talking",
    description:
      "Tell your agent what to build. It reads the skill file, interprets your prompt, and calls Stage's API with structured data.",
    code: '"Create a branding project for a restaurant, budget 3K, 6 weeks"',
    codeLabel: "Example prompt",
  },
];

/* ─── chat examples ─── */
type ChatMessage = {
  role: "user" | "agent" | "stage";
  text: string;
  code?: string;
};

const CHAT_EXAMPLES: { title: string; messages: ChatMessage[] }[] = [
  {
    title: "Create a project",
    messages: [
      {
        role: "user",
        text: "Set up a branding project for a bakery. Budget is 2500, deadline in 4 weeks.",
      },
      {
        role: "agent",
        text: "I'll create a branding project with three phases: Discovery, Concept, and Delivery.",
        code: `POST /api/v1/projects/import-plan
{
  "name": "Bakery Branding",
  "type": "branding",
  "budget": 2500,
  "currency": "EUR",
  "phases": [
    { "name": "Discovery", "tasks": ["Brand audit", "Competitor analysis"] },
    { "name": "Concept", "tasks": ["Moodboard", "Logo drafts", "Color palette"] },
    { "name": "Delivery", "tasks": ["Final files", "Brand guidelines"] }
  ]
}`,
      },
      {
        role: "stage",
        text: "Project created with 3 phases and 7 tasks. Timeline set to 4 weeks.",
      },
    ],
  },
  {
    title: "Destructive action",
    messages: [
      {
        role: "user",
        text: "Delete all the tasks in the Discovery phase.",
      },
      {
        role: "agent",
        text: 'This is a destructive action. You have 2 tasks in Discovery: "Brand audit" and "Competitor analysis". Delete both?',
      },
      {
        role: "user",
        text: "Yes, delete them.",
      },
      {
        role: "agent",
        text: "Done — both tasks removed from the Discovery phase.",
        code: `DELETE /api/v1/tasks/abc123
DELETE /api/v1/tasks/def456`,
      },
    ],
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
      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-text-tertiary transition-colors hover:bg-white/60 hover:text-text-secondary"
    >
      {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
    </button>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-accent px-5 py-3.5 text-[14px] leading-[1.7] text-white">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.role === "stage") {
    return (
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-[rgba(135,130,245,0.10)] text-accent">
          <BracketsAngle size={14} weight="bold" />
        </span>
        <div className="max-w-[85%] rounded-[18px] rounded-bl-[6px] bg-[rgba(135,130,245,0.08)] px-5 py-3.5 text-[14px] leading-[1.7] text-text-primary">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-[rgba(255,77,77,0.10)]">
        <img src="/openclaw.svg" alt="" className="h-4 w-4" />
      </span>
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-[18px] rounded-bl-[6px] border border-border-subtle bg-white px-5 py-3.5 text-[14px] leading-[1.7] text-text-primary shadow-[0_4px_12px_rgba(17,24,39,0.03)]">
          {message.text}
        </div>
        {message.code && (
          <div className="relative rounded-[14px] bg-[#1e1e2e] p-4">
            <div className="absolute right-3 top-3">
              <CopyButton text={message.code} />
            </div>
            <pre className="overflow-x-auto text-[12px] leading-[1.7] text-[#cdd6f4]">
              <code>{message.code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function OpenClawPage() {
  const [activeExample, setActiveExample] = useState(0);

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
          <section className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,77,77,0.16)] bg-[rgba(255,77,77,0.10)] px-4 py-2 text-[13px] font-medium text-text-primary">
                <img src="/openclaw.svg" alt="" className="h-5 w-5" />
                Conversational layer for Stage
              </div>

              <h1 className="mt-6 max-w-[540px] font-heading text-[42px] font-semibold leading-[1.06] tracking-[-1.2px] text-text-primary sm:text-[52px]">
                Talk to Stage through OpenClaw
              </h1>

              <p className="mt-5 max-w-[480px] text-[17px] leading-[1.75] text-text-secondary">
                OpenClaw interprets your prompt, classifies the intent, and
                calls Stage with clean, structured data. You talk — Stage
                executes.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/SKILL.md"
                  className="inline-flex items-center gap-2 rounded-[16px] bg-accent px-6 py-4 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Download SKILL.md
                  <ArrowRight size={16} weight="bold" />
                </a>
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 rounded-[16px] border border-border bg-white px-6 py-4 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                >
                  API Reference
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </div>

            {/* Chat preview */}
            <div className="rounded-[28px] border border-border-subtle bg-white p-1 shadow-[0_24px_80px_rgba(17,24,39,0.08)]">
              <div className="flex gap-1 border-b border-border-subtle px-4 pb-0">
                {CHAT_EXAMPLES.map((example, index) => (
                  <button
                    key={example.title}
                    type="button"
                    onClick={() => setActiveExample(index)}
                    className={`rounded-t-[10px] px-4 py-3 text-[13px] font-medium transition-colors ${
                      activeExample === index
                        ? "bg-bg-subtle text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    {example.title}
                  </button>
                ))}
              </div>
              <div className="space-y-4 p-5">
                {CHAT_EXAMPLES[activeExample]?.messages.map((msg, i) => (
                  <ChatBubble key={i} message={msg} />
                ))}
              </div>
            </div>
          </section>

          {/* Setup in 3 steps */}
          <section className="mt-20">
            <div className="text-center">
              <h2 className="font-heading text-[32px] font-semibold tracking-[-0.04em] text-text-primary">
                Setup in 3 steps
              </h2>
              <p className="mx-auto mt-3 max-w-[460px] text-[16px] leading-[1.7] text-text-secondary">
                From API key to your first agent-created project in under 5
                minutes.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
              {SETUP_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-[24px] border border-border-subtle bg-white p-6 shadow-[0_12px_30px_rgba(17,24,39,0.04)]"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(135,130,245,0.10)] text-[15px] font-bold text-accent">
                    {step.number}
                  </span>
                  <h3 className="mt-4 font-heading text-[18px] font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.7] text-text-secondary">
                    {step.description}
                  </p>
                  <div className="mt-4 rounded-[12px] bg-[#1e1e2e] px-4 py-3">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6c7086]">
                      {step.codeLabel}
                    </div>
                    <code className="text-[12px] leading-[1.6] text-[#cdd6f4]">
                      {step.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Safety rules */}
          <section className="mt-20 rounded-[30px] border border-border-subtle bg-white p-8 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(255,77,77,0.10)] text-[#991b1b]">
                <ShieldCheckered size={20} weight="bold" />
              </span>
              <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
                Action policy
              </h2>
            </div>
            <p className="mt-3 max-w-[540px] text-[15px] leading-[1.7] text-text-secondary">
              OpenClaw follows a strict action policy before making any Stage API
              call. The same rules apply to every agent integration.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Read",
                  rule: "Runs immediately.",
                  color: "#0d9488",
                  bg: "rgba(13,148,136,0.08)",
                },
                {
                  label: "Create",
                  rule: "Only at high confidence.",
                  color: "#2563eb",
                  bg: "rgba(37,99,235,0.08)",
                },
                {
                  label: "Update",
                  rule: "When target is unambiguous.",
                  color: "#d97706",
                  bg: "rgba(217,119,6,0.08)",
                },
                {
                  label: "Destructive",
                  rule: "Explicit confirmation required.",
                  color: "#dc2626",
                  bg: "rgba(220,38,38,0.08)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] px-5 py-4"
                  style={{ backgroundColor: item.bg }}
                >
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: item.color }}
                  >
                    {item.label}
                  </span>
                  <p className="mt-1 text-[13px] leading-[1.6] text-text-secondary">
                    {item.rule}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 text-center">
            <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
              Ready to try it?
            </h2>
            <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-[1.7] text-text-secondary">
              Get your API key, grab the skill file, and let your agent do the
              rest.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/agents"
                className="inline-flex items-center gap-2 rounded-[16px] bg-accent px-6 py-4 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                View all integrations
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
