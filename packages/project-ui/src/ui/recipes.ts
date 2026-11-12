// Shared Tailwind class recipes. Keep screen-specific layout and one-off controls local.
export const surfaceStyles = {
  frame: "rounded-panel bg-input-bg p-1 shadow-stage-hairline",
  card: "rounded-surface bg-surface shadow-stage-hairline",
  elevatedCard: "rounded-surface bg-gradient-to-b from-surface to-surface-muted shadow-stage-hairline",
} as const;

export const textStyles = {
  body: "text-[13px] font-medium leading-[1.5] text-ink-muted",
  caption: "text-[12px] font-medium leading-[1.5] text-ink-subtle",
} as const;
