import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProjectExportProvider } from "@shared/models/desktop";

export const EXPORT_APP_LABELS: Record<ProjectExportProvider, string> = {
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  vscode: "VS Code",
  zed: "Zed",
  antigravity: "Antigravity",
  windsurf: "Windsurf",
};

export const EXPORT_LAUNCH_ACTIONS: Array<{
  id: ProjectExportProvider;
  logoSrc: string;
  logoOnWhite?: boolean;
}> = [
  { id: "claude", logoSrc: "/logos/integrations/claude.svg" },
  { id: "codex", logoSrc: "/logos/integrations/codex.svg", logoOnWhite: true },
  { id: "cursor", logoSrc: "/logos/integrations/cursor.svg" },
  { id: "vscode", logoSrc: "/logos/integrations/vscode.svg" },
  { id: "zed", logoSrc: "/logos/integrations/zed.svg" },
  { id: "antigravity", logoSrc: "/logos/integrations/antigravity.svg" },
  { id: "windsurf", logoSrc: "/logos/integrations/windsurf.svg" },
];

export function ExportDestinationMenu({
  availableApps,
  disabled = false,
  triggerLabel,
  triggerClassName,
  dropUp = false,
  onExportOnly,
  onOpenIn,
}: {
  availableApps: Record<ProjectExportProvider, boolean> | null;
  disabled?: boolean;
  triggerLabel: string;
  triggerClassName?: string;
  dropUp?: boolean;
  onExportOnly: () => void;
  onOpenIn: (id: ProjectExportProvider) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const installed = EXPORT_LAUNCH_ACTIONS.filter((action) => availableApps?.[action.id]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function run(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={
          triggerClassName ??
          "inline-flex h-[27px] shrink-0 cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#262626] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {triggerLabel}
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-[15px] w-[15px]">
          <path
            d="m4.5 6.5 3.5 3 3.5-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div
          className={`absolute right-0 z-40 flex w-[240px] flex-col rounded-[10px] border border-[#E5E5E5] bg-white p-[8px] shadow-[0_18px_42px_rgba(10,10,10,0.12),0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
            dropUp ? "bottom-[36px]" : "top-[33px]"
          }`}
          role="menu"
          aria-label="Export destinations"
        >
          <MenuItem disabled={disabled} onSelect={() => run(onExportOnly)}>
            Export only
          </MenuItem>
          {installed.map((action) => (
            <MenuItem
              key={action.id}
              disabled={disabled}
              onSelect={() => run(() => onOpenIn(action.id))}
            >
              <span className="flex min-w-0 items-center gap-[8px]">
                {action.logoOnWhite ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-white">
                    <img src={action.logoSrc} alt="" className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <img src={action.logoSrc} alt="" className="h-4 w-4" />
                )}
                <span className="truncate">Open in {EXPORT_APP_LABELS[action.id]}</span>
              </span>
            </MenuItem>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  disabled,
  onSelect,
}: {
  children: ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="flex h-[28px] w-full cursor-pointer items-center rounded-[6px] px-[10px] text-left text-[12px] font-medium leading-[1.25] text-[#262626] outline-none transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
