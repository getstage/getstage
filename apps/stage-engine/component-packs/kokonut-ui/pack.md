# Kokonut UI — base component pack

Premium product surfaces: layered elevation, generous radii, pill badges, tabular figures.
The stylesheet defining these classes is already attached to the fragment. Use the classes.
Never redefine them, never restyle a control, never invent a second button style.

## Controls

| Class | Element | Use for |
|---|---|---|
| `ui-btn` | `<button>` / `<a>` | Primary action. One per screen section at most. |
| `ui-btn ui-btn-secondary` | | Secondary action beside a primary. |
| `ui-btn ui-btn-outline` | | Tertiary / low-emphasis action. |
| `ui-btn ui-btn-ghost` | | Toolbar and nav actions. |
| `ui-btn ui-btn-destructive` | | Delete / cancel-subscription only. |
| `ui-btn-lg` / `ui-btn-sm` | added to `ui-btn` | Hero CTA / dense toolbars. |

## Forms

```html
<div class="ui-field">
  <label class="ui-label" for="email">Work email</label>
  <input class="ui-input" id="email" type="email" placeholder="you@company.com" />
  <p class="ui-hint">We only use this for billing.</p>
</div>
```

`ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio`, `ui-switch` follow the same pattern.
Every input gets a `ui-label` with a matching `for`/`id`.

## Surfaces

`ui-card` is the workhorse: elevated white panel on a tinted page background. Use it for
stat tiles, settings groups, and plan cards alike. `ui-card-footer` draws its own divider,
so put actions in it rather than adding a separator by hand.

```html
<div class="ui-card">
  <div class="ui-card-header">
    <p class="ui-card-desc">Monthly recurring revenue</p>
    <h3 class="ui-card-title">$48,210</h3>
  </div>
  <div class="ui-card-footer"><span class="ui-badge">+12.4% vs last month</span></div>
</div>
```

`ui-badge` (pill, muted) + `ui-badge-primary` (solid accent), `ui-alert` (accent stripe on a
tinted panel), `ui-separator`, `ui-avatar`.

## Navigation and data

```html
<div class="ui-tabs">
  <button class="ui-tab ui-tab-active">Overview</button>
  <button class="ui-tab">Activity</button>
</div>
```

`ui-table` with real `<thead>`/`<tbody>` for any tabular data. Headers render as uppercase
micro-labels and numeric cells align on tabular figures — write numbers, not placeholders.

## Rules

1. **Controls come from this pack. Layout is yours.** Write CSS for grids, sections, heroes, and spacing — never for buttons, inputs, cards, badges, tabs, or tables.
2. **Skin through the variables, not overrides.** Set `--ui-primary`, `--ui-radius`, `--ui-font`, `--ui-border` on `:root` from the moodboard palette. Do not add `.ui-btn { background: … }`.
3. **Let the cards float.** Give the page a soft tinted background so the elevated `ui-card` surfaces read as product chrome. Never add your own shadow to a card.
4. **Same class, same look, every screen.** A button on screen 1 and screen 11 must be the identical element.
5. If a control you need has no class here, build it from `ui-card` + `ui-btn` + text rather than inventing a new styled primitive.
