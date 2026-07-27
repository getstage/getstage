# Mantine — base component pack

The stylesheet defining these classes is already attached to the fragment. Use the classes.
Never redefine them, never restyle a control, never invent a second button style.

Mantine is the friendly, rounded system: 42px controls, 12px radii, a filled blue primary,
pill badges in caps, underlined tabs, and cards that use a border instead of a shadow.

## Controls

| Class | Element | Use for |
|---|---|---|
| `ui-btn` | `<button>` / `<a>` | Primary action, filled brand colour. One per screen section at most. |
| `ui-btn ui-btn-secondary` | | Secondary action beside a primary — brand-tinted, not grey. |
| `ui-btn ui-btn-outline` | | Tertiary / low-emphasis action. |
| `ui-btn ui-btn-ghost` | | Toolbar and nav actions. |
| `ui-btn ui-btn-destructive` | | Delete / cancel-subscription only. |
| `ui-btn-lg` / `ui-btn-sm` | added to `ui-btn` | Hero CTA (50px) / dense toolbars (36px). |

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
Badge text renders in caps, so keep it to one or two words.

## Navigation and data

```html
<div class="ui-tabs">
  <button class="ui-tab ui-tab-active">Overview</button>
  <button class="ui-tab">Activity</button>
</div>
```

`ui-tabs` is a full-width underlined bar, not a segmented pill — give it the width of the
content it switches. `ui-table` with real `<thead>`/`<tbody>` for any tabular data.

## Rules

1. **Controls come from this pack. Layout is yours.** Write CSS for grids, sections, heroes, and spacing — never for buttons, inputs, cards, badges, tabs, or tables.
2. **Skin through the variables, not overrides.** Set `--ui-primary`, `--ui-radius`, `--ui-font`, `--ui-border` on `:root` from the moodboard palette. Do not add `.ui-btn { background: … }`.
3. **Same class, same look, every screen.** A button on screen 1 and screen 11 must be the identical element.
4. **Keep the airier rhythm.** Controls are 42px tall — space stacked fields at 16px or more so the screen does not look cramped.
5. If a control you need has no class here, build it from `ui-card` + `ui-btn` + text rather than inventing a new styled primitive.
