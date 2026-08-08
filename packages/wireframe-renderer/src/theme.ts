/// Bridges a project's style guide onto the CSS variables every vendored library reads.
///
/// Without this, `Card` resolves `--background` and `Button` resolves `--primary` from the
/// generic grayscale defaults in `globals.css`. The result is real components wearing stock
/// gray while the model hand-paints brand colours around them — the brand reaches only the
/// markup the model typed, never the design system underneath it.

export type BrandPalette = {
  label: string;
  /** The palette's base colour. */
  hex: string;
  /** Light-to-dark tint ramp; index 0 is the lightest. */
  colors: string[];
};

export type BrandTheme = {
  fontFamily: string;
  palettes: BrandPalette[];
};

type Hsl = { h: number; s: number; l: number };

function parseHex(hex: string): Hsl | undefined {
  const value = hex.trim().replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return undefined;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / delta + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / delta + 2) * 60
        : ((r - g) / delta + 4) * 60;
  return { h, s, l };
}

/// Tailwind reads these as `hsl(var(--x))`, so the value is a bare `H S% L%` triple.
function formatHsl({ h, s, l }: Hsl) {
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function withLightness(color: Hsl, l: number): Hsl {
  return { h: color.h, s: color.s, l };
}

type ResolvedPalettes = { ink: Hsl; accent: Hsl; neutral: Hsl };

/// Picks a role for each palette by measurable properties rather than by name, so a style
/// guide that calls its colours anything at all still themes correctly: the darkest colour
/// carries text and primary actions, the most saturated one is the accent, and the flattest
/// one supplies borders and muted surfaces.
function resolveRoles(palettes: BrandPalette[]): ResolvedPalettes | undefined {
  const parsed = palettes
    .map((palette) => parseHex(palette.hex))
    .filter((color): color is Hsl => color !== undefined);
  if (parsed.length === 0) return undefined;

  const byDark = [...parsed].sort((a, b) => a.l - b.l);
  const bySaturation = [...parsed].sort((a, b) => b.s - a.s);
  const ink = byDark[0];
  const neutral = [...parsed].sort((a, b) => a.s - b.s)[0];
  // The accent must not be the same swatch as the text colour, or every button, badge and
  // chart collapses into one flat tone.
  const accent = bySaturation.find((color) => color !== ink) ?? bySaturation[0];
  return { ink, accent, neutral };
}

export function themeCss(theme: BrandTheme | undefined): string {
  if (!theme) return "";
  const roles = resolveRoles(theme.palettes);
  const declarations: string[] = [];

  if (roles) {
    const { ink, accent, neutral } = roles;
    const onAccent = accent.l > 0.6 ? withLightness(ink, 0.12) : { h: 0, s: 0, l: 1 };
    declarations.push(
      `--foreground: ${formatHsl(withLightness(ink, Math.min(ink.l, 0.16)))};`,
      `--card-foreground: ${formatHsl(withLightness(ink, Math.min(ink.l, 0.16)))};`,
      `--primary: ${formatHsl(ink)};`,
      `--primary-foreground: ${formatHsl({ h: 0, s: 0, l: 1 })};`,
      `--accent: ${formatHsl(accent)};`,
      `--accent-foreground: ${formatHsl(onAccent)};`,
      `--ring: ${formatHsl(accent)};`,
      `--secondary: ${formatHsl(withLightness(neutral, 0.96))};`,
      `--secondary-foreground: ${formatHsl(withLightness(ink, 0.2))};`,
      `--muted: ${formatHsl(withLightness(neutral, 0.96))};`,
      `--muted-foreground: ${formatHsl(withLightness(neutral, 0.45))};`,
      `--border: ${formatHsl(withLightness(neutral, 0.89))};`,
      `--input: ${formatHsl(withLightness(neutral, 0.89))};`,
    );
  }

  const font = theme.fontFamily.trim();
  const fontRule = font
    ? `body, :host { font-family: "${font}", ui-sans-serif, system-ui, sans-serif; }`
    : "";

  if (declarations.length === 0 && !fontRule) return "";
  return `\n:root {\n  ${declarations.join("\n  ")}\n}\n${fontRule}\n`;
}
