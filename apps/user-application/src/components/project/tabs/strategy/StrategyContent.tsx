import { cn } from "@/lib/utils";
import type { StrategySection } from "@/models/project/strategyTab";
import { StrategyIcon } from "./strategyIcons";

function parseLabeledLine(line: string) {
  const match = line.match(/^([^:]{2,40}):\s*(.+)$/);
  if (!match) {
    return null;
  }

  return {
    label: match[1].trim(),
    value: match[2].trim(),
  };
}

export function StrategyContent({
  section,
  variant = "default",
}: {
  section: StrategySection;
  variant?: "default" | "edit";
}) {
  if (section.kind === "plain") {
    return (
      <div className={cn("text-[13px] font-medium leading-[1.5]", variant === "edit" ? "text-[#404040]" : "text-[#525252]")}>
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
                <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{card.title}</h3>
              </div>
              <div className="mt-4 flex flex-col gap-[10px] text-[13px] font-medium leading-[1.25] text-[#404040]">
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
            <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{box.title}</h3>
            <ul className="mt-3 list-disc space-y-1 pl-[19.5px] text-[12px] font-medium leading-[1.5] text-[#525252]">
              {box.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </article>
        ))}
      </div>
    );
  }

  if (section.kind === "paragraph") {
    const labeledRows = (section.body ?? [])
      .map((line) => ({ raw: line, parsed: parseLabeledLine(line) }));
    const hasLabels = labeledRows.some((row) => row.parsed);

    return (
      <div
        className={cn(
          "rounded-[8px] bg-[#F5F5F5] p-4 text-[13px] font-medium",
          variant === "edit" ? "text-[#404040]" : "text-[#262626]",
        )}
      >
        {hasLabels ? (
          <div className="flex flex-col gap-3">
            {labeledRows.map((row) => (
              <div key={row.raw} className="flex flex-col gap-1">
                {row.parsed ? (
                  <>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#171717]">
                      {row.parsed.label}
                    </p>
                    <p className="leading-[1.55] text-[#525252]">{row.parsed.value}</p>
                  </>
                ) : (
                  <p className="leading-[1.55] text-[#525252]">{row.raw}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          section.body?.map((line) => (
            <p key={line} className="mb-2 last:mb-0">
              {line}
            </p>
          ))
        )}
      </div>
    );
  }

  return (
    <div className={cn("text-[13px] font-medium leading-[1.55] text-[#262626]", variant === "default" && "rounded-[8px] bg-[#F5F5F5] p-4")}>
      {section.body?.map((line) => <p key={line} className="mb-2 last:mb-0">{line}</p>)}
    </div>
  );
}
