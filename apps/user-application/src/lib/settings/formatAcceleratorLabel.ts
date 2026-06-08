const MODIFIER_LABELS: Record<string, { mac: string; other: string }> = {
  CommandOrControl: { mac: "⌘", other: "Ctrl" },
  Command: { mac: "⌘", other: "Cmd" },
  Control: { mac: "⌃", other: "Ctrl" },
  Ctrl: { mac: "⌃", other: "Ctrl" },
  Shift: { mac: "⇧", other: "Shift" },
  Alt: { mac: "⌥", other: "Alt" },
  Option: { mac: "⌥", other: "Alt" },
};

const KEY_LABELS: Record<string, string> = {
  Space: "Space",
  Enter: "↩",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

function isMacPlatform() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function formatAcceleratorLabel(accelerator: string) {
  const useMacSymbols = isMacPlatform();
  const parts = accelerator.split("+").filter(Boolean);

  return parts
    .map((part) => {
      const modifier = MODIFIER_LABELS[part];
      if (modifier) {
        return useMacSymbols ? modifier.mac : modifier.other;
      }

      if (KEY_LABELS[part]) {
        return KEY_LABELS[part]!;
      }

      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join(useMacSymbols ? "" : "+");
}
