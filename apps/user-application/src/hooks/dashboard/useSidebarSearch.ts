import { useCallback, useMemo, useState } from "react";
import type { DashboardProject } from "@/models/dashboard/dashboard";

export function useSidebarSearch(projects: DashboardProject[], collapsed: boolean) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCompactSearchOpen, setIsCompactSearchOpen] = useState(false);

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setIsSearchFocused(false);
    setIsCompactSearchOpen(false);
  }, []);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const matchingProjects = useMemo(() => {
    if (!normalizedSearchQuery) return [];

    return projects
      .filter((project) =>
        [
          project.name,
          project.clientName,
          project.phaseName,
          project.logoLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchQuery),
      )
      .slice(0, 5);
  }, [normalizedSearchQuery, projects]);

  const showSearchPreview = !collapsed && isSearchFocused && normalizedSearchQuery.length > 0;
  const compactSearchProjects = normalizedSearchQuery ? matchingProjects : projects.slice(0, 5);

  return {
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    isCompactSearchOpen,
    setIsCompactSearchOpen,
    resetSearch,
    normalizedSearchQuery,
    matchingProjects,
    showSearchPreview,
    compactSearchProjects,
  };
}
