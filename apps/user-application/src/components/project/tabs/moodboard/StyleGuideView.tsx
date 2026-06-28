import { useEffect, useState, type ReactNode } from "react";
import { defaultStyleGuide } from "@/mock/project/moodboard";
import type { MoodboardStyleGuideViewData } from "@/types/project/moodboardTab";
import { EditIcon, PlusIcon, RegenerateIcon } from "./moodboardIcons";

type TypographyRow = MoodboardStyleGuideViewData["typography"]["rows"][number];
type AtmosphereMetric = MoodboardStyleGuideViewData["atmosphere"][number];

export function StyleGuideView({
  styleGuide = defaultStyleGuide,
  onBack,
  onRegenerate,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
}: {
  styleGuide?: MoodboardStyleGuideViewData;
  onBack: () => void;
  onRegenerate: () => void;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (guide: MoodboardStyleGuideViewData) => void;
  onCancel?: () => void;
}) {
  const [previewSize, setPreviewSize] = useState(styleGuide.typography.previewSize);
  const [fontFamily, setFontFamily] = useState(styleGuide.typography.fontFamily);
  const [customRows, setCustomRows] = useState<TypographyRow[]>([]);
  const [draftAtmosphere, setDraftAtmosphere] = useState<AtmosphereMetric[]>(styleGuide.atmosphere);
  const previewProgress = ((previewSize - 12) / (48 - 12)) * 100;
  const renderedRows = [...styleGuide.typography.rows, ...customRows];
  const componentSwatches = Array.from({ length: styleGuide.componentSwatchCount }, (_, index) => index);

  useEffect(() => {
    if (isEditing) {
      setPreviewSize(styleGuide.typography.previewSize);
      setFontFamily(styleGuide.typography.fontFamily);
      setCustomRows([]);
      setDraftAtmosphere(styleGuide.atmosphere);
    }
  }, [isEditing, styleGuide]);

  function addTypographyRow() {
    const weight = previewSize >= 15 ? "Semi-Bold" : "Medium";
    const id = `${previewSize}-${weight.toLowerCase()}-${customRows.length}`;
    setCustomRows((current) => [
      ...current,
      {
        id,
        size: previewSize,
        weight,
        className: weight === "Semi-Bold" ? "font-semibold" : "font-medium",
        lineHeight: previewSize <= 12 ? "150%" : "100%",
      },
    ]);
  }

  function handleSave() {
    if (!onSave) return;
    onSave({
      ...styleGuide,
      atmosphere: draftAtmosphere,
      typography: {
        ...styleGuide.typography,
        fontFamily,
        previewSize,
        rows: [...styleGuide.typography.rows, ...customRows],
      },
    });
  }

  function handleCancel() {
    setPreviewSize(styleGuide.typography.previewSize);
    setFontFamily(styleGuide.typography.fontFamily);
    setCustomRows([]);
    setDraftAtmosphere(styleGuide.atmosphere);
    onCancel?.();
  }

  return (
    <section className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit cursor-pointer items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#A3A3A3] transition-colors hover:text-[#737373]"
        >
          <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />
          Back to moodboard
        </button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium leading-[1.25] text-[#0A0A0A]">{styleGuide.title}</h2>
            <p className="mt-1 text-[12px] font-medium leading-[1.5] text-[#525252]">
              {styleGuide.subtitle ?? "Brand Handbook for your project"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
          {isEditing ? (
            <>
              <HeaderButton onClick={handleSave}>
                Save
              </HeaderButton>
              <HeaderButton onClick={handleCancel}>
                Cancel
              </HeaderButton>
            </>
          ) : (
            <>
              <HeaderButton onClick={onEdit}>
                <EditIcon />
                Edit
              </HeaderButton>
              <HeaderButton onClick={onRegenerate}>
                <RegenerateIcon />
                Regenerate
              </HeaderButton>
            </>
          )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] bg-white p-5 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] sm:p-7 lg:p-11">
        <div className="flex min-w-0 flex-col gap-11">
          <StyleSection title="Atmosphere">
            <div className="grid gap-2 lg:grid-cols-3">
              {styleGuide.atmosphere.map((metric, index) => (
                <AtmosphereMetric
                  key={metric.label}
                  {...(isEditing ? draftAtmosphere[index] ?? metric : metric)}
                  editable={isEditing}
                  onPositionChange={(position) =>
                    setDraftAtmosphere((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, position } : entry,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </StyleSection>

          <Divider />

          <StyleSection title="Color Palette">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {styleGuide.colorPalettes.map((group) => (
                <div key={group.label} className="min-w-0">
                  <div className="mb-2 flex h-5 items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[15px] font-medium leading-none text-[#171717]">
                      {group.label}
                    </p>
                    <ColorPill hex={group.hex} color={group.colors[group.highlightIndex ?? 5] ?? group.hex} />
                  </div>
                  <div className="grid h-24 grid-cols-11 overflow-hidden rounded-[6px]">
                    {group.colors.map((color, index) => (
                      <span
                        key={color}
                        className={group.label === "Error" && index === 0 ? "border border-[#FEE2E2]" : undefined}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </StyleSection>

          <Divider />

          <StyleSection title="Typography" titleWeight="font-medium">
            <div className="flex flex-col gap-11">
              <div className="flex flex-col gap-4">
                <p
                  className="font-bold leading-none text-[#171717] transition-[font-size] duration-150"
                  style={{ fontFamily, fontSize: previewSize }}
                >
                  Build something that people want.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="relative h-4 w-full max-w-[468px] shrink-0 cursor-pointer" aria-label="Typography size">
                    <div className="absolute left-0 right-0 top-[7px] h-[6px] rounded-full bg-[#E7E6FD]" />
                    <div
                      className="absolute left-0 top-[7px] h-[6px] rounded-full bg-[#6D67D3]"
                      style={{ width: `${previewProgress}%` }}
                    />
                    <span
                      className="absolute top-0 h-4 w-4 rounded-full bg-[#6D67D3] shadow-[0_0_0_2px_rgba(255,255,255,0.8)]"
                      style={{ left: `calc(${previewProgress}% - 8px)` }}
                    />
                    <input
                      type="range"
                      min={12}
                      max={48}
                      value={previewSize}
                      onChange={(event) => setPreviewSize(Number(event.target.value))}
                      className="absolute inset-0 h-4 w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    <MetaPill>{previewSize}px</MetaPill>
                    <label className="inline-flex h-5 items-center justify-center gap-[6px] rounded-[4px] border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-[2px] text-[13px] font-medium leading-none text-[#171717]">
                      <select
                        value={fontFamily}
                        onChange={(event) => setFontFamily(event.target.value)}
                        className="cursor-pointer appearance-none bg-transparent pr-[18px] outline-none"
                      >
                        {[fontFamily, "Geist", "Fraunces", "Space Grotesk", "Satoshi", "Geist Mono"]
                          .filter((font, index, all) => Boolean(font) && all.indexOf(font) === index)
                          .map((font) => (
                            <option key={font}>{font}</option>
                          ))}
                      </select>
                      <span className="pointer-events-none -ml-[18px]">
                        <ChevronDown />
                      </span>
                    </label>
                    <button
                      type="button"
                      className="inline-flex h-5 items-center justify-center gap-1 rounded-[4px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] py-[2px] pl-2 pr-[6px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                      onClick={addTypographyRow}
                    >
                      Add
                      <PlusIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex min-w-0 flex-col">
                  {renderedRows.map((row, index) => (
                    <TypographyRow key={row.id} row={row} fontFamily={fontFamily} padded={index !== 0} />
                  ))}
                </div>
                <div className="flex min-w-0 flex-col items-start gap-4 text-[#171717]">
                  {styleGuide.typography.weightSamples.map((row) => (
                    <p key={row.label} className={`${row.className} max-w-full leading-tight`}>
                      {row.label}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </StyleSection>

          <Divider />

          <StyleSection title="Components" titleSize="text-[15px]" titleWeight="font-medium">
            <div className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-2">
                {componentSwatches.slice(0, 2).map((index) => (
                  <ComponentSwatch key={`component-swatch-${index}`} />
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {componentSwatches.slice(2, 5).map((index) => (
                  <ComponentSwatch key={`component-swatch-${index}`} />
                ))}
              </div>
              {componentSwatches[5] !== undefined ? <ComponentSwatch key="component-swatch-5" /> : null}
            </div>
          </StyleSection>
        </div>
      </div>
    </section>
  );
}

function HeaderButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-[6px] bg-white pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StyleSection({
  title,
  titleSize = "text-[16px]",
  titleWeight = "font-semibold",
  children,
}: {
  title: string;
  titleSize?: string;
  titleWeight?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className={`${titleSize} ${titleWeight} leading-none text-[#171717]`}>{title}</h3>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="h-px w-full bg-[#E5E5E5]" />;
}

function AtmosphereMetric({
  label,
  value,
  color,
  tint,
  position,
  editable = false,
  onPositionChange,
}: {
  label: string;
  value: string;
  color: string;
  tint: string;
  position: number;
  editable?: boolean;
  onPositionChange?: (position: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative h-4 w-full">
        <div className="absolute left-0 right-0 top-[5px] h-[6px] rounded-full" style={{ backgroundColor: tint }} />
        <div className="absolute left-0 top-[5px] h-[6px] rounded-full" style={{ width: `${position}%`, backgroundColor: color }} />
        <span className="absolute top-0 h-4 w-4 rounded-full" style={{ left: `calc(${position}% - 8px)`, backgroundColor: color }} />
        <span className="absolute left-0 top-0 h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
        {editable ? (
          <input
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={(event) => onPositionChange?.(Number(event.target.value))}
            className="absolute inset-0 h-4 w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between text-[13px] font-medium leading-none">
        <span className="text-[#171717]">{label}</span>
        <span className="text-[#525252]">{value}</span>
      </div>
    </div>
  );
}

function ColorPill({ hex, color }: { hex: string; color: string }) {
  return (
    <div className="inline-flex h-5 shrink-0 items-center justify-center gap-3 rounded-full border border-[#E5E5E5] bg-[#F5F5F5] py-[2px] pl-2 pr-[2px]">
      <span className="text-[13px] font-medium leading-none text-[#171717]">{hex}</span>
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full border border-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
        style={{
          background: `conic-gradient(#ef4444, #f97316, #facc15, #22c55e, #06b6d4, #6366f1, #ec4899, ${color}, #ef4444)`,
        }}
      />
    </div>
  );
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center justify-center gap-[6px] rounded-[4px] border border-[#E5E5E5] bg-[#F5F5F5] px-2 py-[2px] text-[13px] font-medium leading-none text-[#171717]">
      {children}
    </span>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0 text-[#171717]">
      <path d="m4 5.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypographyRow({
  row,
  fontFamily,
  padded,
}: {
  row: TypographyRow;
  fontFamily: string;
  padded: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-[6px] ${padded ? "py-3" : "pb-3"}`}>
      <p className={`${row.className} max-w-full leading-tight text-[#171717]`} style={{ fontFamily, fontSize: row.size }}>
        Build something that people want.
      </p>
      <div className="flex flex-wrap gap-2 text-[13px] font-medium leading-none text-[#525252]">
        <span>{fontFamily}</span>
        <span>{row.weight}</span>
        <span>{row.size}px</span>
        <span>{row.lineHeight}</span>
      </div>
    </div>
  );
}

function ComponentSwatch() {
  return (
    <div className="flex min-h-[238px] flex-col items-center justify-center gap-3 rounded-[10px] bg-[#F5F5F5] p-[2px]">
      <SampleButton className="bg-[#020617] text-white" />
      <SampleButton className="bg-[#475569] text-white" />
      <SampleButton className="border border-[#64748B] bg-[#F1F5F9] text-[#020617]" />
    </div>
  );
}

function SampleButton({ className }: { className: string }) {
  return (
    <button
      type="button"
      className={`inline-flex max-w-full items-center justify-center rounded-full px-[clamp(18px,4vw,37px)] py-3 text-[15px] font-medium leading-none ${className}`}
    >
      Button
    </button>
  );
}
