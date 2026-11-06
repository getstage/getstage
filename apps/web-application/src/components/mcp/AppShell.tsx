import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache/hooks";
import chevronDown from "@/assets/home/chevron-down.svg";
import navDashboard from "@/assets/home/nav-dashboard.svg";
import navHelp from "@/assets/home/nav-help.svg";
import navIntegrations from "@/assets/home/nav-integrations.svg";
import navMore from "@/assets/home/nav-more.svg";
import navProjects from "@/assets/home/nav-projects.svg";
import navSettings from "@/assets/home/nav-settings.svg";
import stageMark from "@/assets/home/stage-mark.svg";
import { useAuth, useSignOut } from "@/lib/auth";
import { api } from "@/lib/convex";
import { cn } from "@/lib/utils";

// Signed-in web app shell (Figma 2491-4955 / 2491-5129 / 2495-5463). Rendered once by the /app layout route,
// so the sidebar and its data stay mounted while the pages under it change.

const NAV = [
  { label: "Dashboard", to: "/app", icon: navDashboard, exact: true },
  { label: "Projects", to: "/app/projects", icon: navProjects, exact: false },
  { label: "Integrations", to: "/app/integrations", icon: navIntegrations, exact: false },
  { label: "Settings", to: "/app/settings", icon: navSettings, exact: false },
] as const;

const SPACE_KEY = "stage.web.activeSpace";

function readStoredSpace() {
  try {
    return window.localStorage.getItem(SPACE_KEY) ?? "";
  } catch {
    return "";
  }
}

type Space = { ownerUserId: string; name: string; role: string };
type ActiveSpace = { spaces: Space[]; active: Space | undefined; choose: (ownerUserId: string) => void };

const ActiveSpaceContext = createContext<ActiveSpace | null>(null);

// One workspace choice for the whole app: the switcher sets it, Projects lists that workspace's projects.
function useActiveSpaceState(): ActiveSpace {
  const spaces = useQuery(api.workspaceMembers.listSpaces);
  const [stored, setStored] = useState(readStoredSpace);
  const active = spaces?.find((space) => space.ownerUserId === stored) ?? spaces?.find((space) => space.role === "owner");
  const choose = (ownerUserId: string) => {
    setStored(ownerUserId);
    try {
      window.localStorage.setItem(SPACE_KEY, ownerUserId);
    } catch {
      // Private mode: the choice lasts for this visit only.
    }
  };
  return { spaces: spaces ?? [], active, choose };
}

export function useActiveSpace() {
  const value = useContext(ActiveSpaceContext);
  if (!value) throw new Error("useActiveSpace must be used inside AppShell.");
  return value;
}

// Figma icons are one colour; a mask lets the same file follow the text colour (active vs inactive).
export function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
    />
  );
}

const ACTIVE_ITEM = "border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] text-[#FAFAFA] [text-shadow:0_0.5px_0.5px_black] drop-shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]";
const ITEM = "flex w-full items-center gap-2 rounded-[6px] border border-transparent px-3 py-1.5 text-[13px] font-medium";

export function AppShell({ children }: { children: ReactNode }) {
  const activeSpace = useActiveSpaceState();
  const { spaces, active, choose } = activeSpace;
  const spaceLabel = active ? (active.role === "owner" ? `${active.name}’s Workspace` : active.name) : "";

  return (
    <ActiveSpaceContext.Provider value={activeSpace}>
      <div className="auth-page flex min-h-dvh gap-2 bg-[#F5F5F5] p-1 leading-[normal] text-[#0A0A0A]">
        <aside className="sticky top-1 hidden h-[calc(100dvh-8px)] w-[240px] shrink-0 flex-col justify-between px-3 py-4 md:flex">
          <div className="flex flex-col gap-7">
            <Link to="/app" className="flex items-start gap-[2px]" aria-label="Stage">
              <img src={stageMark} alt="" className="h-[22.617px] w-[18.848px]" />
              <span className="text-[19.456px] font-semibold leading-none tracking-[-1.1673px] text-black [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display',sans-serif]">Stage</span>
            </Link>
            <div className="flex flex-col gap-4">
              <label className="relative flex items-center justify-between rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-3 py-1.5 drop-shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
                <span className="truncate text-[13px] font-medium text-[#525252]">{spaceLabel}</span>
                <img src={chevronDown} alt="" className="size-[15px] shrink-0" />
                <select
                  aria-label="Workspace"
                  value={active?.ownerUserId ?? ""}
                  onChange={(event) => choose(event.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  {spaces.map((space) => (
                    <option key={space.ownerUserId} value={space.ownerUserId}>
                      {space.role === "owner" ? `${space.name}’s Workspace` : space.name}
                    </option>
                  ))}
                </select>
              </label>
              <nav className="flex flex-col gap-2">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    className={cn(ITEM, "text-[#525252] hover:bg-white")}
                    activeProps={{ className: cn(ITEM, ACTIVE_ITEM) }}
                  >
                    <MaskIcon src={item.icon} className="size-[15px]" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a href="/help" className={cn(ITEM, "text-[#525252] hover:bg-white")}>
              <MaskIcon src={navHelp} className="size-[15px]" />
              Help &amp; Feedback
            </a>
            <UserMenu />
          </div>
        </aside>
        <main className="min-h-[calc(100dvh-8px)] min-w-0 flex-1 rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white px-4 py-11">
          <div className="mx-auto flex w-full max-w-[684px] flex-col gap-8">{children}</div>
        </main>
      </div>
    </ActiveSpaceContext.Provider>
  );
}

// Same menu as the Mac sidebar: who is signed in, Settings, Log out.
function UserMenu() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      {open ? (
        <div role="menu" className="absolute inset-x-0 bottom-[calc(100%+6px)] z-20 flex flex-col rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white p-1 shadow-[0_4px_16px_-4px_rgba(10,10,10,0.25)]">
          <div className="flex flex-col px-2.5 py-2">
            <span className="truncate text-[13px] font-medium text-[#171717]">{user.name}</span>
            <span className="truncate text-[12px] text-[#737373]">{user.email}</span>
          </div>
          <div className="h-px bg-[#E5E5E5]" />
          <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)} className="rounded-[6px] px-2.5 py-2 text-[13px] text-[#171717] hover:bg-[#F5F5F5]">Settings</Link>
          <button role="menuitem" type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} className="rounded-[6px] px-2.5 py-2 text-left text-[13px] text-[#171717] hover:bg-[#F5F5F5]">
            Log out
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(ITEM, "justify-between text-[#0A0A0A] hover:bg-white", open && "bg-white")}
      >
        <span className="flex min-w-0 items-center gap-2">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-6 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E5E5E5] text-[11px] text-[#525252]">{user.name.slice(0, 1)}</span>
          )}
          <span className="truncate">{user.name}</span>
        </span>
        <MaskIcon src={navMore} className="size-[15px] text-[#525252]" />
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-2 leading-[1.2]">
        <h1 className="text-[20px] font-semibold text-[#0A0A0A]">{title}</h1>
        <p className="text-[13px] font-medium text-[#737373]">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

// Grey card with a header row and a white inner panel (Figma "Frame 212/213").
export function Card({ title, subtitle, aside, bodyClassName, children }: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 overflow-hidden rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
      <div className={cn("flex items-center justify-between gap-3 px-3", subtitle ? "pb-3 pt-2" : "py-2")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{title}</h2>
          {subtitle ? <p className="text-[12px] text-[#525252]">{subtitle}</p> : null}
        </div>
        {aside}
      </div>
      <div className={cn("flex flex-col rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]", bodyClassName ?? "gap-3 p-3")}>
        {children}
      </div>
    </section>
  );
}

export function StatusBadge({ status, size = "md" }: { status: "connected" | "off" | "warning"; size?: "sm" | "md" }) {
  const label = status === "connected" ? "Connected" : status === "warning" ? "Needs the Stage Mac app" : "Not Connected";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border-[0.5px] font-medium whitespace-nowrap",
        size === "sm" ? "px-1 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        status === "connected" && "border-[#34D399] bg-[#D1FAE5] text-[#022C22] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]",
        status === "warning" && "border-[#FBBF24] bg-[#FEF3C7] px-1.5 text-[#451A03] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]",
        status === "off" && (size === "sm" ? "border-[#E5E5E5] bg-[#FAFAFA] font-normal text-[#737373]/70" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#737373] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]"),
      )}
    >
      {label}
    </span>
  );
}
