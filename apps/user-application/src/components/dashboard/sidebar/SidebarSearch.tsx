import { useEffect, useRef } from "react";
import type { DashboardProject } from "@/models/dashboard/dashboard";
import { sidebarLabelClassName } from "@/lib/dashboard/sidebarNav";
import {
  CompactProjectSearchDialog,
  ProjectSearchPreview,
} from "./ProjectSearchPreview";
import { cn } from "@/lib/utils";

export function SidebarSearch({
  collapsed,
  canExpand,
  searchQuery,
  matchingProjects,
  compactSearchProjects,
  normalizedSearchQuery,
  showSearchPreview,
  isCompactSearchOpen,
  onSearchQueryChange,
  onSearchFocusedChange,
  onCompactSearchOpenChange,
  onCollapsedChange,
  onOpenProject,
  onViewAllProjects,
}: {
  collapsed: boolean;
  canExpand: boolean;
  searchQuery: string;
  matchingProjects: DashboardProject[];
  compactSearchProjects: DashboardProject[];
  normalizedSearchQuery: string;
  showSearchPreview: boolean;
  isCompactSearchOpen: boolean;
  onSearchQueryChange: (query: string) => void;
  onSearchFocusedChange: (focused: boolean) => void;
  onCompactSearchOpenChange: (open: boolean) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenProject: (projectId: string) => void;
  onViewAllProjects: () => void;
}) {
  const searchRef = useRef<HTMLDivElement | null>(null);
  const compactSearchRef = useRef<HTMLDivElement | null>(null);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);
  const labelClassName = sidebarLabelClassName(collapsed);

  useEffect(() => {
    if (!showSearchPreview) return;

    function handlePointerDown(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        onSearchFocusedChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onSearchFocusedChange(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSearchPreview, onSearchFocusedChange]);

  useEffect(() => {
    if (!isCompactSearchOpen) return;

    compactSearchInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCompactSearchOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCompactSearchOpen, onCompactSearchOpenChange]);

  return (
    <div ref={searchRef} className="relative w-full">
      <div
        onClick={() => {
          if (!collapsed) return;
          if (canExpand) {
            onCollapsedChange(false);
            return;
          }
          onCompactSearchOpenChange(true);
        }}
        className={cn(
          "flex h-[32px] items-center overflow-hidden rounded-[6px] bg-white text-[#525252] shadow-[0px_0.45px_0.5px_0px_rgba(10,10,10,0.15)] transition-[width,padding,gap] duration-200 ease-out",
          collapsed
            ? "w-[32px] justify-center gap-0 px-0 cursor-pointer"
            : "w-full justify-start gap-[8px] px-[12px]",
        )}
      >
        <img
          src="/logos/dashboard/search.svg"
          alt=""
          aria-hidden="true"
          className="h-[15px] w-[15px] shrink-0"
        />
        <input
          type="text"
          role="searchbox"
          value={searchQuery}
          onChange={(event) => {
            onSearchQueryChange(event.target.value);
            onSearchFocusedChange(true);
          }}
          onFocus={() => onSearchFocusedChange(true)}
          aria-label="Search projects"
          tabIndex={collapsed ? -1 : 0}
          className={cn(
            labelClassName,
            "bg-transparent p-0 text-[#525252] outline-none placeholder:text-[#525252]",
          )}
          placeholder="Search projects..."
        />
      </div>

      {showSearchPreview ? (
        <ProjectSearchPreview
          projects={matchingProjects}
          query={searchQuery}
          onOpenProject={onOpenProject}
          onViewAllProjects={onViewAllProjects}
        />
      ) : null}

      {isCompactSearchOpen ? (
        <CompactProjectSearchDialog
          refEl={compactSearchRef}
          inputRef={compactSearchInputRef}
          query={searchQuery}
          projects={compactSearchProjects}
          hasQuery={normalizedSearchQuery.length > 0}
          onQueryChange={onSearchQueryChange}
          onOpenProject={onOpenProject}
          onViewAllProjects={onViewAllProjects}
          onClose={() => onCompactSearchOpenChange(false)}
        />
      ) : null}
    </div>
  );
}
