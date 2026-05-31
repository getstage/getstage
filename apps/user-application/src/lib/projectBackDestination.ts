const PROJECT_BACK_DESTINATION_KEY = "stage:project-back-destination";

export type ProjectBackDestination = {
  href: string;
  label: string;
};

const DEFAULT_PROJECT_BACK_DESTINATION: ProjectBackDestination = {
  href: "/",
  label: "Back to dashboard",
};

export function setProjectBackDestination(destination: ProjectBackDestination) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PROJECT_BACK_DESTINATION_KEY, JSON.stringify(destination));
}

export function getProjectBackDestination(): ProjectBackDestination {
  if (typeof window === "undefined") return DEFAULT_PROJECT_BACK_DESTINATION;

  const stored = window.sessionStorage.getItem(PROJECT_BACK_DESTINATION_KEY);
  if (!stored) return DEFAULT_PROJECT_BACK_DESTINATION;

  try {
    const parsed = JSON.parse(stored) as Partial<ProjectBackDestination>;
    if (typeof parsed.href === "string" && typeof parsed.label === "string") {
      return {
        href: parsed.href,
        label: parsed.label,
      };
    }
  } catch {
    // Ignore malformed session state and fall back.
  }

  return DEFAULT_PROJECT_BACK_DESTINATION;
}
