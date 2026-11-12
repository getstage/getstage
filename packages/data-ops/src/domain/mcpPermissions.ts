// What a connected AI tool (MCP) may do in Stage, chosen per step on the "Connect your AI tool" page.
// Viewing projects and results is always allowed. A step needs the steps it is built on, in Stage's order.
// Used by the connect page (checkboxes), the API (enforcement) and the MCP server (which tools it lists).

export const MCP_PERMISSIONS = [
  { id: "create_projects", label: "Create projects", description: "Start new projects in your workspace.", needs: [], usesCredits: false },
  { id: "research", label: "Research", description: "Fill in the Research form, collect references and save Research.", needs: [], usesCredits: true },
  { id: "strategy", label: "Strategy", description: "Save the Strategy.", needs: ["research"], usesCredits: false },
  { id: "moodboard", label: "Moodboard & style guide", description: "Add images (Refero, links, Figma) and save style guides.", needs: ["strategy"], usesCredits: true },
  { id: "flows", label: "Flows", description: "Save the Flows.", needs: ["strategy"], usesCredits: false },
  { id: "wireframes", label: "Wireframes", description: "Save the Wireframes.", needs: ["flows"], usesCredits: false },
] as const;

export type McpPermission = (typeof MCP_PERMISSIONS)[number]["id"];

export const ALL_MCP_PERMISSIONS: McpPermission[] = MCP_PERMISSIONS.map((permission) => permission.id);

const byId = new Map(MCP_PERMISSIONS.map((permission) => [permission.id, permission]));

export function isMcpPermission(value: string): value is McpPermission {
  return byId.has(value as McpPermission);
}

/** The permission plus everything it is built on (ticking Strategy also ticks Research). */
export function withNeeded(selected: Iterable<McpPermission>): McpPermission[] {
  const result = new Set<McpPermission>();
  const add = (id: McpPermission) => {
    if (result.has(id)) return;
    result.add(id);
    byId.get(id)?.needs.forEach(add);
  };
  [...selected].forEach(add);
  return ALL_MCP_PERMISSIONS.filter((id) => result.has(id));
}

/** The selection without the permission and everything built on it (unticking Research unticks Strategy and later). */
export function withoutDependents(selected: Iterable<McpPermission>, removed: McpPermission): McpPermission[] {
  const remaining = new Set(selected);
  const drop = (id: McpPermission) => {
    remaining.delete(id);
    MCP_PERMISSIONS.filter((permission) => (permission.needs as readonly McpPermission[]).includes(id)).forEach((permission) => drop(permission.id));
  };
  drop(removed);
  return ALL_MCP_PERMISSIONS.filter((id) => remaining.has(id));
}

export function mcpPermissionLabel(id: McpPermission) {
  return byId.get(id)?.label ?? id;
}

/**
 * The permission an API write needs, by route (any one of them suffices). Null: no AI tool may make that change.
 * Reads (GET) only need the connection itself.
 */
export function permissionsForWrite(path: string): McpPermission[] | null {
  if (path === "/api/v1/references/search") return ["research", "moodboard"];
  if (path === "/api/v1/projects" || path === "/api/v1/projects/import-plan") return ["create_projects"];
  const rest = /^\/api\/v1\/projects\/[^/]+(\/.*)$/.exec(path)?.[1];
  switch (rest) {
    case "/research/inputs":
    case "/research/start":
    case "/steps/research":
      return ["research"];
    case "/steps/strategy":
      return ["strategy"];
    case "/moodboard/references":
    case "/moodboard/style-guide":
      return ["moodboard"];
    case "/steps/flows":
      return ["flows"];
    case "/steps/generate":
      return ["wireframes"];
    default:
      return null;
  }
}
