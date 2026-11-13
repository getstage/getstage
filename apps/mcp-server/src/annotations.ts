// Each tool's name and behaviour for clients and the Claude/ChatGPT directories, matching what it really does:
// read-only tools only read Stage; "replaces" tools overwrite a saved result; open-world tools reach outside
// Stage (Refero, Details, image links, Figma).
const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const REPLACES = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
export const TOOLS = {
  whoami: { title: "Show connected account", ...READ },
  list_projects: { title: "List projects", ...READ },
  get_project: { title: "Get project", ...READ },
  get_research_inputs: { title: "Get Research form", ...READ },
  get_step_results: { title: "Get step results", ...READ },
  get_run_status: { title: "Get background job status", ...READ },
  get_build_brief: { title: "Get build brief", ...READ },
  search_references: { title: "Search reference screens", ...READ, openWorldHint: true },
  create_project: { title: "Create project", ...WRITE },
  start_research: { title: "Start Research", ...WRITE, openWorldHint: true },
  add_to_moodboard: { title: "Add images to moodboard", ...WRITE, openWorldHint: true },
  set_research_inputs: { title: "Save Research form", ...REPLACES },
  save_research: { title: "Save Research", ...REPLACES },
  save_strategy: { title: "Save Strategy", ...REPLACES },
  save_flows: { title: "Save Flows", ...REPLACES },
  save_wireframes: { title: "Save Wireframes", ...REPLACES },
  save_style_guide: { title: "Save style guide", ...REPLACES },
} as const;

/** Title and annotations for a tool's registration. */
export function about(name: keyof typeof TOOLS) {
  const { title, ...hints } = TOOLS[name];
  return { title, annotations: { title, ...hints } };
}
