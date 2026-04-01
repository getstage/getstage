import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import stageLogo from "@/assets/logos/stage-logo-light.png";

const OPENCLAW_TITLE = "OpenClaw for Stage";
const OPENCLAW_DESCRIPTION =
  "Use OpenClaw as the conversational layer on top of Stage. Let the AI interpret messy prompts, then call Stage with structured actions.";

const SAFETY_RULES = [
  "Read actions can run immediately.",
  "Create actions should only run at high confidence.",
  "Update actions should only run when the target and change are unambiguous.",
  "Destructive actions always require explicit confirmation.",
];

const EXECUTION_STEPS = [
  "Interpret the user prompt outside Stage.",
  "Classify the request as read, create, update, destructive, or clarify.",
  "Build a structured Stage API call.",
  "Call Stage only to read or execute the final action.",
];

export function OpenClawPage() {
  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{OPENCLAW_TITLE}</title>
        <meta name="description" content={OPENCLAW_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="min-h-screen bg-bg text-text-primary">
        <header className="border-b border-border-subtle bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={stageLogo} alt="Stage" className="h-9 w-auto" />
              <span className="font-heading text-[18px] font-semibold">Stage</span>
            </Link>
            <div className="flex items-center gap-3">
              <a
                href="/SKILL.md"
                className="rounded-[10px] border border-border px-4 py-2 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Download SKILL.md
              </a>
              <Link
                to="/docs"
                className="rounded-[10px] bg-accent px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-accent/90"
              >
                API Docs
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:px-10">
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <div className="inline-flex rounded-full border border-accent-light bg-accent-light px-3 py-1 text-[12px] font-medium text-text-primary">
                Conversational layer for Stage
              </div>
              <h1 className="mt-5 max-w-[760px] font-heading text-[44px] font-semibold leading-[1.05] tracking-[-1.2px] text-text-primary sm:text-[56px]">
                Let OpenClaw interpret the prompt. Let Stage execute the action.
              </h1>
              <p className="mt-6 max-w-[640px] text-[18px] leading-[1.7] text-text-secondary">
                OpenClaw should handle the messy language, intent classification, and confidence
                judgment. Stage should stay clean: authenticate, validate, read, and write
                structured project data.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/docs"
                  className="rounded-[10px] bg-accent px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Read the API docs
                </Link>
                <a
                  href="/SKILL.md"
                  className="rounded-[10px] border border-border bg-white px-5 py-3 text-[14px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
                >
                  Use the skill file
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-border-subtle bg-white p-6 shadow-[0_20px_60px_rgba(17,24,39,0.06)]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Example Flow
              </p>
              <div className="mt-4 rounded-[20px] bg-bg-subtle p-5">
                <p className="text-[14px] leading-[1.7] text-text-secondary">
                  “Create a branding project from this brief.”
                </p>
              </div>
              <div className="mt-3 rounded-[20px] border border-border-subtle p-5">
                <p className="text-[14px] leading-[1.7] text-text-primary">
                  OpenClaw extracts a structured plan, checks confidence, then calls
                  <code className="mx-1 rounded bg-bg-subtle px-1.5 py-0.5 text-[13px]">
                    POST /api/v1/projects/import-plan
                  </code>
                  with phases and tasks.
                </p>
              </div>
              <div className="mt-3 rounded-[20px] bg-bg-subtle p-5">
                <p className="text-[14px] leading-[1.7] text-text-secondary">
                  “Delete these 14 tasks.”
                </p>
              </div>
              <div className="mt-3 rounded-[20px] border border-border-subtle p-5">
                <p className="text-[14px] leading-[1.7] text-text-primary">
                  OpenClaw should preview the exact tasks and ask for explicit confirmation
                  before any destructive API call exists.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-border-subtle bg-white p-6">
              <h2 className="font-heading text-[24px] font-semibold text-text-primary">
                Execution model
              </h2>
              <ul className="mt-4 space-y-3 text-[15px] leading-[1.7] text-text-secondary">
                {EXECUTION_STEPS.map((step) => (
                  <li key={step} className="rounded-[16px] bg-bg-subtle px-4 py-3">
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-border-subtle bg-white p-6">
              <h2 className="font-heading text-[24px] font-semibold text-text-primary">
                Safety rules
              </h2>
              <ul className="mt-4 space-y-3 text-[15px] leading-[1.7] text-text-secondary">
                {SAFETY_RULES.map((rule) => (
                  <li key={rule} className="rounded-[16px] bg-bg-subtle px-4 py-3">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
