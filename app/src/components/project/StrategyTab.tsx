import { useState } from "react";

type StrategyTabProps = {
  projectName: string;
};

type SectionStatus = "approved" | "draft" | "needs_revision";

type StrategySection = {
  id: string;
  title: string;
  status: SectionStatus;
  content: React.ReactNode;
};

function StatusBadge({ status }: { status: SectionStatus }) {
  const config: Record<SectionStatus, { label: string; classes: string }> = {
    approved: {
      label: "Approved",
      classes: "bg-[#EDFCF2] text-[#22C55E]",
    },
    draft: {
      label: "Draft",
      classes: "bg-bg-subtle text-text-secondary",
    },
    needs_revision: {
      label: "Needs Revision",
      classes: "bg-[#FEF9EC] text-[#D4890A]",
    },
  };

  const { label, classes } = config[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function ApprovalButtons({
  status,
  onApprove,
  onRequestRevision,
}: {
  status: SectionStatus;
  onApprove: () => void;
  onRequestRevision: () => void;
}) {
  if (status === "approved") return null;

  return (
    <div className="mt-4 flex items-center gap-2.5">
      <button
        type="button"
        onClick={onApprove}
        className="inline-flex cursor-pointer items-center rounded-[8px] border border-[#22C55E] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#22C55E] transition-all duration-150 hover:bg-[#EDFCF2]"
      >
        Approve
      </button>
      {status === "draft" ? (
        <button
          type="button"
          onClick={onRequestRevision}
          className="inline-flex cursor-pointer items-center rounded-[8px] border border-[#D4890A] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[#D4890A] transition-all duration-150 hover:bg-[#FEF9EC]"
        >
          Request revision
        </button>
      ) : null}
    </div>
  );
}

function buildSections(_projectName: string): StrategySection[] {
  return [
    {
      id: "goals",
      title: "Goals & KPIs",
      status: "approved",
      content: (
        <p className="text-[14px] leading-[1.7] text-text-secondary">
          Redesign acmestudio.com to increase demo requests by 40% within 6
          months. Key performance indicators: demo conversion rate (target
          4.5%), bounce rate reduction (target &lt;45%), average session duration
          (target &gt;2min), and organic traffic growth (target +30% in 6
          months).
        </p>
      ),
    },
    {
      id: "journeys",
      title: "User Journeys",
      status: "approved",
      content: (
        <div className="space-y-1.5 text-[14px] leading-[1.7] text-text-secondary">
          <p>Three primary user journeys identified:</p>
          <ol className="list-inside space-y-1">
            <li>
              <span className="font-medium text-text-primary">
                1. The Evaluator
              </span>{" "}
              &mdash; Operations manager researching solutions.
            </li>
            <li>
              <span className="font-medium text-text-primary">
                2. The Decision Maker
              </span>{" "}
              &mdash; VP/C-level comparing vendors.
            </li>
            <li>
              <span className="font-medium text-text-primary">
                3. The Existing User
              </span>{" "}
              &mdash; Current customer exploring upgrades.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "sitemap",
      title: "Sitemap",
      status: "draft",
      content: (
        <div className="space-y-1 text-[14px] leading-[1.7] text-text-secondary">
          <p className="font-mono text-[13px]">
            / &mdash; Homepage (hero, value props, social proof, CTA)
          </p>
          <p className="font-mono text-[13px]">
            /product &mdash; Product overview
          </p>
          <p className="font-mono text-[13px]">
            /solutions &mdash; Use-case pages by team type
          </p>
          <p className="font-mono text-[13px]">
            /pricing &mdash; Transparent pricing
          </p>
          <p className="font-mono text-[13px]">
            /customers &mdash; Case studies
          </p>
          <p className="font-mono text-[13px]">
            /resources &mdash; Blog, guides, webinars
          </p>
          <p className="font-mono text-[13px]">
            /company &mdash; About, careers, press
          </p>
          <p className="font-mono text-[13px]">
            /demo &mdash; Demo request form
          </p>
        </div>
      ),
    },
    {
      id: "content-strategy",
      title: "Page-by-Page Content Strategy",
      status: "draft",
      content: (
        <div className="space-y-3 text-[14px] leading-[1.7] text-text-secondary">
          <div>
            <p className="font-medium text-text-primary">Homepage</p>
            <p>
              Lead with a bold outcome statement, not a feature list. Hero
              should answer &ldquo;What can I achieve?&rdquo; within 5 seconds.
              Include 3 value props, social proof bar, and a single primary CTA.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Product page</p>
            <p>
              Interactive product tour with real UI screenshots. Organized by
              use-case rather than feature category. Each section ends with a
              contextual CTA.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Pricing approach</p>
            <p>
              Transparent three-tier pricing with annual/monthly toggle. Include
              a feature comparison table and an ROI calculator to justify cost.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "conversion",
      title: "Conversion Approach",
      status: "needs_revision",
      content: (
        <div className="space-y-3 text-[14px] leading-[1.7] text-text-secondary">
          <div>
            <p className="font-medium text-text-primary">
              Primary conversion: Demo request
            </p>
            <p>
              Reduce form fields to 4 (name, email, company, team size).
              Implement multi-step form to reduce perceived friction. Target 4.5%
              conversion rate from visit to submission.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">
              Secondary conversions
            </p>
            <p>
              Newsletter signup, gated content downloads, and free tool access
              (ROI calculator). These feed the nurture funnel for users not ready
              to commit.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">CTA hierarchy</p>
            <p>
              Every page has one primary CTA (&ldquo;Book a demo&rdquo;) and one
              secondary CTA (&ldquo;See pricing&rdquo; or &ldquo;Watch
              demo&rdquo;). No competing CTAs in the same viewport.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "technical",
      title: "Technical Requirements",
      status: "draft",
      content: (
        <div className="space-y-1.5 text-[14px] leading-[1.7] text-text-secondary">
          <p>
            <span className="font-medium text-text-primary">Framework:</span>{" "}
            Next.js 14 with App Router, React Server Components for performance
          </p>
          <p>
            <span className="font-medium text-text-primary">CMS:</span>{" "}
            Headless CMS (Sanity or Contentful) for marketing team autonomy
          </p>
          <p>
            <span className="font-medium text-text-primary">Analytics:</span>{" "}
            PostHog for product analytics, GA4 for marketing attribution
          </p>
          <p>
            <span className="font-medium text-text-primary">Performance:</span>{" "}
            Core Web Vitals targets: LCP &lt;2.5s, FID &lt;100ms, CLS &lt;0.1
          </p>
          <p>
            <span className="font-medium text-text-primary">
              Accessibility:
            </span>{" "}
            WCAG 2.1 AA compliance across all pages
          </p>
          <p>
            <span className="font-medium text-text-primary">Hosting:</span>{" "}
            Vercel with edge functions for optimal global performance
          </p>
        </div>
      ),
    },
  ];
}

export function StrategyTab({ projectName }: StrategyTabProps) {
  const [sections, setSections] = useState<StrategySection[]>(() =>
    buildSections(projectName),
  );

  const approvedCount = sections.filter((s) => s.status === "approved").length;
  const totalCount = sections.length;
  const progressPercent = (approvedCount / totalCount) * 100;

  function updateStatus(id: string, newStatus: SectionStatus) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
    );
  }

  return (
    <div className="pb-20">
      {/* Approval bar */}
      <div className="mx-auto max-w-[720px] py-6">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-medium text-text-primary">
            {approvedCount} of {totalCount} sections approved
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-[#22C55E] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[720px] space-y-10">
        {sections.map((section) => (
          <section
            key={section.id}
            className="rounded-[12px] border border-border-subtle p-5"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <h2 className="font-heading text-[17px] font-semibold text-text-primary">
                {section.title}
              </h2>
              <StatusBadge status={section.status} />
            </div>
            {section.content}
            <ApprovalButtons
              status={section.status}
              onApprove={() => updateStatus(section.id, "approved")}
              onRequestRevision={() =>
                updateStatus(section.id, "needs_revision")
              }
            />
          </section>
        ))}
      </div>
    </div>
  );
}
