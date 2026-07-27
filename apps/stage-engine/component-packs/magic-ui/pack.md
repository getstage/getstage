# Magic UI — sections pack

Marketing sections: gradient washes, dot-grid depth, shimmer borders, tiles that lift on
hover. The stylesheet is already attached to the fragment — use the classes, never redefine
them. Sections are layout and surface only. **Every control still comes from the base pack:
buttons are `ui-btn`, inputs are `ui-input`, in-app surfaces are `ui-card`.**

## Heroes

```html
<section class="sx-hero">
  <p class="sx-eyebrow">Now in open beta</p>
  <h1 class="sx-headline">Ship the interface before the meeting</h1>
  <p class="sx-subhead">Turn a brief into thirteen designed screens while the kickoff call is still running.</p>
  <div class="sx-actions">
    <a class="ui-btn ui-btn-lg" href="#">Start free</a>
    <a class="ui-btn ui-btn-outline ui-btn-lg" href="#">Watch the demo</a>
  </div>
  <div class="sx-media"></div>
</section>
```

`sx-hero-split` is the two-column variant: a `sx-copy` column beside a `sx-media`.

| Class | Use for |
|---|---|
| `sx-hero` | Centred hero. Glow + dot grid. |
| `sx-hero-split` | Two-column hero: `sx-copy` + `sx-media`. |
| `sx-copy` | Left-aligned text column inside a split hero or feature row. |
| `sx-section-head` | Centred eyebrow/headline/subhead block spanning a grid section. |
| `sx-eyebrow` | Small accent label above a headline. |
| `sx-headline` | Section headline. `<h1>`/`<h2>`. |
| `sx-subhead` | One supporting sentence under the headline. |
| `sx-actions` | Row holding one or two `ui-btn`. |
| `sx-media` | Decorative stand-in for a product shot or diagram. Leave it empty. |

## Bento grid

```html
<section class="sx-bento">
  <div class="sx-section-head">
    <h2 class="sx-headline">Everything in one canvas</h2>
  </div>
  <div class="sx-bento-tile sx-bento-tile-wide">
    <h3 class="sx-tile-title">Research that cites itself</h3>
    <p class="sx-tile-body">Every claim links back to the source it came from.</p>
  </div>
  <div class="sx-bento-tile">…</div>
</section>
```

Three columns. `sx-bento-tile-wide` spans two columns, `sx-bento-tile-tall` spans two rows.
Tiles hold `sx-tile-title` and `sx-tile-body`.

## Feature rows

`sx-feature-row` alternates a `sx-copy` column against a `sx-media`. Add
`sx-feature-row-reverse` to flip the order on every second row.

## Pricing

`sx-pricing` is a three-column grid of `sx-pricing-tier`. Mark one
`sx-pricing-tier sx-pricing-tier-featured` for the gradient-ring plan. Inside a tier:
`sx-tier-name`, `sx-tier-price` (with an inline `sx-tier-period`), `sx-tier-list` (a `<ul>`),
and one `ui-btn` as the plan CTA.

## Proof and close

| Class | Use for |
|---|---|
| `sx-logo-strip` / `sx-logo` | Customer wordmarks in one wrapping row. |
| `sx-stat-strip` / `sx-stat` / `sx-stat-value` / `sx-stat-label` | Four headline metrics. |
| `sx-testimonial` / `sx-quote` / `sx-attrib` | One centred quote plus attribution. |
| `sx-cta` | Closing call-to-action panel. Holds `sx-headline` + `sx-actions`. |

## Rules

1. **Never restyle a control.** No CSS for buttons, inputs, cards, badges, tabs, or tables —
   those are the base pack's job. Sections give them a place to sit.
2. **Never co-class an `sx-` surface with `ui-card`.** `sx-bento-tile` and `sx-pricing-tier`
   already carry their own surface; `ui-card` is for in-app screens.
3. **Skin through the variables.** Override `--ui-primary`, `--ui-font`, `--ui-radius` on
   `:root`; the gradients, glows, and shimmer borders follow automatically.
4. **No viewport heights.** Sections size to their content — Stage crops and exports by
   content height.
5. Reach for the section that matches the job. If none fits, compose from `sx-copy`,
   `sx-headline`, `sx-subhead`, and `sx-actions` rather than inventing a new surface.
