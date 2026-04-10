import { ArrowClockwise, ShareNetwork } from "@phosphor-icons/react";

type ResearchTabProps = {
  projectName: string;
};

type Competitor = {
  name: string;
  domain: string;
  tagline: string;
  strengths: string[];
  weaknesses: string[];
};

const COMPETITORS: Competitor[] = [
  {
    name: "Zapier",
    domain: "zapier.com",
    tagline: "Easy automation for busy people",
    strengths: [
      "7,000+ integrations",
      "Strong brand recognition",
      "Excellent onboarding",
    ],
    weaknesses: [
      "Premium pricing at scale",
      "Limited complex logic",
      "Generic enterprise story",
    ],
  },
  {
    name: "Make",
    domain: "make.com",
    tagline: "Visual automation for anyone",
    strengths: [
      "Visual workflow builder",
      "Competitive pricing",
      "Complex logic support",
    ],
    weaknesses: [
      "Steeper learning curve",
      "Weaker brand in US",
      "Fewer native integrations",
    ],
  },
  {
    name: "Monday.com",
    domain: "monday.com",
    tagline: "A new way of working",
    strengths: [
      "All-in-one platform",
      "Strong marketing spend",
      "Broad feature set",
    ],
    weaknesses: [
      "Automation not core",
      "Can feel bloated",
      "Higher total cost",
    ],
  },
  {
    name: "n8n",
    domain: "n8n.io",
    tagline: "Workflow automation for technical people",
    strengths: [
      "Open-source / self-hosted",
      "Developer community",
      "Full code flexibility",
    ],
    weaknesses: [
      "Niche audience",
      "Requires technical skill",
      "Limited enterprise sales",
    ],
  },
];

const OPPORTUNITIES = [
  "Position as the operations-specific platform vs. generic automation tools",
  "Lead with outcome-based messaging (time saved, errors reduced) rather than feature lists",
  "Build trust through transparent pricing and ROI calculators",
  "Create industry-specific landing pages targeting top verticals (logistics, healthcare, finance)",
  "Develop a strong content engine around operational excellence thought leadership",
];

const KEY_INSIGHTS = [
  "Operations teams feel underserved by horizontal automation tools that require significant configuration",
  "Decision makers prioritize reliability and compliance over feature breadth",
  "The most successful competitors invest heavily in educational content and community",
  "Pricing transparency is a key differentiator \u2014 most competitors hide enterprise pricing",
  "Visual proof (dashboards, workflow demos) converts significantly better than text-based value props",
];

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#EDFCF2] px-2.5 py-0.5 text-[12px] font-medium text-[#22C55E]">
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <h2 className="font-heading text-[17px] font-semibold text-text-primary">
        {title}
      </h2>
      <StatusBadge label="Complete" />
    </div>
  );
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <div className="rounded-[12px] border border-border-subtle p-4">
      <div className="mb-1">
        <span className="font-heading text-[14px] font-semibold text-text-primary">
          {competitor.name}
        </span>
        <span className="ml-1.5 text-[12px] text-text-tertiary">
          {competitor.domain}
        </span>
      </div>
      <p className="mb-3 text-[13px] italic text-text-secondary">
        &ldquo;{competitor.tagline}&rdquo;
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#22C55E]">
            Strengths
          </p>
          <ul className="space-y-0.5">
            {competitor.strengths.map((s) => (
              <li
                key={s}
                className="text-[13px] leading-[1.6] text-text-secondary"
              >
                + {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
            Weaknesses
          </p>
          <ul className="space-y-0.5">
            {competitor.weaknesses.map((w) => (
              <li
                key={w}
                className="text-[13px] leading-[1.6] text-text-secondary"
              >
                &minus; {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ResearchTab({ projectName }: ResearchTabProps) {
  return (
    <div className="pb-20">
      {/* Action bar */}
      <div className="mx-auto flex max-w-[720px] items-center gap-2.5 py-6">
        <StatusBadge label="Complete" />
        <div className="flex-1" />
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-border bg-transparent px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary"
        >
          <ArrowClockwise size={14} />
          Regenerate
        </button>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-border bg-transparent px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-all duration-150 hover:border-text-secondary hover:text-text-primary"
        >
          <ShareNetwork size={14} />
          Share
        </button>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[720px] space-y-10">
        {/* Company Overview */}
        <section>
          <SectionHeader title="Company Overview" />
          <p className="text-[14px] leading-[1.7] text-text-secondary">
            {projectName.split(" ")[0] || "Acme"} is a mid-stage B2B SaaS
            company providing workflow automation tools for operations teams.
            Founded in 2021, they serve ~2,000 companies. Their current brand
            feels generic and doesn&apos;t differentiate them in an increasingly
            crowded market.
          </p>
        </section>

        {/* Market Landscape */}
        <section>
          <SectionHeader title="Market Landscape" />
          <p className="text-[14px] leading-[1.7] text-text-secondary">
            The workflow automation space is experiencing rapid growth, projected
            to reach $26B by 2027. The market is becoming increasingly
            fragmented with both horizontal platforms (Zapier, Make) and vertical
            solutions targeting specific industries.
          </p>
        </section>

        {/* Competitors */}
        <section>
          <SectionHeader title="Competitors" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {COMPETITORS.map((c) => (
              <CompetitorCard key={c.name} competitor={c} />
            ))}
          </div>
        </section>

        {/* Opportunities */}
        <section>
          <SectionHeader title="Opportunities" />
          <ol className="list-inside space-y-1.5">
            {OPPORTUNITIES.map((item, idx) => (
              <li
                key={item}
                className="text-[14px] leading-[1.7] text-text-secondary"
              >
                <span className="mr-1.5 font-medium text-text-primary">
                  {idx + 1}.
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>

        {/* Key Insights */}
        <section>
          <SectionHeader title="Key Insights" />
          <ul className="list-inside space-y-1.5">
            {KEY_INSIGHTS.map((insight) => (
              <li
                key={insight}
                className="flex items-start gap-2 text-[14px] leading-[1.7] text-text-secondary"
              >
                <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-text-tertiary" />
                {insight}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
