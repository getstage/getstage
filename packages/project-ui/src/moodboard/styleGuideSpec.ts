import type { CSSProperties } from "react";
import type { StyleGuideSpec } from "@stage/data-ops/contracts";
import { readableOn } from "@stage/data-ops/domain/styleGuideSpec";

export type ThemeMode = "light" | "dark";

const DENSITY_SPACE = { compact: 0.75, balanced: 1, airy: 1.3 } as const;
const FONT_SCALE = { compact: 0.9, default: 1, large: 1.12 } as const;
const DEPTH_SHADOW = {
  flat: "none",
  soft: "0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.06)",
  hard: "3px 3px 0 0 var(--foreground)",
} as const;

// shadcn/ui reads its theme from CSS variables; this maps the guide onto them so
// real shadcn components render the Direction exactly as the export will.
export function shadcnThemeVars(spec: StyleGuideSpec, mode: ThemeMode): CSSProperties {
  const c = spec.colors[mode];
  const radius = `${spec.shape.corners}px`;
  const buttonRadius = { pill: "9999px", rounder: `${spec.shape.corners + 6}px`, corners: radius }[spec.components.buttonShape];
  return {
    "--background": c.background,
    "--foreground": c.text,
    "--card": c.background,
    "--card-foreground": c.text,
    "--popover": c.background,
    "--popover-foreground": c.text,
    "--primary": c.primary,
    "--primary-foreground": readableOn(c.primary),
    "--secondary": c.surface,
    "--secondary-foreground": c.text,
    "--muted": c.surface,
    "--muted-foreground": c.mutedText,
    "--accent": c.surface,
    "--accent-foreground": c.text,
    "--destructive": "#DC2626",
    "--border": c.border,
    "--input": c.border,
    "--ring": c.primary,
    "--radius": radius,
    "--sg-button-radius": buttonRadius,
    "--sg-border-width": `${spec.layout.borderWidth}px`,
    "--sg-shadow": DEPTH_SHADOW[spec.shape.depth],
    "--sg-space": String(DENSITY_SPACE[spec.shape.density]),
    "--sg-font-scale": String(FONT_SCALE[spec.fonts.size]),
    "--sg-font-heading": `"${spec.fonts.heading}", ui-sans-serif, system-ui`,
    "--sg-font-body": `"${spec.fonts.body}", ui-sans-serif, system-ui`,
    "--sg-font-mono": `"${spec.fonts.mono}", ui-monospace, monospace`,
    "--sg-button-case": spec.components.buttonLabel === "uppercase" ? "uppercase" : "none",
    "--sg-container-case": spec.components.containers === "uppercase" ? "uppercase" : "none",
    "--sg-duration": spec.motion.animate.length ? `${spec.motion.duration}ms` : "0ms",
    "--sg-easing": spec.motion.easing,
  } as CSSProperties;
}

