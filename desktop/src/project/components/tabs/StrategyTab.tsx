import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type SectionStatus = "approved" | "action";
type StrategySection = {
  id: string;
  title: string;
  status: SectionStatus;
  kind: "paragraph" | "plain" | "principles" | "table" | "cards" | "boxes";
  body?: string[];
  principles?: Array<{ title: string; body: string; research?: string }>;
  table?: Array<[string, string]>;
  cards?: Array<{ title: string; objective: string; kpi: string; keyElement: string }>;
  boxes?: Array<{ title: string; bullets: string[] }>;
};

const initialSections: StrategySection[] = [
  {
    id: "direction",
    title: "Design Direction",
    status: "approved",
    kind: "plain",
    body: [
      "Clean, content-first fintech dashboard. Prioritize speed and clarity for power users who make decisions in under 3 seconds. Differentiate through conversational onboarding and actionable data visualization - follow proven patterns everywhere else.",
    ],
  },
  {
    id: "principles",
    title: "Design Principles",
    status: "approved",
    kind: "principles",
    principles: [
      {
        title: "Clarity over decoration",
        body: "Users are finance professionals. They need speed, not aesthetics.",
        research: "Research: competitors with cluttered UIs had lowest app store ratings",
      },
      {
        title: "Data should explain itself",
        body: "If a chart needs a tooltip to be understood, the chart is wrong.",
      },
      {
        title: "Every screen has one primary action",
        body: "Reduce decision fatigue. One clear CTA per view.",
        research: "Research: best-performing competitors use single-CTA layouts",
      },
      {
        title: "Progressive disclosure over information overload",
        body: "Show what's needed now. Let users dig deeper on demand.",
        research: "Research: 4 of 6 competitors overwhelm users on first login",
      },
    ],
  },
  {
    id: "audience",
    title: "Target Audience Strategy",
    status: "action",
    kind: "table",
    table: [
      ["Primary user", "Finance managers, 30-45"],
      ["Tech level", "Intermediate, not developers, not beginners"],
      ["Usage context", "Desktop-first, 3-5x daily, always multitasking"],
      ["Key behavior", "They scan, never read. Decisions in under 3 seconds."],
    ],
  },
  {
    id: "content",
    title: "Content Strategy",
    status: "action",
    kind: "paragraph",
    body: [
      "Voice: Professional but human. No corporate jargon. No buzzwords.",
      "Headline: Outcome-led, not feature-led. Use: 'Track expenses in one place' instead of 'Advanced expense management'.",
      "CTA: Action verbs. Specific, not generic. Use: 'Start free', 'View report', 'Export CSV'. No vague labels like 'Learn more'.",
      "Error messages: Tell users what to do, not what went wrong. Use: 'No expenses this month. Add your first one.'",
      "Empty states: Educate and guide. Never leave users stuck.",
      "Microcopy: Confirm before destructive actions. Celebrate small wins.",
    ],
  },
  {
    id: "positioning",
    title: "Competitive Positioning",
    status: "action",
    kind: "boxes",
    boxes: [
      { title: "FOLLOW", bullets: ["Bottom navigation on mobile", "Card-based dashboard layout", "Grouped settings with section headers"] },
      { title: "BREAK", bullets: ["Conventional onboarding", "Hide empty states that educate and activate", "Dark mode as a cosmetic toggle"] },
      { title: "AVOID", bullets: ["Sidebar navigation on mobile", "Feature-gated dashboards", "Generic wellness look"] },
    ],
  },
  {
    id: "pages",
    title: "Key Pages & Objectives",
    status: "action",
    kind: "cards",
    cards: [
      {
        title: "Dashboard",
        objective: "Daily engagement - the reason users come back",
        kpi: "DAU, session duration",
        keyElement: "Actionable metrics at a glance. No vanity numbers.",
      },
      {
        title: "Dashboard",
        objective: "Daily engagement - the reason users come back",
        kpi: "DAU, session duration",
        keyElement: "Actionable metrics at a glance. No vanity numbers.",
      },
      {
        title: "Dashboard",
        objective: "Daily engagement - the reason users come back",
        kpi: "DAU, session duration",
        keyElement: "Actionable metrics at a glance. No vanity numbers.",
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility & Constraints",
    status: "action",
    kind: "table",
    table: [
      ["WCAG level", "AA minimum"],
      ["Contrast", "4.5:1 for body text, 3:1 for large text"],
      ["Touch targets", "44x44px minimum on mobile"],
      ["Responsive", "Desktop / Tablet / Mobile breakpoints"],
      ["Performance", "First contentful paint under 2 seconds"],
      ["Browser support", "Chrome, Safari, Firefox, Edge (no IE)"],
    ],
  },
];

export function StrategyTab() {
  const [sections, setSections] = useState(initialSections);
  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("Enter Title Here");
  const [draftBody, setDraftBody] = useState("");

  const approvedCount = useMemo(
    () => sections.filter((section) => section.status === "approved").length,
    [sections],
  );

  function approveSection(sectionId: string) {
    setSections((current) => current.map((section) => (
      section.id === sectionId ? { ...section, status: "approved" } : section
    )));
  }

  function regenerateSection(sectionId: string) {
    setSections((current) => current.map((section) => (
      section.id === sectionId
        ? { ...section, status: "action", body: section.body?.map((line) => `${line} Regenerated mock update.`) }
        : section
    )));
  }

  function saveDraftSection() {
    const title = draftTitle.trim() || "Untitled Strategy Section";
    const body = draftBody.trim() || "Write here...";
    setSections((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        title,
        status: "approved",
        kind: "paragraph",
        body: [body],
      },
    ]);
    setDraftTitle("Enter Title Here");
    setDraftBody("");
    setIsAdding(false);
  }

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white p-[clamp(24px,3.8vw,44px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-[10px] w-[65px] overflow-hidden rounded-full bg-[#E5E5E5]">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-[width]"
                  style={{ width: `${Math.max(8, (approvedCount / sections.length) * 100)}%` }}
                />
              </div>
              <p className="text-[13px] font-medium leading-none text-[#171717]">
                {approvedCount} of {sections.length} sections approved
              </p>
              <MetaDot />
              <p className="text-[13px] font-medium leading-none text-[#737373]">Total {sections.length} sections</p>
              <MetaDot />
              <p className="text-[13px] font-medium leading-none text-[#737373]">Based on Research</p>
            </div>
            <button type="button" className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F5F5]">
              <StrategyIcon />
              Edit Strategy
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {sections.map((section, index) => (
              <StrategySectionCard
                key={section.id}
                section={section}
                showDivider={index > 0}
                onApprove={() => approveSection(section.id)}
                onRegenerate={() => regenerateSection(section.id)}
              />
            ))}
          </div>

          {isAdding ? (
            <AddSectionEditor
              title={draftTitle}
              body={draftBody}
              onTitleChange={setDraftTitle}
              onBodyChange={setDraftBody}
              onSave={saveDraftSection}
              onCancel={() => setIsAdding(false)}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[6px] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F5F5]"
            >
              <PlusIcon />
              Add Section
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="inline-flex h-[29px] cursor-pointer items-center gap-[6px] rounded-[4px] bg-[#F5F5F5] p-2 text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC]">
                Add to notion
              </button>
              <button type="button" disabled className="inline-flex h-8 cursor-not-allowed items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-none text-[#FAFAFA] opacity-50 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                Continue to Flows
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategySectionCard({
  section,
  showDivider,
  onApprove,
  onRegenerate,
}: {
  section: StrategySection;
  showDivider: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {showDivider ? <div className="h-px w-full bg-[#E5E5E5]" /> : null}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-medium leading-none text-[#171717]">{section.title}</h2>
          <StatusPill status={section.status} />
        </div>
        <StrategyContent section={section} />
        {section.status === "action" ? (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-none text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95"
            >
              <CheckIcon />
              Approve & Save
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-none text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F3FF]"
            >
              <SparkleIcon />
              Regenerate with AI
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StrategyContent({ section }: { section: StrategySection }) {
  if (section.kind === "plain") {
    return (
      <div className="text-[13px] font-medium leading-[1.5] text-[#525252]">
        {section.body?.map((line) => <p key={line}>{line}</p>)}
      </div>
    );
  }

  if (section.kind === "principles" && section.principles) {
    return (
      <div className="flex w-full flex-col gap-4 text-[13px] font-medium">
        {section.principles.map((principle, index) => (
          <div key={principle.title} className="flex w-full flex-col gap-[2px]">
            <ol start={index + 1} className="list-decimal pl-[19.5px] leading-[1.5] text-[#0A0A0A]">
              <li>{principle.title}</li>
            </ol>
            <p className="leading-[1.5] text-[#525252]">{principle.body}</p>
            {principle.research ? (
              <p className="italic leading-[1.5] text-[#737373] opacity-90">
                {principle.research}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === "table" && section.table) {
    return (
      <div className="w-full overflow-x-auto pb-1">
        <div className="w-[600px] overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          {section.table.map(([label, value], index) => (
            <div key={label} className={cn("grid grid-cols-2", index < section.table!.length - 1 && "border-b border-[#E5E5E5]")}>
              <div className="border-r border-[#E5E5E5] bg-[rgba(217,217,217,0.1)] px-4 py-3 text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{label}</div>
              <div className="px-4 py-3 text-[14px] font-medium leading-[1.4] text-[#0A0A0A]">{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.kind === "cards" && section.cards) {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {section.cards.map((card) => (
          <article key={`${card.title}-${card.objective}`} className="rounded-[10px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <StrategyIcon />
                </div>
                <h3 className="text-[13px] font-semibold leading-none text-[#171717]">{card.title}</h3>
              </div>
              <div className="mt-4 flex flex-col gap-[10px] text-[13px] font-medium leading-none text-[#404040]">
                <p><span className="font-semibold text-[#0A0A0A]">Objective:</span> {card.objective}</p>
                <p><span className="font-semibold text-[#0A0A0A]">KPI:</span> {card.kpi}</p>
                <p><span className="font-semibold text-[#0A0A0A]">Key element:</span> {card.keyElement}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (section.kind === "boxes" && section.boxes) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {section.boxes.map((box) => (
          <article key={box.title} className="rounded-[8px] border border-[#E5E5E5] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]">
            <h3 className="text-[13px] font-semibold leading-none text-[#171717]">{box.title}</h3>
            <ul className="mt-3 list-disc space-y-1 pl-[19.5px] text-[12px] font-medium leading-[1.5] text-[#525252]">
              {box.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[8px] bg-[#F5F5F5] p-4 text-[13px] font-medium leading-[1.55] text-[#262626]">
      {section.body?.map((line) => <p key={line} className="mb-2 last:mb-0">{line}</p>)}
    </div>
  );
}

function AddSectionEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSave,
  onCancel,
}: {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="New strategy section title"
          className="h-[31px] w-[145px] rounded-[4px] bg-[#F5F5F5] px-3 text-[15px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] outline-none"
        />
      </div>
      <div className="flex min-h-[164px] flex-col justify-between rounded-[8px] bg-[#F5F5F5] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="Write here..."
          aria-label="New strategy section content"
          className="min-h-[96px] resize-none bg-transparent text-[13px] font-medium leading-[1.4] text-[#525252] outline-none placeholder:text-[#525252]"
        />
        <div className="flex gap-1">
          <button type="button" onClick={onSave} className="inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-none text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95">
            <CheckIcon />
            Approve & Save
          </button>
          <button type="button" onClick={onCancel} className="inline-flex h-[27px] cursor-pointer items-center rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-none text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)] hover:bg-[#FEF2F2]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SectionStatus }) {
  return status === "approved" ? (
    <span className="rounded-[4px] bg-[#DCFCE7] px-[6px] py-1 text-[12px] font-normal leading-none text-[#052E16]">Approved</span>
  ) : (
    <span className="rounded-[4px] bg-[#FEE2E2] px-[6px] py-1 text-[12px] font-normal leading-none text-[#450A0A]">Action Required</span>
  );
}

function MetaDot() {
  return <span className="h-1 w-1 rounded-full bg-[#D9D9D9]" />;
}

function CheckIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M2.5 6.25 5 8.5l4.5-5" /></svg>;
}

function SparkleIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M6 1.5 7.1 4.9 10.5 6 7.1 7.1 6 10.5 4.9 7.1 1.5 6 4.9 4.9 6 1.5Z" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="h-[14px] w-[14px]"><path d="M7 3v8M3 7h8" /></svg>;
}

function ArrowRightIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M6 3l5 5-5 5M10.5 8H3" /></svg>;
}

function StrategyIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px] shrink-0"><path d="M3 3h10v10H3z" /><path d="M6 6h4M6 8.5h4M6 11h2.5" /></svg>;
}
