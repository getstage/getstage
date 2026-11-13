import { McpServer } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import { TOOLS, about } from "../src/annotations";

// The server module calls the Stage API through the Worker runtime; the tool list doesn't need it.
vi.mock("../src/stageApi", () => ({ StageApiError: class extends Error {}, stageApi: vi.fn() }));
vi.mock("agents/mcp/server", () => ({ getMcpAuthContext: () => undefined }));

const { createServer } = await import("../src/server");

// What the server really registers (all tools: no per-step permissions in this context).
function registeredTools() {
  const register = vi.spyOn(McpServer.prototype, "registerTool");
  createServer();
  const tools = Object.fromEntries(register.mock.calls.map(([name, config]) => [name, config as { title?: string; annotations?: object }]));
  register.mockRestore();
  return tools;
}

describe("MCP tool annotations", () => {
  const registered = registeredTools();

  it("the server registers exactly the 17 annotated tools", () => {
    expect(Object.keys(registered).sort()).toEqual(Object.keys(TOOLS).sort());
    expect(Object.keys(TOOLS)).toHaveLength(17);
  });

  it.each(Object.keys(TOOLS) as (keyof typeof TOOLS)[])("%s is registered with its title and explicit hints", (name) => {
    expect(registered[name]).toMatchObject(about(name));
    const { readOnlyHint, destructiveHint, openWorldHint } = TOOLS[name];
    for (const hint of [readOnlyHint, destructiveHint, openWorldHint]) expect(typeof hint).toBe("boolean");
    if (readOnlyHint) expect(destructiveHint).toBe(false);
  });
});
