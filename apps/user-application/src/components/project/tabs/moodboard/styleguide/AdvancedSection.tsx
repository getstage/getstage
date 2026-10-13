import { useState } from "react";
import { CaretDown, CaretUp, Cube, Layout, SlidersHorizontal, Waves } from "@phosphor-icons/react";
import type { StyleGuideSpec } from "@stage/data-ops/contracts";
import { ColorInput, Divider, Field, Icon, Range, Section, Segmented, Select, TextInput, TextLink, ValueChip } from "./fields";
import { fontOptions, MODES, type SectionProps } from "./sections";
import { specimenSize } from "./preview/specimenSize";

const SAMPLE = "Build something people want.";

function NumberChip({ value, suffix, min, max, step = 1, label, onChange }: {
  value: number;
  suffix: string;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <span className="flex items-center rounded-[4px] border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-900">
      <input
        type="number"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
        }}
        className="w-10 bg-transparent outline-none [appearance:textfield]"
      />
      {suffix}
    </span>
  );
}

function RolesTable({ spec, update }: SectionProps) {
  const set = (index: number, patch: Partial<StyleGuideSpec["roles"][number]>) =>
    update("roles", spec.roles.map((role, i) => (i === index ? { ...role, ...patch } : role)));
  return (
    <div className="overflow-hidden rounded-[6px] border-[0.5px] border-neutral-300 text-[12px]">
      <div className="grid grid-cols-[1fr_1.2fr_1.2fr] bg-neutral-100 font-medium text-neutral-900">
        {["Role", "Light", "Dark"].map((heading) => (
          <span key={heading} className="border-r border-neutral-300 px-3 py-2 last:border-r-0">{heading}</span>
        ))}
      </div>
      {spec.roles.map((role, index) => (
        <div key={role.id} className="grid grid-cols-[1fr_1.2fr_1.2fr] items-center border-t border-neutral-300">
          <span className="border-r border-neutral-300 px-3 py-2 text-neutral-900">
            {role.label}
            <span className="block text-[11px] text-neutral-500">{role.hint}</span>
          </span>
          <span className="border-r border-neutral-300 px-2">
            <ColorInput label={`${role.label} light`} value={role.light} onChange={(light) => set(index, { light })} />
          </span>
          <span className="px-2">
            <ColorInput label={`${role.label} dark`} value={role.dark} onChange={(dark) => set(index, { dark })} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Typescale({ spec, update }: SectionProps) {
  const set = (index: number, patch: Partial<StyleGuideSpec["typescale"][number]>) =>
    update("typescale", spec.typescale.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <Section icon={<Icon name="fonts" size={16} />} title="Typescale">
      <Field label="Mono (numbers, code)">
        <Select label="Mono font" value={spec.fonts.mono} options={fontOptions(spec)} onChange={(mono) => update("fonts", { ...spec.fonts, mono })} />
      </Field>
      {spec.typescale.map((row, index) => (
        <div key={row.id} className="flex flex-col gap-1.5">
          <p
            className="text-neutral-900"
            style={{
              fontFamily: `"${index < spec.typescale.length - 1 ? spec.fonts.heading : spec.fonts.body}", ui-sans-serif, system-ui`,
              fontSize: specimenSize(row.size),
              lineHeight: `${row.lineHeight}%`,
              fontWeight: row.weight,
              letterSpacing: `${row.tracking}em`,
            }}
          >
            {SAMPLE}
          </p>
          <div className="flex items-center gap-1 text-[12px] text-neutral-500">
            <span className="mr-1">{row.label}</span>
            <NumberChip label={`${row.label} size`} value={row.size} suffix="px" min={8} max={120} onChange={(size) => set(index, { size })} />
            <NumberChip label={`${row.label} line height`} value={row.lineHeight} suffix="%" min={80} max={200} onChange={(lineHeight) => set(index, { lineHeight })} />
            <NumberChip label={`${row.label} weight`} value={row.weight} suffix="" min={100} max={900} step={100} onChange={(weight) => set(index, { weight })} />
            <NumberChip label={`${row.label} tracking`} value={row.tracking} suffix="em" min={-0.2} max={0.2} step={0.01} onChange={(tracking) => set(index, { tracking })} />
          </div>
        </div>
      ))}
    </Section>
  );
}

const ANIMATE_OPTIONS = [
  { value: "hover", label: "Hover" },
  { value: "state", label: "State change" },
  { value: "entrances", label: "Entrances" },
  { value: "pages", label: "Page Transitions" },
] as const;

const CASE_OPTIONS = [
  { value: "uppercase", label: "UPPERCASE" },
  { value: "sentence", label: "Sentence case" },
] as const;

function LayoutMotionComponents({ spec, update }: SectionProps) {
  const layout = (patch: Partial<StyleGuideSpec["layout"]>) => update("layout", { ...spec.layout, ...patch });
  const motion = (patch: Partial<StyleGuideSpec["motion"]>) => update("motion", { ...spec.motion, ...patch });
  const components = (patch: Partial<StyleGuideSpec["components"]>) => update("components", { ...spec.components, ...patch });
  return (
    <>
      <Section icon={<Layout size={16} className="text-neutral-900" />} title="Layout">
        <Segmented
          label="Default theme"
          value={spec.layout.theme}
          options={MODES}
          onChange={(theme) => layout({ theme })}
        />
        <div className="flex gap-2">
          <Field label="Border Width">
            <Segmented label="Border width" value={spec.layout.borderWidth} options={[0, 1, 2, 3].map((value) => ({ value, label: `${value}px` }))} onChange={(borderWidth) => layout({ borderWidth })} />
          </Field>
          <Field label="Max content width">
            <Segmented label="Max content width" value={spec.layout.maxWidth} options={([1120, 1280, 1440] as const).map((value) => ({ value, label: `${value}px` }))} onChange={(maxWidth) => layout({ maxWidth })} />
          </Field>
        </div>
        <Field label="Layout Variance" aside={<ValueChip>{spec.layout.variance}/10</ValueChip>}>
          <Range label="Layout variance" min={0} max={10} value={spec.layout.variance} onChange={(variance) => layout({ variance })} />
          <span className="flex justify-between text-[11px] font-normal text-neutral-500"><span>Symmetric</span><span>Asymmetric</span></span>
        </Field>
        <TextInput label="Layout rule" value={spec.layout.rule} placeholder="Rule → e.g. Left-aligned, never centred heroes." onChange={(rule) => layout({ rule })} />
      </Section>
      <Divider />
      <Section icon={<Waves size={16} className="text-neutral-900" />} title="Motion">
        <div className="flex gap-5">
          <Field label="Duration" aside={<ValueChip>{spec.motion.duration}ms</ValueChip>}>
            <Range label="Duration" min={0} max={600} step={10} value={spec.motion.duration} onChange={(duration) => motion({ duration })} />
          </Field>
          <Field label="Easing">
            <Select label="Easing" value={spec.motion.easing} options={["linear", "ease-in", "ease-out", "ease-in-out"] as const} onChange={(easing) => motion({ easing })} />
          </Field>
        </div>
        <Field label="Allowed to animate">
          <Segmented
            label="Allowed to animate"
            value={spec.motion.animate}
            options={ANIMATE_OPTIONS}
            onChange={(option) =>
              motion({ animate: spec.motion.animate.includes(option) ? spec.motion.animate.filter((value) => value !== option) : [...spec.motion.animate, option] })
            }
          />
        </Field>
      </Section>
      <Divider />
      <Section icon={<Cube size={16} className="text-neutral-900" />} title="Components">
        <p className="rounded-[4px] border-[0.5px] border-blue-300 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700">
          Stage uses shadcn/ui by default. If the project uses another component library (picked in "Select your integrations"), the export follows it: the theme files and DESIGN.md use that library's own names.
        </p>
        <Field label="Button shape">
          <Segmented label="Button shape" value={spec.components.buttonShape} options={[{ value: "pill", label: "Pill" }, { value: "rounder", label: "Rounder" }, { value: "corners", label: "Follow Corners" }]} onChange={(buttonShape) => components({ buttonShape })} />
        </Field>
        <Field label="Button Label">
          <Segmented label="Button label" value={spec.components.buttonLabel} options={CASE_OPTIONS} onChange={(buttonLabel) => components({ buttonLabel })} />
        </Field>
        <Field label="Containers">
          <Segmented label="Containers" value={spec.components.containers} options={CASE_OPTIONS} onChange={(containers) => components({ containers })} />
        </Field>
      </Section>
    </>
  );
}

export function AdvancedSection(props: SectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-8">
      <Section
        icon={<SlidersHorizontal size={16} className="text-neutral-900" />}
        title="Advanced"
        description="Everything the AI set for you. Open only if you want to fine-tune."
        action={
          <TextLink onClick={() => setOpen(!open)}>
            {open ? "Hide" : "Show"} {open ? <CaretUp size={13} /> : <CaretDown size={13} />}
          </TextLink>
        }
      >
        {open ? <RolesTable {...props} /> : null}
      </Section>
      {open ? (
        <>
          <Divider />
          <Typescale {...props} />
          <Divider />
          <LayoutMotionComponents {...props} />
        </>
      ) : null}
    </div>
  );
}
