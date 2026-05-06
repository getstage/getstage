import { useEffect, useState } from "react";
import type { Project } from "../../models/project";

const mobbinMark = "https://www.figma.com/api/mcp/asset/800c9df1-6961-4e6b-829e-b5ba505589c7";

const uiPatternImages = [
  "https://www.figma.com/api/mcp/asset/04dc8f56-ef85-44f8-a67f-6553931f16d5",
  "https://www.figma.com/api/mcp/asset/0291ffca-503d-4d55-b959-d0057e0af071",
  "https://www.figma.com/api/mcp/asset/0388d063-7f52-4832-aee8-9be741946c54",
];

const researchSummary = [
  "Client operates in B2B fintech. 8 direct competitors identified.",
  "85% of competitors use bottom navigation on mobile. Card-based dashboards dominate.",
  "Biggest gap: onboarding. 0 of 6 competitors handle it well - most use static form flows.",
  "Market skews toward light, minimal interfaces. Dark mode is underserved.",
  "Differentiation opportunity in data visualization and empty states.",
];

const companySnapshot = [
  ["Company", "Acme Inc."],
  ["Industry", "Fintech / Payments"],
  ["Product", "B2B SaaS Dashboard"],
  ["Target User", "SMB finance teams"],
  ["Platform", "Web + iOS"],
  ["Stage", "Series A, 50K users"],
  ["Website", "acme.com"],
];

const competitors = [
  {
    name: "Zapier",
    url: "zapier.com",
    mark: "zapier",
    color: "#FF4A00",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
  {
    name: "Spotify",
    url: "spotify.com",
    mark: "S",
    color: "#1ED760",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
  {
    name: "Stripe",
    url: "stripe.com",
    mark: "",
    color: "#635BFF",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
  {
    name: "X",
    url: "x.com",
    mark: "X",
    color: "#050505",
    tagline: "Easy automation for busy people",
    note: "The dominant horizontal player",
    strengths: ["Sticky header with Primary CTA", "Dropdown menu with secondary options", "Search bar with filter capabilities"],
    weaknesses: ["Sticky header with Primary CTA", "Contextual help tooltip for user guidance", "User avatar with dropdown profile settings"],
  },
];

const competitiveMatrixRows = [
  { label: "Navigation", values: ["Strong", "Strong", "Strong", "Strong"] },
  { label: "Onboarding", values: ["OK", "Strong", "Strong", "Strong"] },
  { label: "Visual Style", values: ["Weak", "OK", "Strong", "Weak"] },
  { label: "Content Hierarchy", values: ["Strong", "Weak", "Strong", "Strong"] },
  { label: "Mobile Experience", values: ["Strong", "Strong", "Weak", "Strong"] },
  { label: "Dashboard Layout", values: ["Strong", "OK", "OK", "OK"] },
  { label: "Data Visualization", values: ["Strong", "Weak", "OK", "OK"] },
];

const uiPatterns = [
  ["Outcome-led headlines, not features list", "Heroes describe what the user achieves. \"Stop X, start Y\" pattern common."],
  ["Persistent primary action", "Competitors keep one clear next step available across dashboard and detail views."],
  ["Card-first dashboards", "Summary cards introduce data before tables, keeping scanning fast for busy teams."],
  ["Inline guidance beats help centers", "Short contextual prompts appear beside complex forms and setup workflows."],
  ["Empty states teach the workflow", "The strongest products explain why a blank state matters and what to add next."],
  ["Progressive disclosure", "Advanced filters and settings stay tucked away until the user needs deeper control."],
  ["Status language is plain", "Labels favor human-readable states like Needs review over technical system names."],
  ["Trust cues near decisions", "Security, approvals, and audit details appear close to export or payment actions."],
];

const uiPatternGroups = [
  { id: "onboarding", title: "Onboarding", images: [uiPatternImages[0], uiPatternImages[1], uiPatternImages[2]] },
  { id: "dashboard", title: "Dashboard", images: [uiPatternImages[1], uiPatternImages[0], uiPatternImages[2]] },
  { id: "pricing", title: "Pricing", images: [uiPatternImages[0], uiPatternImages[2], uiPatternImages[1]] },
];

const targetUsers = [
  {
    name: "Sarah, 32",
    role: "Finance Manager",
    goals: "Track team expenses without switching between 4 tools",
    frustration: "Current tool requires training for every new hire",
    context: "Desktop-first, uses 3x per day, always multitasking",
  },
  {
    name: "Marcus, 41",
    role: "Operations Lead",
    goals: "Approve spend, reconcile exceptions, and keep audit trails clean",
    frustration: "Approvals get buried across email, chat, and disconnected dashboards",
    context: "Works across finance and leadership, needs fast confidence checks",
  },
];

const opportunities = [
  "Onboarding is broken across the space. 0 of 6 competitors handle it well. Most use static form-based flows. Opportunity for conversational onboarding.",
  "Mobile is an afterthought. 4 of 6 competitors have poor mobile UX. First-class mobile would differentiate.",
  "No one leverages empty states. Every competitor shows blank pages. Educational empty states would improve activation.",
  "Dark mode is underserved. Only 1 of 6 offers it. Growing demand in developer/finance audiences.",
];

export function ResearchTab({ project: _project }: { project: Project }) {
  const [isEditing, setIsEditing] = useState(false);
  const [openPatternGroup, setOpenPatternGroup] = useState<string | null>(null);
  const [competitiveView, setCompetitiveView] = useState<"card" | "matrix">("card");
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!openPhoto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openPhoto]);

  return (
    <>
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-[44px]">
            <ResearchSummary
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDiscard={() => setIsEditing(false)}
              onSave={() => setIsEditing(false)}
            />
            <Divider />
            <CompanySnapshot isEditing={isEditing} />
            <Divider />
            <CompetitiveAnalysis
              isEditing={isEditing}
              view={competitiveView}
              onViewChange={setCompetitiveView}
            />
            <Divider />
            <UiPatterns
              isEditing={isEditing}
              openGroupId={openPatternGroup}
              onToggleGroup={(groupId) => setOpenPatternGroup((current) => (current === groupId ? null : groupId))}
              onOpenPhoto={setOpenPhoto}
            />
            <Divider />
            <TargetUsers isEditing={isEditing} />
            <Divider />
            <Opportunities isEditing={isEditing} />
            <Divider />
            <ResearchActions />
          </div>
        </div>
      </section>
      {openPhoto ? <PhotoLightbox src={openPhoto} onClose={() => setOpenPhoto(null)} /> : null}
    </>
  );
}

function ResearchSummary({
  isEditing,
  onEdit,
  onDiscard,
  onSave,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">Research Summary</h2>
        {isEditing ? (
          <div className="flex shrink-0 items-start gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex h-[31px] items-center justify-center rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEE2E2]"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex h-[31px] items-center justify-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
            >
              <SaveIcon />
              Save Changes
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            <EditIcon />
            Edit Research
          </button>
        )}
      </div>
      {isEditing ? (
        <textarea
          defaultValue={researchSummary.join(" ")}
          className="min-h-[124px] w-full resize-y rounded-[8px] border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-[10px] text-[13px] font-medium leading-[1.5] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]"
          aria-label="Research summary"
        />
      ) : (
        <ul className="list-disc space-y-0 pl-[19.5px] text-[13px] font-medium leading-[1.5] text-[#525252]">
          {researchSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CompanySnapshot({ isEditing }: { isEditing: boolean }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Company Snapshot</SectionTitle>
      <div className="w-full overflow-x-auto pb-1">
        <div className="w-[600px] overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          {companySnapshot.map(([label, value], index) => (
            <div key={label} className={`grid grid-cols-2 ${index < companySnapshot.length - 1 ? "border-b border-[#E8E8E8]" : ""}`}>
              <div className="border-r border-[#E8E8E8] bg-[#FBFBFB] px-4 py-3 text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                {label}
              </div>
              {isEditing ? (
                <div className="p-2">
                  <input
                    defaultValue={value}
                    aria-label={label}
                    className="h-[25px] w-full rounded-[5px] bg-[#F5F5F5] px-2 text-[14px] font-medium leading-[1.25] text-[#0A0A0A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]"
                  />
                </div>
              ) : (
                <div className="px-4 py-3 text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                  {value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetitiveAnalysis({
  isEditing,
  view,
  onViewChange,
}: {
  isEditing: boolean;
  view: "card" | "matrix";
  onViewChange: (view: "card" | "matrix") => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Competitive Analysis</SectionTitle>
        <div className="flex items-start gap-1 rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <button
            type="button"
            onClick={() => onViewChange("card")}
            className={`inline-flex h-7 cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] ${
              view === "card"
                ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                : "text-[#737373]"
            }`}
          >
            <CardIcon />
            Card View
          </button>
          <button
            type="button"
            onClick={() => onViewChange("matrix")}
            className={`inline-flex h-7 cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] ${
              view === "matrix"
                ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                : "text-[#737373]"
            }`}
          >
            <MatrixIcon />
            Matrix View
          </button>
        </div>
      </div>
      {view === "matrix" ? (
        <CompetitiveMatrix />
      ) : (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {competitors.map((competitor) => (
            <CompetitorCard key={competitor.name} competitor={competitor} isEditing={isEditing} />
          ))}
        </div>
      )}
    </section>
  );
}

function CompetitiveMatrix() {
  return (
    <div className="w-full overflow-x-auto rounded-[8px] pb-1">
      <div className="min-w-[820px] overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="grid grid-cols-[220px_repeat(4,minmax(130px,1fr))] border-b border-[#D9D9D9]">
          <div className="border-r border-[#D9D9D9] bg-[#FBFBFB] px-4 py-3" />
          {competitors.map((competitor) => (
            <div key={competitor.name} className="flex items-center gap-2 border-r border-[#D9D9D9] bg-[#FBFBFB] px-4 py-3 last:border-r-0">
              <LogoMark competitor={competitor} compact />
              <span className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{competitor.name}</span>
            </div>
          ))}
        </div>
        {competitiveMatrixRows.map((row, rowIndex) => (
          <div
            key={row.label}
            className={`grid grid-cols-[220px_repeat(4,minmax(130px,1fr))] ${rowIndex < competitiveMatrixRows.length - 1 ? "border-b border-[#E8E8E8]" : ""}`}
          >
            <div className="border-r border-[#E8E8E8] bg-[#FBFBFB] px-4 py-3 text-[12px] font-medium leading-[1.25] text-[#171717]">
              {row.label}
            </div>
            {row.values.map((value, index) => (
              <div key={`${row.label}-${competitors[index].name}`} className="border-r border-[#E8E8E8] px-4 py-3 last:border-r-0">
                <MatrixScore value={value} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatrixScore({ value }: { value: string }) {
  const color = value === "Strong" ? "#16A34A" : value === "Weak" ? "#EF4444" : "#F97316";
  return (
    <span className="text-[12px] font-medium leading-[1.25]" style={{ color }}>
      {value}
    </span>
  );
}

function CompetitorCard({ competitor, isEditing }: { competitor: typeof competitors[number]; isEditing: boolean }) {
  return (
    <article className="rounded-[10px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex h-full flex-col gap-4 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex items-center gap-3">
          <LogoMark competitor={competitor} />
          {isEditing ? (
            <div className="grid min-w-0 flex-1 gap-[6px]">
              <input defaultValue={competitor.name} aria-label={`${competitor.name} name`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
              <input defaultValue={competitor.url} aria-label={`${competitor.name} url`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[12px] font-medium leading-[1.25] text-[#737373]" />
            </div>
          ) : (
            <div>
              <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{competitor.name}</h3>
              <p className="mt-[2px] text-[12px] font-medium leading-[1.5] text-[#737373]">{competitor.url}</p>
            </div>
          )}
        </div>
        {isEditing ? (
          <input
            defaultValue={`"${competitor.tagline}" - ${competitor.note}`}
            aria-label={`${competitor.name} positioning`}
            className="h-[31px] w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-[1.25] text-[#404040] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]"
          />
        ) : (
          <p className="text-[13px] font-medium leading-[1.25] text-[#404040]">
            "{competitor.tagline}" - {competitor.note}
          </p>
        )}
        <FindingList title="Strengths" tone="good" items={competitor.strengths} isEditing={isEditing} />
        <FindingList title="Weaknesses" tone="bad" items={competitor.weaknesses} isEditing={isEditing} />
      </div>
    </article>
  );
}

function LogoMark({ competitor, compact = false }: { competitor: typeof competitors[number]; compact?: boolean }) {
  const sizeClass = compact ? "h-[18px] w-[18px] rounded-[2px]" : "h-9 w-9 rounded-[8px]";

  if (competitor.name === "Stripe") {
    return (
      <div className={`flex items-center justify-center ${sizeClass}`} style={{ background: competitor.color }}>
        <div className={`${compact ? "h-[7px] w-[10px]" : "h-[14px] w-[20px]"} -skew-x-12 rounded-[2px] bg-white`} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center text-[10px] font-semibold leading-[1.25] text-white ${sizeClass}`}
      style={{ background: competitor.color }}
    >
      <span className={compact ? "scale-[0.7]" : ""}>{competitor.mark}</span>
    </div>
  );
}

function FindingList({
  title,
  tone,
  items,
  isEditing,
}: {
  title: string;
  tone: "good" | "bad";
  items: string[];
  isEditing: boolean;
}) {
  return (
    <div>
      <p className={`px-[10px] pt-[6px] text-[12px] font-semibold uppercase leading-[1.25] ${tone === "good" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
        {title}
      </p>
      {isEditing ? (
        <textarea
          defaultValue={items.map((item) => `- ${item}`).join("\n")}
          aria-label={title}
          className="mt-[7px] min-h-[78px] w-full resize-y rounded-[6px] bg-[#F5F5F5] px-3 py-2 text-[12px] font-medium leading-[1.45] text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]"
        />
      ) : (
        <ul className="list-disc space-y-[7px] pl-[28px] pr-3 pt-[7px] text-[12px] font-medium leading-[1.25] text-[#262626]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UiPatterns({
  isEditing,
  openGroupId,
  onToggleGroup,
  onOpenPhoto,
}: {
  isEditing: boolean;
  openGroupId: string | null;
  onToggleGroup: (groupId: string) => void;
  onOpenPhoto: (src: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">UI Patterns</h2>
          <div className="h-1 w-1 rounded-full bg-[#A3A3A3]" />
          <div className="flex items-center gap-2">
            <img src={mobbinMark} alt="" className="h-[10px] w-[22px]" />
            <p className="text-[12px] font-medium leading-[1.25] text-[#525252]">Analysed with Mobbin</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {uiPatternGroups.map((group) => (
          <UiPatternGroup
            key={group.id}
            group={group}
            isEditing={isEditing}
            isOpen={openGroupId === group.id}
            onToggle={() => onToggleGroup(group.id)}
            onOpenPhoto={onOpenPhoto}
          />
        ))}
      </div>
    </section>
  );
}

function UiPatternGroup({
  group,
  isEditing,
  isOpen,
  onToggle,
  onOpenPhoto,
}: {
  group: typeof uiPatternGroups[number];
  isEditing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onOpenPhoto: (src: string) => void;
}) {
  return (
    <article className="rounded-[10px] bg-[#FAFAFA] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-[13px] font-medium leading-[1.25] text-[#171717]">{group.title}</h3>
        <div className="flex h-[22px] items-start gap-[2px] rounded-[6px] bg-[#F4F4F5] p-[2px]">
          <button type="button" className="flex h-full items-center justify-center rounded-[4px] px-2 text-[#71717A] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.07)]" aria-label={`Previous ${group.title} patterns`}>
            <ArrowLeftMiniIcon />
          </button>
          <button type="button" className="flex h-full items-center justify-center rounded-[4px] bg-white px-2 text-[#18181B] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.07)]" aria-label={`Next ${group.title} patterns`}>
            <ArrowRightMiniIcon />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
        {group.images.map((src, index) => (
          <button
            key={`${group.id}-${src}-${index}`}
            type="button"
            onClick={() => onOpenPhoto(src)}
            className="group rounded-[8px] bg-white p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-transform hover:-translate-y-px"
            aria-label={`Open ${group.title} reference ${index + 1}`}
          >
            <div className="aspect-[1920/1325] overflow-hidden rounded-[4px]">
              <img src={src} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.01]" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-1 overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between p-4 text-left"
          aria-expanded={isOpen}
        >
          <span className="text-[13px] font-semibold leading-[1.25] text-[#171717]">Patterns Recognised</span>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>

        {isOpen ? (
          <div className="flex flex-col gap-4 border-t border-[#F5F5F5] px-4 pb-4">
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {uiPatterns.map(([title, body]) => (
                <PatternCard key={title} title={title} body={body} isEditing={isEditing} />
              ))}
            </div>

            {isEditing ? (
              <button type="button" className="inline-flex h-[27px] w-fit cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]">
                <RegenerateIcon />
                Regenerate with AI
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PatternCard({ title, body, isEditing }: { title: string; body: string; isEditing: boolean }) {
  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-h-[70px] gap-3 rounded-[6px] p-4">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#E7E6FD] p-1 text-[#16115A]">
          <PatternIcon />
        </div>
        {isEditing ? (
          <div className="grid min-w-0 flex-1 gap-[6px]">
            <input defaultValue={title} aria-label={`${title} title`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
            <textarea defaultValue={body} aria-label={`${title} body`} className="min-h-[54px] resize-y rounded-[6px] bg-[#F5F5F5] px-2 py-[7px] text-[12px] font-medium leading-[1.5] text-[#737373]" />
          </div>
        ) : (
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{title}</h3>
            <p className="mt-1 text-[12px] font-medium leading-[1.5] text-[#737373]">{body}</p>
          </div>
        )}
      </div>
    </article>
  );
}

function TargetUsers({ isEditing }: { isEditing: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Target Users</SectionTitle>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {targetUsers.map((user) => (
          <article key={user.name} className="rounded-[10px] bg-[#FAFAFA] p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5E5E5] text-[13px] font-semibold text-[#525252]">
                {user.name.charAt(0)}
              </div>
              <div>
                {isEditing ? (
                  <div className="grid gap-[6px]">
                    <input defaultValue={user.name} aria-label={`${user.name} name`} className="h-[25px] rounded-[5px] bg-white px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
                    <input defaultValue={user.role} aria-label={`${user.name} role`} className="h-[25px] rounded-[5px] bg-white px-2 text-[12px] font-medium leading-[1.25] text-[#737373]" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{user.name}</h3>
                    <p className="mt-[2px] text-[12px] font-medium leading-[1.5] text-[#737373]">{user.role}</p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-[12px] font-medium leading-[1.35]">
              <UserDetail label="Goals" value={user.goals} isEditing={isEditing} />
              <UserDetail label="Frustration" value={user.frustration} isEditing={isEditing} />
              <UserDetail label="Context" value={user.context} isEditing={isEditing} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserDetail({ label, value, isEditing }: { label: string; value: string; isEditing: boolean }) {
  return (
    <div>
      <p className="text-[#171717]">{label}:</p>
      {isEditing ? (
        <input defaultValue={value} aria-label={label} className="mt-1 h-[27px] w-full rounded-[5px] bg-white px-2 text-[#525252]" />
      ) : (
        <p className="mt-1 text-[#525252]">{value}</p>
      )}
    </div>
  );
}

function Opportunities({ isEditing }: { isEditing: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Opportunities</SectionTitle>
      {isEditing ? (
        <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FAFAFA] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
          <textarea
            defaultValue={opportunities.join(" ")}
            aria-label="Opportunities"
            className="min-h-[80px] w-full resize-y bg-transparent text-[13px] font-medium leading-[1.5] text-[#525252]"
          />
          <button type="button" className="mt-4 inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]">
            <RegenerateIcon />
            Regenerate with AI
          </button>
        </div>
      ) : (
        <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
          {opportunities.join(" ")}
        </p>
      )}
    </section>
  );
}

function ResearchActions() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <button type="button" className="inline-flex h-8 items-center gap-2 rounded-[6px] text-[13px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717]">
        <PlusIcon />
        Add Section
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="inline-flex h-[31px] items-center gap-[6px] rounded-[6px] bg-[#F5F5F5] px-2 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]">
          <NotionIcon />
          Export to Notion
        </button>
        <button type="button" className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95">
          Generate Strategy
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}

function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-label="Research reference preview"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out"
        aria-label="Close photo preview"
        onClick={onClose}
      />
      <div className="relative h-[min(828px,calc(100vh-48px))] w-[min(1200px,calc(100vw-48px))] rounded-[4px] shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-[4px] object-cover"
        />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">{children}</h2>;
}

function Divider() {
  return <div className="h-px w-full bg-[#E5E5E5]" />;
}

function EditIcon() {
  return <img src="/logos/dashboard/edit.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px] shrink-0" />;
}

function CardIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/card-view.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/card-view.svg") center / contain no-repeat',
      }}
    />
  );
}

function MatrixIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/matrix-view.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/matrix-view.svg") center / contain no-repeat',
      }}
    />
  );
}

function PatternIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
      <path d="M3.2 3.2h9.6v1.6H3.2V3.2Zm0 4h9.6v1.6H3.2V7.2Zm0 4h6.4v1.6H3.2v-1.6Z" />
    </svg>
  );
}

function RegenerateIcon() {
  return <img src="/logos/dashboard/regenerate.svg" alt="" aria-hidden="true" className="h-3 w-3 shrink-0" />;
}

function SaveIcon() {
  return (
    <img src="/logos/dashboard/save-changes.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-[15px] w-[15px]">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function NotionIcon() {
  return (
    <img src="/logos/integrations/notion.svg" alt="" aria-hidden="true" className="h-[13px] w-[13px] shrink-0" />
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
    </svg>
  );
}

function ArrowLeftMiniIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
      <path d="M8.75 3.5 5.25 7l3.5 3.5M5.5 7h6" />
    </svg>
  );
}

function ArrowRightMiniIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[14px] w-[14px]">
      <path d="M5.25 3.5 8.75 7l-3.5 3.5M2.5 7h6" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#525252" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m5 12 5-5 5 5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="#525252" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}
