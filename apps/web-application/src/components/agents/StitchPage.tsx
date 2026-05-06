import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowSquareOut, Images, LinkSimple, ArrowsClockwise } from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";

const PAGE_TITLE = "Stitch + Stage";
const PAGE_DESCRIPTION =
  "Link a Stitch project to your Stage project. Stage stores the latest synced previews so your team always sees the current design state.";

const WORKFLOW_STEPS = [
  {
    step: "1",
    title: "Create the project in Stage",
    desc: "Your agent or you creates the full project plan in Stage — name, phases, tasks, timeline. This is always the first step.",
    icon: LinkSimple,
    color: "rgba(135,130,245,0.10)",
    border: "rgba(135,130,245,0.16)",
    iconColor: "#8782f5",
  },
  {
    step: "2",
    title: "Design in Stitch",
    desc: "Open the Stitch workspace to create your UI. You or your agent works directly in Stitch — Stage does not replace the design editor.",
    icon: ArrowSquareOut,
    color: "rgba(59,175,218,0.10)",
    border: "rgba(59,175,218,0.18)",
    iconColor: "#0891b2",
  },
  {
    step: "3",
    title: "Link the Stitch project",
    desc: "Connect the Stitch project back to your Stage project. Stage stores the link so your team can always jump into the right workspace.",
    icon: LinkSimple,
    color: "rgba(59,175,218,0.10)",
    border: "rgba(59,175,218,0.18)",
    iconColor: "#0891b2",
  },
  {
    step: "4",
    title: "Sync latest previews",
    desc: "Stage stores the latest synced preview screens from Stitch. Multiple collaborators can update the Stitch project — Stage always shows the freshest state.",
    icon: ArrowsClockwise,
    color: "rgba(13,148,136,0.10)",
    border: "rgba(13,148,136,0.16)",
    iconColor: "#0d9488",
  },
];

const API_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/projects/:id/design-connections",
    description: "Link a Stitch project to your Stage project.",
  },
  {
    method: "GET",
    path: "/api/v1/projects/:id/design-connections",
    description: "List linked design connections for a project.",
  },
  {
    method: "POST",
    path: "/api/v1/projects/:id/designs/upload-url",
    description: "Get a signed upload URL for a preview image.",
  },
  {
    method: "POST",
    path: "/api/v1/projects/:id/designs/sync",
    description: "Sync the latest preview set from Stitch into Stage.",
  },
  {
    method: "GET",
    path: "/api/v1/projects/:id/designs",
    description: "List current synced previews for a project.",
  },
];

export function StitchPage() {
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
          <div className="absolute left-[-140px] top-[120px] h-[320px] w-[320px] rounded-full bg-[rgba(59,175,218,0.12)] blur-3xl" />
          <div className="absolute right-[-120px] top-[220px] h-[320px] w-[320px] rounded-full bg-[rgba(135,130,245,0.08)] blur-3xl" />
          <div className="absolute left-[42%] top-[760px] h-[260px] w-[260px] rounded-full bg-[rgba(13,148,136,0.08)] blur-3xl" />
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
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,175,218,0.18)] bg-[rgba(59,175,218,0.10)] px-4 py-2 text-[13px] font-medium text-text-primary">
              <img
                src="/stitch.png"
                alt=""
                className="h-5 w-5 rounded-[5px]"
              />
              Design workspace
            </div>

            <h1 className="mt-6 max-w-[600px] font-heading text-[42px] font-semibold leading-[1.06] tracking-[-1.2px] text-text-primary sm:text-[52px]">
              Link Stitch to your Stage project
            </h1>

            <p className="mt-5 max-w-[540px] text-[17px] leading-[1.75] text-text-secondary">
              Stage stores the project plan. Stitch is the design workspace.
              Link them together so your team always sees the latest synced
              previews without leaving Stage.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 rounded-[16px] bg-[#0891b2] px-6 py-4 text-[15px] font-medium text-white transition-colors hover:bg-[#0e7490]"
              >
                View Stitch endpoints
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                to="/agents"
                className="inline-flex items-center gap-2 rounded-[16px] border border-border bg-white px-6 py-4 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                All integrations
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </section>

          {/* How it works */}
          <section className="mt-20">
            <div className="text-center">
              <h2 className="font-heading text-[32px] font-semibold tracking-[-0.04em] text-text-primary">
                How it works
              </h2>
              <p className="mx-auto mt-3 max-w-[540px] text-[16px] leading-[1.7] text-text-secondary">
                Stage is the project source of truth. Stitch is the design
                workspace. They stay linked so everyone sees the latest state.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
              {WORKFLOW_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[24px] border bg-white p-6 shadow-[0_12px_30px_rgba(17,24,39,0.04)]"
                  style={{ borderColor: item.border }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold text-text-primary"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.step}
                    </span>
                    <item.icon
                      size={20}
                      weight="bold"
                      style={{ color: item.iconColor }}
                    />
                  </div>
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

          {/* What Stage shows */}
          <section className="mt-20 rounded-[30px] border border-border-subtle bg-white p-8 shadow-[0_18px_50px_rgba(17,24,39,0.04)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(59,175,218,0.10)] text-[#0891b2]">
                <Images size={20} weight="bold" />
              </span>
              <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
                What Stage shows
              </h2>
            </div>
            <p className="mt-3 max-w-[540px] text-[15px] leading-[1.7] text-text-secondary">
              Stage does not become the full design editor. It shows the latest
              synced state from Stitch so your whole team stays aligned.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Linked Stitch project",
                  desc: "The connected workspace URL and project title, always visible at the project level.",
                },
                {
                  title: "Latest synced previews",
                  desc: "Thumbnail grid of the most recent screens synced from Stitch into Stage.",
                },
                {
                  title: "Last synced timestamp",
                  desc: "When the previews were last updated, so your team knows how fresh the designs are.",
                },
                {
                  title: "Open in Stitch",
                  desc: "One-click link to open the full Stitch workspace for editing and generation.",
                },
                {
                  title: "Optional phase badges",
                  desc: "Tag synced previews to a project phase to keep the design work organized.",
                },
                {
                  title: "Multi-collaborator safe",
                  desc: "Multiple people can work in the same Stitch project. Stage always shows the latest synced set.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[18px] bg-[rgba(59,175,218,0.05)] px-5 py-4"
                >
                  <span className="text-[14px] font-semibold text-[#0891b2]">
                    {item.title}
                  </span>
                  <p className="mt-1 text-[13px] leading-[1.6] text-text-secondary">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* API endpoints */}
          <section className="mt-20">
            <div className="text-center">
              <h2 className="font-heading text-[32px] font-semibold tracking-[-0.04em] text-text-primary">
                Stitch API endpoints
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[16px] leading-[1.7] text-text-secondary">
                Use these endpoints to link a Stitch project and sync the latest
                previews into Stage.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl space-y-3">
              {API_ENDPOINTS.map((endpoint) => (
                <div
                  key={endpoint.path}
                  className="flex items-start gap-4 rounded-[18px] border border-border-subtle bg-white px-5 py-4 shadow-[0_4px_12px_rgba(17,24,39,0.03)]"
                >
                  <span
                    className={`mt-0.5 inline-flex flex-shrink-0 rounded-[8px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${
                      endpoint.method === "GET"
                        ? "bg-[rgba(13,148,136,0.10)] text-[#0d9488]"
                        : "bg-[rgba(37,99,235,0.10)] text-[#2563eb]"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <div>
                    <code className="text-[13px] font-medium text-text-primary">
                      {endpoint.path}
                    </code>
                    <p className="mt-1 text-[13px] leading-[1.6] text-text-secondary">
                      {endpoint.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 text-center">
            <h2 className="font-heading text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
              Ready to connect Stitch?
            </h2>
            <p className="mx-auto mt-3 max-w-[420px] text-[15px] leading-[1.7] text-text-secondary">
              Create a project in Stage, then link your Stitch workspace. Your
              team will always see the latest designs.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 rounded-[16px] bg-[#0891b2] px-6 py-4 text-[15px] font-medium text-white transition-colors hover:bg-[#0e7490]"
              >
                Read the API docs
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                to="/agents/skills"
                className="inline-flex items-center gap-2 rounded-[16px] border border-border bg-white px-6 py-4 text-[15px] font-medium text-text-primary transition-colors hover:bg-bg-subtle"
              >
                Install Agent Skills
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
