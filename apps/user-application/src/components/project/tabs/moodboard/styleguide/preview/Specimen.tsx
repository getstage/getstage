import type { StyleGuideColorRole, StyleGuideSpec } from "@stage/data-ops/contracts";
import { readableOn, type ThemeMode } from "@/lib/project/styleGuideSpec";
import { specimenSize } from "./specimenSize";

const SAMPLE = "Build something people want.";
const ROLE_LABELS: Record<StyleGuideColorRole, string> = {
  background: "Background",
  surface: "Surface",
  text: "Text",
  mutedText: "Muted",
  border: "Border",
  primary: "Primary",
};

// Type scale and colour roles side by side, compact enough to leave room for components.
export function Specimen({ spec, mode }: { spec: StyleGuideSpec; mode: ThemeMode }) {
  const colors = spec.colors[mode];
  return (
    <section className="grid gap-8 @3xl:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-medium tracking-wide text-sg-muted-foreground uppercase">Typography</h3>
        {spec.typescale.map((row, index) => (
          <div key={row.id} className="flex items-baseline justify-between gap-4 border-b border-sg-border pb-3">
            <p
              className="min-w-0 truncate"
              style={{
                fontFamily: `var(${index < spec.typescale.length - 1 ? "--sg-font-heading" : "--sg-font-body"})`,
                fontSize: specimenSize(row.size),
                lineHeight: `${row.lineHeight}%`,
                fontWeight: row.weight,
                letterSpacing: `${row.tracking}em`,
              }}
            >
              {SAMPLE}
            </p>
            <span className="shrink-0 font-[family-name:var(--sg-font-mono)] text-[11px] text-sg-muted-foreground">
              {row.label} · {row.size}px
            </span>
          </div>
        ))}
        <p className="font-[family-name:var(--sg-font-mono)] text-sm">1,284.50 · const total = 42;</p>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-medium tracking-wide text-sg-muted-foreground uppercase">Colour roles</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ROLE_LABELS) as StyleGuideColorRole[]).map((role) => (
            <div key={role} className="flex h-16 flex-col justify-end rounded-sg border border-sg-border p-2 text-xs" style={{ backgroundColor: colors[role], color: readableOn(colors[role]) }}>
              <span className="font-medium">{ROLE_LABELS[role]}</span>
              <span className="font-[family-name:var(--sg-font-mono)] opacity-80">{colors[role]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
