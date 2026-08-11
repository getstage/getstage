# Origin UI — base component pack

Application-grade blocks for internal tools, dashboards, and admin surfaces: dense rows,
hairline borders, no shadows, small radius. Favour information density and clear section
separators over generous padding.

The stylesheet defining these classes is already attached to the fragment. Use the classes.
Never redefine them, never restyle a control, never invent a second button style.

## Controls

| Class | Element | Use for |
|---|---|---|
| `ui-btn` | `<button>` / `<a>` | Primary action. One per screen section at most. |
| `ui-btn ui-btn-secondary` | | Secondary action beside a primary. |
| `ui-btn ui-btn-outline` | | Tertiary / low-emphasis action. |
| `ui-btn ui-btn-ghost` | | Toolbar, table-row, and nav actions. |
| `ui-btn ui-btn-destructive` | | Delete / cancel-subscription only. |
| `ui-btn-lg` / `ui-btn-sm` | added to `ui-btn` | Hero CTA / dense toolbars and table rows. |

## Forms

```html
<div class="ui-field">
  <label class="ui-label" for="email">Work email</label>
  <input class="ui-input" id="email" type="email" placeholder="you@company.com" />
  <p class="ui-hint">We only use this for billing.</p>
</div>
```

`ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio`, `ui-switch` follow the same pattern.
Every input gets a `ui-label` with a matching `for`/`id`. Stack fields with a small gap —
this pack is tuned for multi-column settings forms, not one field per screenful.

## Surfaces

`ui-card-header` carries a bottom rule and `ui-card-footer` a top rule, so a card reads as
titled panel + body + action bar without extra dividers.

```html
<div class="ui-card">
  <div class="ui-card-header">
    <h3 class="ui-card-title">API keys</h3>
    <p class="ui-card-desc">Keys are shown once at creation time.</p>
  </div>
  <!-- body -->
  <div class="ui-card-footer"><button class="ui-btn ui-btn-sm">Create key</button></div>
</div>
```

`ui-badge` (+ `ui-badge-primary`) for status pills, `ui-alert` for inline notices,
`ui-separator` between stacked sections, `ui-avatar` for user cells.

## Navigation and data

`ui-tabs` is an underlined tab bar; mark the current tab with `ui-tab-active`.

```html
<div class="ui-tabs">
  <button class="ui-tab ui-tab-active">Overview</button>
  <button class="ui-tab">Activity</button>
</div>
```

`ui-table` with real `<thead>`/`<tbody>` for any tabular data — it is the primary surface
in this pack, so prefer a table over a grid of cards for lists of records.

## Rules

1. **Controls come from this pack. Layout is yours.** Write CSS for grids, sections, page
   shells, and spacing — never for buttons, inputs, cards, badges, tabs, or tables.
2. **Skin through the variables, not overrides.** Set `--ui-primary`, `--ui-radius`,
   `--ui-font`, `--ui-border` on `:root` from the moodboard palette. Do not add
   `.ui-btn { background: … }`.
3. **Same class, same look, every screen.** A button on screen 1 and screen 11 must be the
   identical element.
4. **Separate with borders and background steps, not shadows.** Nothing in this pack casts
   one; do not add elevation in your layout CSS either.
5. If a control you need has no class here, build it from `ui-card` + `ui-btn` + text
   rather than inventing a new styled primitive.
