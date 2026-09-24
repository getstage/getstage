import { useEffect, useRef, useState } from "react";
import { SidebarRoundAvatar } from "@/components/dashboard/sidebar/SidebarRoundAvatar";
import { useActiveSpace } from "@/hooks/workspace/useActiveSpace";
import { cn } from "@/lib/utils";

export function workspaceLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Workspace";
  if (/workspace$/i.test(trimmed)) return trimmed;
  return `${trimmed}'s Workspace`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "S").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function SpaceMark({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const photo = avatarUrl && /^https?:\/\//i.test(avatarUrl) ? avatarUrl : undefined;
  return (
    <SidebarRoundAvatar
      imageUrl={photo}
      label={name}
      initials={initials(name)}
      className="h-[22px] w-[22px]"
      accentColor="#F5F5F5"
      fallbackTextClassName="text-[#171717]"
    />
  );
}

function GrabberIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M5 5.625L7.5 3.125L10 5.625" stroke="#737373" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M10 9.375L7.5 11.875L5 9.375" stroke="#737373" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

export function WorkspaceSpaceSelect({
  collapsed = false,
  hideWhenSingle = false,
  className,
}: {
  collapsed?: boolean;
  hideWhenSingle?: boolean;
  className?: string;
}) {
  const { spaces, activeId, setActiveSpaceOwnerId } = useActiveSpace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const active = spaces.find((space) => space.ownerUserId === activeId) ?? spaces[0];

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (collapsed || !active || (hideWhenSingle && spaces.length < 2)) return null;

  const label = workspaceLabel(active.name);

  return (
    <div ref={rootRef} className={cn("relative", className ?? "w-full")}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[32px] w-full items-center gap-[8px] rounded-[8px] border border-[#E5E5E5] bg-white px-[8px] text-left shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.15)] outline-none"
      >
        <SpaceMark name={active.name} avatarUrl={active.avatarUrl} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#171717]">{label}</span>
        <GrabberIcon />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-[8px] bg-white py-[4px] shadow-[0px_8px_24px_rgba(10,10,10,0.12)]"
        >
          {spaces.map((space) => {
            const selected = space.ownerUserId === active.ownerUserId;
            const labelText = workspaceLabel(space.name);
            const sharedName = spaces.filter((item) => workspaceLabel(item.name) === labelText).length > 1;
            return (
              <button
                key={space.ownerUserId}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setActiveSpaceOwnerId(space.ownerUserId);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-[34px] w-full items-center gap-[8px] px-[8px] py-[6px] text-left text-[13px] font-medium",
                  selected ? "bg-[#E8F1FF] text-[#171717]" : "text-[#525252] hover:bg-[#F5F5F5]",
                )}
              >
                <SpaceMark name={space.name} avatarUrl={space.avatarUrl} />
                <span className="min-w-0 truncate">
                  {labelText}
                  {sharedName && space.email ? (
                    <span className="mt-[1px] block truncate text-[11px] font-normal text-[#737373]">{space.email}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarSpaceSelect({ collapsed }: { collapsed: boolean }) {
  return <WorkspaceSpaceSelect collapsed={collapsed} />;
}
