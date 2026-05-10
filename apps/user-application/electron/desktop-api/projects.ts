import {
  projectDetailSchema,
  projectSummarySchema,
  type ProjectDetail,
  type ProjectSummary,
} from "@stage/data-ops";
import { z } from "zod";
import type { DesktopAuthController } from "../auth";
import { fetchDesktopApiJson } from "../helpers/desktop-api";

const projectsResponseSchema = z.object({
  projects: z.array(projectSummarySchema),
});

const projectResponseSchema = z.object({
  project: projectDetailSchema,
});

const projectIdSchema = z.string().min(1, "Project id is required");

export async function listProjects(
  authController: DesktopAuthController,
): Promise<ProjectSummary[]> {
  const data = await fetchDesktopApiJson<unknown>({
    authController,
    path: "/projects",
  });
  return projectsResponseSchema.parse(data).projects;
}

export async function getProject(
  authController: DesktopAuthController,
  rawProjectId: unknown,
): Promise<ProjectDetail> {
  const projectId = projectIdSchema.parse(rawProjectId);
  const data = await fetchDesktopApiJson<unknown>({
    authController,
    path: `/projects/${encodeURIComponent(projectId)}`,
  });
  return projectResponseSchema.parse(data).project;
}
