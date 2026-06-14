import type { ResearchCompetitor } from "@/types/project/researchTab";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SectionTitle } from "./ResearchPrimitives";
import { CardIcon, MatrixIcon } from "./researchIcons";

type CompetitiveAnalysisProps = {
  isEditing: boolean;
  view: "card" | "matrix";
  competitors: ResearchCompetitor[];
  matrixRows: Array<{ label: string; values: string[] }>;
  onViewChange: (view: "card" | "matrix") => void;
  onCompetitorsChange?: (competitors: ResearchCompetitor[]) => void;
};

export function CompetitiveAnalysis({
  isEditing,
  view,
  competitors,
  matrixRows,
  onViewChange,
  onCompetitorsChange,
}: CompetitiveAnalysisProps) {
  function updateCompetitor(index: number, patch: Partial<ResearchCompetitor>) {
    onCompetitorsChange?.(
      competitors.map((competitor, competitorIndex) =>
        competitorIndex === index ? { ...competitor, ...patch } : competitor,
      ),
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Competitive Analysis</SectionTitle>
        <div className="flex items-start gap-1 rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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
        </div>
      </div>
      {view === "matrix" ? (
        <CompetitiveMatrix competitors={competitors} matrixRows={matrixRows} />
      ) : (
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {competitors.map((competitor, index) => (
            <CompetitorCard
              key={`${index}-${competitor.name}`}
              competitor={competitor}
              isEditing={isEditing}
              onChange={(patch) => updateCompetitor(index, patch)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CompetitiveMatrix({
  competitors,
  matrixRows,
}: {
  competitors: ResearchCompetitor[];
  matrixRows: Array<{ label: string; values: string[] }>;
}) {
  const gridTemplate = `220px repeat(${competitors.length}, minmax(130px, 1fr))`;
  const minWidth = 220 + competitors.length * 130;
  return (
    <div className="w-full overflow-x-auto rounded-[8px] pb-1">
      <div className="overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" style={{ minWidth }}>
        <div className="grid border-b border-[#D9D9D9]" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="border-r border-[#D9D9D9] bg-[#FBFBFB] px-4 py-3" />
          {competitors.map((competitor) => (
            <div key={competitor.name} className="flex items-center gap-2 border-r border-[#D9D9D9] bg-[#FBFBFB] px-4 py-3 last:border-r-0">
              <LogoMark competitor={competitor} compact />
              <span className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{competitor.name}</span>
            </div>
          ))}
        </div>
        {matrixRows.map((row, rowIndex) => (
          <div
            key={row.label}
            className={`grid ${rowIndex < matrixRows.length - 1 ? "border-b border-[#E8E8E8]" : ""}`}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="border-r border-[#E8E8E8] bg-[#FBFBFB] px-4 py-3 text-[12px] font-medium leading-[1.25] text-[#171717]">
              {row.label}
            </div>
            {row.values.map((value, index) => (
              <div key={`${row.label}-${competitors[index]?.name ?? index}`} className="border-r border-[#E8E8E8] px-4 py-3 last:border-r-0">
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

function CompetitorCard({
  competitor,
  isEditing,
  onChange,
}: {
  competitor: ResearchCompetitor;
  isEditing: boolean;
  onChange?: (patch: Partial<ResearchCompetitor>) => void;
}) {
  return (
    <article className="rounded-[10px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex h-full flex-col gap-4 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex items-center gap-3">
          <LogoMark competitor={competitor} />
          {isEditing ? (
            <div className="grid min-w-0 flex-1 gap-[6px]">
              <input value={competitor.name} onChange={(event) => onChange?.({ name: event.target.value })} aria-label={`${competitor.name} name`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
              <input value={competitor.url} onChange={(event) => onChange?.({ url: event.target.value })} aria-label={`${competitor.name} url`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[12px] font-medium leading-[1.25] text-[#737373]" />
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
            value={competitor.note}
            onChange={(event) => onChange?.({ note: event.target.value, tagline: event.target.value })}
            aria-label={`${competitor.name} positioning`}
            className="h-[31px] w-full rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium leading-[1.25] text-[#404040] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]"
          />
        ) : (
          <p className="text-[13px] font-medium leading-[1.25] text-[#404040]">
            "{competitor.tagline}" - {competitor.note}
          </p>
        )}
        <FindingList title="Strengths" tone="good" items={competitor.strengths} isEditing={isEditing} onItemsChange={(strengths) => onChange?.({ strengths })} />
        <FindingList title="Weaknesses" tone="bad" items={competitor.weaknesses} isEditing={isEditing} onItemsChange={(weaknesses) => onChange?.({ weaknesses })} />
      </div>
    </article>
  );
}

function LogoMark({ competitor, compact = false }: { competitor: ResearchCompetitor; compact?: boolean }) {
  return (
    <BrandLogo
      url={competitor.url}
      name={competitor.name}
      fallbackColor={competitor.color}
      fallbackMark={competitor.mark}
      size={compact ? 18 : 36}
      rounded={compact ? "rounded-[2px]" : "rounded-[8px]"}
    />
  );
}

function FindingList({
  title,
  tone,
  items,
  isEditing,
  onItemsChange,
}: {
  title: string;
  tone: "good" | "bad";
  items: string[];
  isEditing: boolean;
  onItemsChange?: (items: string[]) => void;
}) {
  return (
    <div>
      <p className={`px-[10px] pt-[6px] text-[12px] font-semibold uppercase leading-[1.25] ${tone === "good" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
        {title}
      </p>
      {isEditing ? (
        <textarea
          value={items.map((item) => `- ${item}`).join("\n")}
          onChange={(event) => onItemsChange?.(parseListTextarea(event.target.value))}
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

function parseListTextarea(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}
