# Aceternity UI — sections component pack

The stylesheet defining these classes is already attached to the fragment. Use the classes.
Sections are `sx-*`: layout, section backgrounds, big type, and marketing surfaces. Controls
inside them — buttons, inputs, cards, badges, tabs, tables — come from the `ui-*` base pack.

## Heroes and section type

| Class | Element | Use for |
|---|---|---|
| `sx-hero` | `<section>` | Centered hero: spotlight background, stacked copy. |
| `sx-hero sx-hero-split` | `<section>` | Two-column hero: `sx-copy` left, `sx-media` right. |
| `sx-eyebrow` | `<p>` | Short uppercase kicker above the headline. |
| `sx-headline` | `<h1>` / `<h2>` | Section headline. Fluid 34–60px. |
| `sx-subhead` | `<p>` | One or two lines of supporting copy under a headline. |
| `sx-actions` | `<div>` | Row of CTAs. Holds `ui-btn` elements, wraps on narrow screens. |
| `sx-copy` | `<div>` | Left-aligned text column in a split hero or a feature row. |
| `sx-section-head` | `<div>` | Centered heading block above a grid section. Required inside `sx-bento` / `sx-pricing`: a bare heading there becomes a grid cell. |
| `sx-media` | `<div>` | Gradient placeholder for a screenshot or illustration. Leave it empty. |

## Bento grid

| Class | Element | Use for |
|---|---|---|
| `sx-bento` | `<section>` | Three-column feature mosaic with spotlight hover. |
| `sx-bento-tile` | grid child | One tile: gradient wash, hairline, lift. Never add `ui-card`. |
| `sx-bento-tile-wide` | added to a tile | Spans two columns. |
| `sx-bento-tile-tall` | added to a tile | Spans two rows. |
| `sx-tile-title` | `<h3>` | Tile heading. |
| `sx-tile-body` | `<p>` | Tile body copy. |

## Feature rows, pricing, proof

| Class | Element | Use for |
|---|---|---|
| `sx-feature-row` | `<section>` | Alternating copy/visual row. |
| `sx-feature-row-reverse` | added to a row | Moves `sx-copy` second so the visual leads. Use on every second row. |
| `sx-pricing` | `<section>` | Three-column plan grid. |
| `sx-pricing-tier` | `<div>` | One plan surface. Never add `ui-card`. |
| `sx-pricing-tier-featured` | added to a tier | Accent border + gradient lift. One per grid. |
| `sx-tier-name` / `sx-tier-price` / `sx-tier-period` | `<p>` / `<span>` | Plan name, amount, and the `/mo` suffix inside the price. |
| `sx-tier-list` | `<ul>` | Unbulleted feature list. Grows, so the CTA sits on the bottom edge. |
| `sx-logo-strip` / `sx-logo` | `<section>` / `<span>` | Customer wordmark row and each wordmark. |
| `sx-stat-strip` / `sx-stat` | `<section>` / `<div>` | Divided metrics row and each cell. |
| `sx-stat-value` / `sx-stat-label` | `<span>` | The number and its caption. |
| `sx-testimonial` / `sx-quote` / `sx-attrib` | `<figure>` / `<p>` / `<figcaption>` | Accent-bar quote, quote text, attribution line. |
| `sx-cta` | `<section>` | Closing gradient panel with headline and CTA. |

## Examples

```html
<section class="sx-hero">
  <p class="sx-eyebrow">Now in public beta</p>
  <h1 class="sx-headline">Ship your AI product before the demo call</h1>
  <p class="sx-subhead">Turn a prompt into a production-ready interface in minutes.</p>
  <div class="sx-actions">
    <a class="ui-btn ui-btn-lg" href="#">Start free</a>
    <a class="ui-btn ui-btn-outline ui-btn-lg" href="#">Book a demo</a>
  </div>
</section>
```

```html
<section class="sx-pricing">
  <div class="sx-section-head">
    <h2 class="sx-headline">Simple pricing</h2>
    <p class="sx-subhead">Switch plans or cancel any time.</p>
  </div>
  <div class="sx-pricing-tier sx-pricing-tier-featured">
    <p class="sx-tier-name">Studio</p>
    <p class="sx-tier-price">$49<span class="sx-tier-period">/mo</span></p>
    <ul class="sx-tier-list"><li>Unlimited projects</li><li>Figma export</li></ul>
    <button class="ui-btn">Choose Studio</button>
  </div>
</section>
```

## Rules

1. **Sections own layout and marketing surfaces. Controls come from the base pack.** Never restyle `ui-btn`, `ui-input`, `ui-card`, `ui-badge`, `ui-tab`, or `ui-table`, and never build a section-level lookalike of one. Every button in a section is a `ui-btn`.
2. **One hero per screen.** `sx-hero` or `sx-hero sx-hero-split`, never both, never twice.
3. **Never co-class `sx-bento-tile` or `sx-pricing-tier` with `ui-card`.** They are complete surfaces already; `ui-card` is for in-app screens.
4. **Skin through the variables, not overrides.** Colour, radius, and type already follow the base pack: `--sx-bg`, `--sx-fg`, `--sx-muted-fg`, `--sx-border`, `--sx-primary`, `--sx-radius`, and `--sx-font` alias the `--ui-*` tokens. Set the decorative ones — `--sx-tint-a`, `--sx-tint-b`, `--sx-glow`, `--sx-section-pad`, `--sx-measure`, `--sx-surface-radius` — on `:root` from the moodboard palette. Do not add `.sx-hero { background: … }`.
5. **No viewport-height sections.** Height comes from content; Stage crops and exports by content height.
6. Same class, same section rhythm, every screen: a hero on screen 1 and screen 11 must be the identical element.
