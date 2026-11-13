import { describe, expect, it } from "vitest";
import { TOOLS } from "../src/annotations";
import { STEPS } from "../src/steps";

describe("MCP tool annotations", () => {
  it("cover all 17 tools, including every step's save tool", () => {
    expect(Object.keys(TOOLS)).toHaveLength(17);
    for (const { tool } of Object.values(STEPS)) expect(TOOLS).toHaveProperty(tool);
  });

  it.each(Object.entries(TOOLS))("%s has a title and explicit hints", (_name, entry) => {
    expect(entry.title).toBeTruthy();
    for (const hint of ["readOnlyHint", "destructiveHint", "openWorldHint"] as const) expect(typeof entry[hint]).toBe("boolean");
    if (entry.readOnlyHint) expect(entry.destructiveHint).toBe(false);
  });
});
