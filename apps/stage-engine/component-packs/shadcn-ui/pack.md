# shadcn/ui — base component pack

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

```html
<div class="ui-card">
  <div class="ui-card-header">
    <h3 class="ui-card-title">Starter</h3>
    <p class="ui-card-desc">For solo designers shipping their first client site.</p>
  </div>
  <!-- body -->
  <div class="ui-card-footer"><button class="ui-btn">Choose plan</button></div>
</div>
```

`ui-badge` (+ `ui-badge-primary`), `ui-alert`, `ui-separator`, `ui-avatar`.

## Navigation and data

```html
<div class="ui-tabs">
  <button class="ui-tab ui-tab-active">Overview</button>
  <button class="ui-tab">Activity</button>
</div>
```

`ui-table` with real `<thead>`/`<tbody>` for any tabular data.

## Rules

1. **Controls come from this pack. Layout is yours.** Write CSS for grids, sections, heroes, and spacing — never for buttons, inputs, cards, badges, tabs, or tables.
2. **Skin through the variables, not overrides.** Set `--ui-primary`, `--ui-radius`, `--ui-font`, `--ui-border` on `:root` from the moodboard palette. Do not add `.ui-btn { background: … }`.
3. **Same class, same look, every screen.** A button on screen 1 and screen 11 must be the identical element.
4. If a control you need has no class here, build it from `ui-card` + `ui-btn` + text rather than inventing a new styled primitive.
