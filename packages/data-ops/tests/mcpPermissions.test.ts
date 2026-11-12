import { describe, expect, it } from "vitest";
import { permissionsForWrite, withNeeded, withoutDependents } from "../src/domain/mcpPermissions";

describe("MCP permissions", () => {
  it("ticking a step also ticks what it is built on", () => {
    expect(withNeeded(["wireframes"])).toEqual(["research", "strategy", "flows", "wireframes"]);
    expect(withNeeded(["moodboard", "create_projects"])).toEqual(["create_projects", "research", "strategy", "moodboard"]);
  });

  it("unticking a step unticks everything built on it", () => {
    const all = withNeeded(["create_projects", "moodboard", "wireframes"]);
    expect(withoutDependents(all, "research")).toEqual(["create_projects"]);
    expect(withoutDependents(all, "flows")).toEqual(["create_projects", "research", "strategy", "moodboard"]);
  });

  it("maps every write the MCP tools make to a permission, and refuses the rest", () => {
    expect(permissionsForWrite("/api/v1/projects")).toEqual(["create_projects"]);
    expect(permissionsForWrite("/api/v1/projects/p1/research/start")).toEqual(["research"]);
    expect(permissionsForWrite("/api/v1/projects/p1/steps/generate")).toEqual(["wireframes"]);
    expect(permissionsForWrite("/api/v1/references/search")).toEqual(["research", "moodboard"]);
    expect(permissionsForWrite("/api/v1/projects/p1/phases")).toBeNull();
  });
});
