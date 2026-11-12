import { z } from "zod";
import type { ProjectSummary } from "@stage/data-ops";
import { getInitials } from "../Avatar";

// A project as the sidebar (search, project list) shows it.
export const dashboardProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoLabel: z.string(),
  accentColor: z.string(),
  projectImageUrl: z.string().optional(),
  clientName: z.string().optional(),
  phaseName: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export type DashboardProject = z.infer<typeof dashboardProjectSchema>;

export const PRIMARY_ACCENT = "#8782F5";

export function buildSidebarProjectsFromSummaries(
  summaries: ProjectSummary[],
): DashboardProject[] {
  return summaries.map((project) => ({
    id: project.id,
    name: project.name,
    logoLabel: getInitials(project.name),
    accentColor: PRIMARY_ACCENT,
    projectImageUrl: project.projectImageUrl,
    clientName: project.clientName,
    phaseName: project.type
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    startDate: project.startDate,
    endDate: project.endDate,
  }));
}

// "Wessel Dieben" → "WD"; "ST" until someone is signed in.
export function getAccountInitials(label: string) {
  if (!label || label === "Not signed in") {
    return "ST";
  }

  const [first, second] = label
    .split(/[\s@._-]+/)
    .filter(Boolean);

  return `${first?.[0] ?? "S"}${second?.[0] ?? first?.[1] ?? "T"}`.toUpperCase();
}
