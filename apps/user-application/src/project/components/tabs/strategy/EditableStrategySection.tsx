import { cn } from "@/lib/utils";
import type { StrategySection } from "../../../models/strategyTab";
import { RegenerateIcon } from "./strategyIcons";

export function EditableStrategyContent({
  section,
  onChange,
  onRegenerate,
}: {
  section: StrategySection;
  onChange: (section: StrategySection) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-[8px] bg-[#F5F5F5] p-3 text-[13px] font-medium leading-[1.5] text-[#404040] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <EditableStrategyFields section={section} onChange={onChange} />
      <button
        type="button"
        onClick={onRegenerate}
        className="inline-flex h-[27px] w-fit cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F3FF]"
      >
        <RegenerateIcon />
        Regenerate with AI
      </button>
    </div>
  );
}

function EditableStrategyFields({
  section,
  onChange,
}: {
  section: StrategySection;
  onChange: (section: StrategySection) => void;
}) {
  if (section.kind === "principles" && section.principles) {
    return (
      <div className="flex flex-col gap-4">
        {section.principles.map((principle, index) => (
          <div key={`${principle.title}-${index}`} className="flex flex-col gap-[6px]">
            <div className="flex items-center gap-2">
              <span className="w-[18px] text-[13px] font-medium text-[#0A0A0A]">{index + 1}.</span>
              <input
                value={principle.title}
                onChange={(event) => {
                  const principles = section.principles!.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, title: event.target.value } : item
                  ));
                  onChange({ ...section, principles });
                }}
                aria-label={`${section.title} principle ${index + 1} title`}
                className="min-w-0 flex-1 bg-transparent text-[13px] font-medium leading-[1.5] text-[#0A0A0A] outline-none"
              />
            </div>
            <textarea
              value={principle.body}
              onChange={(event) => {
                const principles = section.principles!.map((item, itemIndex) => (
                  itemIndex === index ? { ...item, body: event.target.value } : item
                ));
                onChange({ ...section, principles });
              }}
              aria-label={`${section.title} principle ${index + 1} body`}
              className="min-h-[28px] resize-y bg-transparent text-[13px] font-medium leading-[1.5] text-[#525252] outline-none"
            />
            <input
              value={principle.research ?? ""}
              onChange={(event) => {
                const principles = section.principles!.map((item, itemIndex) => (
                  itemIndex === index ? { ...item, research: event.target.value } : item
                ));
                onChange({ ...section, principles });
              }}
              placeholder="Research note"
              aria-label={`${section.title} principle ${index + 1} research`}
              className="bg-transparent text-[13px] font-medium italic leading-[1.5] text-[#737373] opacity-90 outline-none placeholder:text-[#A3A3A3]"
            />
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === "table" && section.table) {
    return (
      <div className="overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white">
        {section.table.map(([label, value], index) => (
          <div key={`${label}-${index}`} className={cn("grid grid-cols-2", index < section.table!.length - 1 && "border-b border-[#E5E5E5]")}>
            <input
              value={label}
              onChange={(event) => {
                const table = section.table!.map((row, rowIndex) => (
                  rowIndex === index ? [event.target.value, row[1]] as [string, string] : row
                ));
                onChange({ ...section, table });
              }}
              aria-label={`${section.title} row ${index + 1} label`}
              className="border-r border-[#E5E5E5] bg-[rgba(217,217,217,0.1)] px-4 py-3 text-[14px] font-medium leading-[1.2] text-[#0A0A0A] outline-none"
            />
            <input
              value={value}
              onChange={(event) => {
                const table = section.table!.map((row, rowIndex) => (
                  rowIndex === index ? [row[0], event.target.value] as [string, string] : row
                ));
                onChange({ ...section, table });
              }}
              aria-label={`${section.title} row ${index + 1} value`}
              className="bg-white px-4 py-3 text-[14px] font-medium leading-[1.4] text-[#0A0A0A] outline-none"
            />
          </div>
        ))}
      </div>
    );
  }

  if (section.kind === "cards" && section.cards) {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {section.cards.map((card, index) => (
          <article key={`${card.title}-${index}`} className="rounded-[10px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <input
                value={card.title}
                onChange={(event) => {
                  const cards = section.cards!.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, title: event.target.value } : item
                  ));
                  onChange({ ...section, cards });
                }}
                aria-label={`${section.title} card ${index + 1} title`}
                className="w-full bg-transparent text-[13px] font-semibold leading-[1.25] text-[#171717] outline-none"
              />
              <CardField label="Objective" value={card.objective} onChange={(value) => {
                const cards = section.cards!.map((item, itemIndex) => itemIndex === index ? { ...item, objective: value } : item);
                onChange({ ...section, cards });
              }} />
              <CardField label="KPI" value={card.kpi} onChange={(value) => {
                const cards = section.cards!.map((item, itemIndex) => itemIndex === index ? { ...item, kpi: value } : item);
                onChange({ ...section, cards });
              }} />
              <CardField label="Key element" value={card.keyElement} onChange={(value) => {
                const cards = section.cards!.map((item, itemIndex) => itemIndex === index ? { ...item, keyElement: value } : item);
                onChange({ ...section, cards });
              }} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (section.kind === "boxes" && section.boxes) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {section.boxes.map((box, index) => (
          <article key={`${box.title}-${index}`} className="rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]">
            <input
              value={box.title}
              onChange={(event) => {
                const boxes = section.boxes!.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item);
                onChange({ ...section, boxes });
              }}
              aria-label={`${section.title} box ${index + 1} title`}
              className="w-full bg-transparent text-[13px] font-semibold leading-[1.25] text-[#171717] outline-none"
            />
            <textarea
              value={box.bullets.join("\n")}
              onChange={(event) => {
                const boxes = section.boxes!.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: event.target.value.split("\n") } : item);
                onChange({ ...section, boxes });
              }}
              aria-label={`${section.title} box ${index + 1} bullets`}
              className="mt-3 min-h-[72px] w-full resize-y bg-transparent text-[12px] font-medium leading-[1.5] text-[#525252] outline-none"
            />
          </article>
        ))}
      </div>
    );
  }

  return (
    <textarea
      value={section.body?.join("\n\n") ?? ""}
      onChange={(event) => onChange({ ...section, body: event.target.value.split(/\n{2,}/) })}
      aria-label={`${section.title} content`}
      className="min-h-[96px] w-full resize-y bg-transparent text-[13px] font-medium leading-[1.5] text-[#404040] outline-none"
    />
  );
}

function CardField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-[10px] flex flex-col gap-[4px] text-[13px] font-medium text-[#404040]">
      <span className="font-semibold text-[#0A0A0A]">{label}:</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[24px] resize-y bg-transparent leading-[1.25] outline-none"
      />
    </label>
  );
}
