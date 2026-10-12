import { ListChecks } from "@phosphor-icons/react";
import {
  styleGuideLookAtOptions,
  type StyleGuideColorRole,
  type StyleGuideSection,
  type StyleGuideSpec,
} from "@stage/data-ops/contracts";
import { BUNDLED_FONTS } from "@/lib/systemFonts";
import type { ThemeMode } from "@/lib/project/styleGuideSpec";
import type { MoodboardItem } from "@/types/project/moodboardTab";
import { cn } from "@/lib/utils";
import { AddButton, ColorInput, Field, Icon, Range, RemovableRow, Section, Segmented, Select, TextArea, TextInput, TextLink, ValueChip } from "./fields";

export type SpecUpdate = <S extends StyleGuideSection>(section: S, value: StyleGuideSpec[S]) => void;
export type SectionProps = { spec: StyleGuideSpec; update: SpecUpdate };

export const MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function IntentSection({ spec, update }: SectionProps) {
  const set = (patch: Partial<StyleGuideSpec["intent"]>) => update("intent", { ...spec.intent, ...patch });
  return (
    <Section icon={<Icon name="intent" size={16} />} title="Intent" description="One line that sets the tone. Claude reads it first.">
      <div className="flex gap-1">
        <Field label="Direction name">
          <TextInput label="Direction name" value={spec.intent.name} onChange={(name) => set({ name })} />
        </Field>
        <Field label="Intent in one line">
          <TextInput label="Intent in one line" value={spec.intent.line} onChange={(line) => set({ line })} />
        </Field>
      </div>
    </Section>
  );
}

export function ReferencesSection({ spec, update, images }: SectionProps & { images: MoodboardItem[] }) {
  const entries = spec.references;
  const setEntry = (index: number, patch: Partial<StyleGuideSpec["references"][number]>) =>
    update("references", entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  return (
    <Section
      icon={<Icon name="intent" size={16} />}
      title="References"
      description="These images go into the export, so Claude Code can open them. Say what you like and when it should look at each one."
    >
      <div className="flex flex-col gap-1">
        {entries.length === 0 ? <p className="text-[13px] text-neutral-500">No references in this Direction yet.</p> : null}
        {entries.map((entry, index) => {
          const image = images.find((item) => item.id === entry.referenceId);
          return (
            <div key={entry.referenceId} className="flex gap-3 rounded-[6px] border-[0.5px] border-neutral-300 bg-white p-3 shadow-stage-control">
              <div className="flex shrink-0 flex-col justify-between gap-3">
                <div className="flex h-[108px] w-[164px] items-center justify-center overflow-hidden rounded-[4px] border-[0.5px] border-neutral-300 bg-neutral-100 shadow-stage-control">
                  {image ? <img src={image.thumbnailUrl ?? image.image} alt={entry.label} className="size-full object-cover" /> : <Icon name="image" />}
                </div>
                <TextLink tone="destructive" onClick={() => update("references", entries.filter((_, i) => i !== index))}>
                  <Icon name="remove" /> Remove
                </TextLink>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Field label="Reference">
                  <TextInput label="Reference" value={entry.label} onChange={(label) => setEntry(index, { label })} />
                </Field>
                <Field label="What you like about it">
                  <TextArea label="What you like about it" value={entry.likes} onChange={(likes) => setEntry(index, { likes })} />
                </Field>
                <Field label="Look at it when building">
                  <div className="flex flex-wrap gap-1">
                    {styleGuideLookAtOptions.map((option) => {
                      const on = entry.lookAt.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setEntry(index, { lookAt: on ? entry.lookAt.filter((tag) => tag !== option) : [...entry.lookAt, option] })
                          }
                          className={cn(
                            "rounded-full border-[0.5px] px-2 py-1 text-[12px] leading-[1.2]",
                            on ? "border-accent-deep bg-accent-deep/5 font-[550] text-accent-deep" : "border-neutral-300 bg-neutral-50 font-medium text-neutral-500",
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const COLOR_FIELDS: Array<{ role: StyleGuideColorRole; label: string; hint: string }> = [
  { role: "background", label: "Background", hint: "Page" },
  { role: "surface", label: "Surface", hint: "Panels, tables, inputs" },
  { role: "text", label: "Text", hint: "Main text" },
  { role: "mutedText", label: "Muted text", hint: "Secondary text, labels" },
  { role: "border", label: "Border", hint: "All borders and dividers" },
  { role: "primary", label: "Primary", hint: "The one main action per screen" },
];

export function ColorsSection({ spec, update, mode, onModeChange }: SectionProps & { mode: ThemeMode; onModeChange: (mode: ThemeMode) => void }) {
  const set = (role: StyleGuideColorRole, hex: string) =>
    update("colors", { ...spec.colors, [mode]: { ...spec.colors[mode], [role]: hex } });
  return (
    <Section
      icon={<Icon name="colors" size={16} />}
      title="Colors"
      description="Six colours with a job each. Text on primary, focus and status colours are set for you."
    >
      <div className="flex flex-col gap-5">
        <Segmented label="Colour mode" value={mode} options={MODES} onChange={onModeChange} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {COLOR_FIELDS.map(({ role, label, hint }) => (
            <Field key={role} label={label} hint={hint}>
              <ColorInput label={label} value={spec.colors[mode][role]} onChange={(hex) => set(role, hex)} />
            </Field>
          ))}
        </div>
      </div>
    </Section>
  );
}

const FONT_SIZES = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
] as const;

export function fontOptions(spec: StyleGuideSpec) {
  return [...new Set([...BUNDLED_FONTS, spec.fonts.heading, spec.fonts.body, spec.fonts.mono])].sort();
}

export function FontsSection({ spec, update }: SectionProps) {
  const set = (patch: Partial<StyleGuideSpec["fonts"]>) => update("fonts", { ...spec.fonts, ...patch });
  const options = fontOptions(spec);
  return (
    <Section icon={<Icon name="fonts" size={16} />} title="Fonts" description="A heading font, a body font and a size.">
      <div className="flex flex-col gap-3">
        <div className="flex gap-1">
          <Field label="Headings">
            <Select label="Headings" value={spec.fonts.heading} options={options} onChange={(heading) => set({ heading })} />
          </Field>
          <Field label="Body">
            <Select label="Body" value={spec.fonts.body} options={options} onChange={(body) => set({ body })} />
          </Field>
        </div>
        <Field label="Size">
          <Segmented label="Font size" value={spec.fonts.size} options={FONT_SIZES} onChange={(size) => set({ size })} />
        </Field>
      </div>
    </Section>
  );
}

export function ShapeSection({ spec, update }: SectionProps) {
  const set = (patch: Partial<StyleGuideSpec["shape"]>) => update("shape", { ...spec.shape, ...patch });
  return (
    <Section icon={<Icon name="shape" size={16} />} title="Shape and density" description="Corners, depth and how packed screens feel.">
      <div className="flex flex-col gap-6">
        <Field label="Corners" aside={<ValueChip>{spec.shape.corners}</ValueChip>}>
          <Range label="Corners" min={0} max={24} value={spec.shape.corners} onChange={(corners) => set({ corners })} />
        </Field>
        <Field label="Depth">
          <Segmented
            label="Depth"
            value={spec.shape.depth}
            options={[
              { value: "flat", label: "Flat" },
              { value: "soft", label: "Soft shadow" },
              { value: "hard", label: "Hard offset" },
            ]}
            onChange={(depth) => set({ depth })}
          />
        </Field>
        <Field label="Density">
          <Segmented
            label="Density"
            value={spec.shape.density}
            options={[
              { value: "compact", label: "Compact" },
              { value: "balanced", label: "Balanced" },
              { value: "airy", label: "Airy" },
            ]}
            onChange={(density) => set({ density })}
          />
        </Field>
      </div>
    </Section>
  );
}

function RuleList({ title, rules, onChange }: { title: string; rules: string[]; onChange: (rules: string[]) => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="mb-1 text-[13px] font-medium text-neutral-900">{title}</span>
      {rules.map((rule, index) => (
        <RemovableRow
          key={index}
          label={`${title} rule ${index + 1}`}
          value={rule}
          onChange={(next) => onChange(rules.map((current, i) => (i === index ? next : current)))}
          onRemove={() => onChange(rules.filter((_, i) => i !== index))}
        />
      ))}
      <AddButton onClick={() => onChange([...rules, ""])} />
    </div>
  );
}

export function RulesSection({ spec, update }: SectionProps) {
  return (
    <Section
      icon={<ListChecks size={16} className="text-neutral-900" />}
      title="Do and Don't"
      description={'The AI writes these from your Direction. Strict "never" rules are what Claude follows best.'}
    >
      <div className="flex gap-1">
        <RuleList title="Do" rules={spec.rules.do} onChange={(next) => update("rules", { ...spec.rules, do: next })} />
        <RuleList title="Don't" rules={spec.rules.dont} onChange={(next) => update("rules", { ...spec.rules, dont: next })} />
      </div>
    </Section>
  );
}
