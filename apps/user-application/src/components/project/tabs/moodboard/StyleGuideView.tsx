import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { defaultStyleGuide } from "@/mock/project/moodboard";
import type { MoodboardStyleGuideViewData } from "@/types/project/moodboardTab";
import { EditIcon, PlusIcon, RegenerateIcon } from "./moodboardIcons";

type TypographyRow = MoodboardStyleGuideViewData["typography"]["rows"][number];
type AtmosphereMetric = MoodboardStyleGuideViewData["atmosphere"][number];
type SwatchPalette = MoodboardStyleGuideViewData["colorPalettes"][number];

// Each component swatch shows a different component type so the section is not
// "always the same component"; combined with a per-swatch palette this gives the
// variety the AI's color palettes already imply.
const SWATCH_VARIANTS = ["buttons", "field", "chips", "card", "toggle"] as const;
type SwatchVariant = (typeof SWATCH_VARIANTS)[number];

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
  const [draftPalettes, setDraftPalettes] = useState<SwatchPalette[]>(styleGuide.colorPalettes);
  const previewProgress = ((previewSize - 12) / (48 - 12)) * 100;
  const renderedRows = [...styleGuide.typography.rows, ...customRows];
  // While editing, the palette / component previews reflect the in-progress draft
  // so the user sees their color edits live before saving.
  const palettes = isEditing ? draftPalettes : styleGuide.colorPalettes;
  const paletteForSwatch = (index: number): SwatchPalette | undefined =>
    palettes.length > 0 ? palettes[index % palettes.length] : undefined;

  function updatePaletteColor(groupIndex: number, colorIndex: number, value: string) {
    setDraftPalettes((current) =>
      current.map((group, gi) =>
        gi === groupIndex
          ? { ...group, colors: group.colors.map((color, ci) => (ci === colorIndex ? value : color)) }
          : group,
      ),
    );
  }

  function updatePaletteLabel(groupIndex: number, value: string) {
    setDraftPalettes((current) =>
      current.map((group, gi) => (gi === groupIndex ? { ...group, label: value } : group)),
    );
  }

  useEffect(() => {
    if (isEditing) {
      setPreviewSize(styleGuide.typography.previewSize);
      setFontFamily(styleGuide.typography.fontFamily);
      setCustomRows([]);
      setDraftAtmosphere(styleGuide.atmosphere);
      setDraftPalettes(styleGuide.colorPalettes);
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
      // Keep each group's `hex` in sync with its highlighted swatch so the pill and
      // palette-driven component previews stay consistent after an edit.
      colorPalettes: draftPalettes.map((group) => ({
        ...group,
        hex: group.colors[group.highlightIndex ?? 5] ?? group.hex,
      })),
      typography: {
        ...styleGuide.typography,
        fontFamily,
        previewSize,
        rows: [...styleGuide.typography.rows, ...customRows],
      },
    });
  }

  function restoreDraftsFromOriginal() {
    setPreviewSize(styleGuide.typography.previewSize);
    setFontFamily(styleGuide.typography.fontFamily);
    setCustomRows([]);
    setDraftAtmosphere(styleGuide.atmosphere);
    setDraftPalettes(styleGuide.colorPalettes);
  }

  function handleCancel() {
    restoreDraftsFromOriginal();
    onCancel?.();
  }

  // Reset = undo all in-progress edits back to the generated style guide, while staying
  // in edit mode (Cancel does the same but also exits editing).
  function handleReset() {
    restoreDraftsFromOriginal();
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
              <HeaderButton onClick={handleReset}>
                <RegenerateIcon />
                Reset
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
              {palettes.map((group, groupIndex) => (
                <div key={`palette-${groupIndex}`} className="min-w-0">
                  <div className="mb-2 flex h-5 items-center justify-between gap-2">
                    {isEditing ? (
                      <input
                        value={group.label}
                        onChange={(event) => updatePaletteLabel(groupIndex, event.target.value)}
                        aria-label={`Palette ${groupIndex + 1} name`}
                        className="min-w-0 flex-1 rounded-[4px] border border-[#E5E5E5] bg-white px-1.5 py-0.5 text-[15px] font-medium leading-none text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#8d87ff]"
                      />
                    ) : (
                      <p className="min-w-0 flex-1 text-[15px] font-medium leading-none text-[#171717]">
                        {group.label}
                      </p>
                    )}
                    <ColorPill
                      hex={isEditing ? group.colors[group.highlightIndex ?? 5] ?? group.hex : group.hex}
                      color={group.colors[group.highlightIndex ?? 5] ?? group.hex}
                      editable={isEditing}
                      onChangeColor={(value) =>
                        updatePaletteColor(groupIndex, group.highlightIndex ?? 5, value)
                      }
                    />
                  </div>
                  <div className="grid h-24 grid-cols-11 overflow-hidden rounded-[6px]">
                    {group.colors.map((color, index) =>
                      isEditing ? (
                        <label
                          key={index}
                          className="relative block h-full w-full cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={`Edit ${group.label} ${index + 1}`}
                        >
                          <input
                            type="color"
                            value={toColorInputValue(color)}
                            onChange={(event) => updatePaletteColor(groupIndex, index, event.target.value)}
                            aria-label={`${group.label} color ${index + 1}`}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </label>
                      ) : (
                        <span
                          key={`${color}-${index}`}
                          className={group.label === "Error" && index === 0 ? "border border-[#FEE2E2]" : undefined}
                          style={{ backgroundColor: color }}
                        />
                      ),
                    )}
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
            {/* One card per distinct component (no repeats); each pulls a different
                palette so the showcase reads as a varied, brand-themed component set. */}
            <div className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-2">
                {SWATCH_VARIANTS.slice(0, 2).map((variant, index) => (
                  <ComponentSwatch
                    key={variant}
                    palette={paletteForSwatch(index)}
                    variant={variant}
                  />
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {SWATCH_VARIANTS.slice(2).map((variant, index) => (
                  <ComponentSwatch
                    key={variant}
                    palette={paletteForSwatch(index + 2)}
                    variant={variant}
                  />
                ))}
              </div>
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

function ColorPill({
  hex,
  color,
  editable = false,
  onChangeColor,
}: {
  hex: string;
  color: string;
  editable?: boolean;
  onChangeColor?: (value: string) => void;
}) {
  const wheel = (
    <span
      aria-hidden="true"
      className="h-4 w-4 rounded-full border border-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
      style={{
        background: `conic-gradient(#ef4444, #f97316, #facc15, #22c55e, #06b6d4, #6366f1, #ec4899, ${color}, #ef4444)`,
      }}
    />
  );

  return (
    <div className="inline-flex h-5 shrink-0 items-center justify-center gap-3 rounded-full border border-[#E5E5E5] bg-[#F5F5F5] py-[2px] pl-2 pr-[2px]">
      <span className="text-[13px] font-medium leading-none text-[#171717]">{hex}</span>
      {editable && onChangeColor ? (
        // `inline-flex` keeps the wheel span sized as a flex item (a plain inline
        // wrapper collapses it to 0); the transparent color input sits on top so the
        // rainbow logo stays visible AND clicking it opens the picker.
        <label
          className="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center"
          title="Click to change this color"
        >
          {wheel}
          <input
            type="color"
            value={toColorInputValue(color)}
            onChange={(event) => onChangeColor(event.target.value)}
            aria-label="Change palette color"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      ) : (
        wheel
      )}
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

function ComponentSwatch({ palette, variant }: { palette?: SwatchPalette; variant: SwatchVariant }) {
  // Derive a strong / deep / soft trio from the Direction's generated palette so each
  // swatch previews real brand colors and recolors live when the palette is edited.
  const colors = palette?.colors ?? [];
  const highlight = palette?.highlightIndex ?? 5;
  const strong = colors[highlight] ?? palette?.hex ?? "#020617";
  const deep = colors[Math.min(colors.length - 1, highlight + 2)] ?? strong;
  const soft = colors[2] ?? "#F1F5F9";
  const onSoft = colors[Math.max(0, colors.length - 2)] ?? "#020617";

  // shadcn neutral tokens (border / input / muted-foreground / foreground), kept literal
  // so the previews match shadcn's component recipes regardless of the brand palette.
  const border = "#E2E8F0";
  const muted = "#64748B";
  const foreground = "#0F172A";

  return (
    <div className="flex min-h-[238px] flex-col items-center justify-center gap-3 rounded-[10px] bg-[#F5F5F5] p-4">
      {variant === "buttons" ? (
        <div className="flex w-full max-w-[180px] flex-col gap-[10px]">
          <SampleButton label="Primary" style={{ backgroundColor: strong, color: "#fff" }} />
          <SampleButton label="Secondary" style={{ backgroundColor: soft, color: onSoft }} />
          <SampleButton
            label="Outline"
            style={{ backgroundColor: "#fff", color: foreground, border: `1px solid ${border}` }}
          />
          <SampleButton label="Ghost" style={{ backgroundColor: "transparent", color: foreground }} />
        </div>
      ) : null}

      {variant === "field" ? (
        <div className="flex w-full max-w-[230px] flex-col gap-2">
          {/* shadcn form: Label + Input (h-9, rounded-md, border-input) + description + Button */}
          <span className="text-[14px] font-medium leading-none" style={{ color: foreground }}>
            Email
          </span>
          <div
            className="flex h-9 w-full items-center rounded-md border bg-white px-3 text-[14px] leading-none text-[#94A3B8] shadow-sm"
            style={{ borderColor: border }}
          >
            you@studio.com
          </div>
          <span className="text-[13px] leading-[1.4]" style={{ color: muted }}>
            We&apos;ll never share it.
          </span>
          <SampleButton label="Continue" style={{ backgroundColor: strong, color: "#fff" }} />
        </div>
      ) : null}

      {variant === "chips" ? (
        <div className="flex flex-wrap items-center justify-center gap-2 px-3">
          {/* shadcn Badge variants: rounded-md, px-2.5 py-0.5, text-xs font-semibold, bordered */}
          {["Default", "Secondary", "Outline", "Destructive"].map((label, index) => {
            const badgeStyle: CSSProperties =
              index === 0
                ? { backgroundColor: strong, color: "#fff", border: "1px solid transparent" }
                : index === 1
                  ? { backgroundColor: soft, color: onSoft, border: "1px solid transparent" }
                  : index === 2
                    ? { backgroundColor: "transparent", color: foreground, border: `1px solid ${border}` }
                    : { backgroundColor: deep, color: "#fff", border: "1px solid transparent" };
            return (
              <span
                key={label}
                className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[12px] font-semibold leading-[1.4]"
                style={badgeStyle}
              >
                {label}
              </span>
            );
          })}
        </div>
      ) : null}

      {variant === "card" ? (
        <div
          className="w-full max-w-[240px] rounded-xl border bg-white text-left shadow-sm"
          style={{ borderColor: border }}
        >
          {/* shadcn Card: rounded-xl, border, CardHeader/Content/Footer with p-6 rhythm */}
          <div className="flex flex-col gap-1.5 p-5">
            <span
              className="inline-flex w-fit items-center rounded-md px-2.5 py-0.5 text-[12px] font-semibold leading-[1.4]"
              style={{ backgroundColor: soft, color: onSoft }}
            >
              Featured
            </span>
            <h4 className="text-[16px] font-semibold leading-none tracking-tight" style={{ color: foreground }}>
              Project kickoff
            </h4>
            <p className="text-[13px] leading-[1.5]" style={{ color: muted }}>
              A themed card built from this brand&apos;s palette.
            </p>
          </div>
          <div className="flex items-center gap-2 px-5 pb-5">
            <SampleButton label="Open" compact style={{ backgroundColor: strong, color: "#fff" }} />
            <SampleButton
              label="Cancel"
              compact
              style={{ backgroundColor: "#fff", color: foreground, border: `1px solid ${border}` }}
            />
          </div>
        </div>
      ) : null}

      {variant === "toggle" ? (
        <div className="flex w-full max-w-[210px] flex-col gap-4">
          {/* shadcn Switch (h-5 w-9 track, h-4 w-4 thumb) + Checkbox (h-4 w-4 rounded-sm) */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium leading-none" style={{ color: foreground }}>
              Notifications
            </span>
            <span
              className="relative inline-flex h-5 w-9 items-center rounded-full px-[2px] transition-colors"
              style={{ backgroundColor: strong }}
            >
              <span className="ml-auto h-4 w-4 rounded-full bg-white shadow-sm" />
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-sm shadow-sm"
              style={{ backgroundColor: strong }}
            >
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                <path d="M2.5 6 5 8.5 9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[14px] leading-none" style={{ color: foreground }}>
              Auto-publish updates
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-sm border shadow-sm"
              style={{ borderColor: border, backgroundColor: "#fff" }}
            />
            <span className="text-[14px] leading-none" style={{ color: muted }}>
              Notify the client
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SampleButton({
  label = "Button",
  compact = false,
  style,
}: {
  label?: string;
  compact?: boolean;
  style?: CSSProperties;
}) {
  // shadcn Button: rounded-md, text-sm font-medium, h-9 px-4 (sm: h-8 px-3)
  return (
    <button
      type="button"
      className={`inline-flex max-w-full items-center justify-center rounded-md text-[14px] font-medium leading-none transition-colors hover:opacity-90 ${
        compact ? "h-8 px-3" : "h-9 w-full px-4"
      }`}
      style={style}
    >
      {label}
    </button>
  );
}

// `<input type="color">` only accepts a 6-digit hex; fall back to black for any
// non-conforming palette value rather than letting the control reset silently.
function toColorInputValue(value: string): string {
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000";
}
