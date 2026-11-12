import { describe, expect, it } from "vitest";
import { z } from "zod";
import { RESEARCH_INPUTS, STEPS, STYLE_GUIDE, stepToolInput } from "../src/steps";

// MCP clients get every tool's input as JSON Schema; one schema that can't convert makes the whole tool list fail
// (Cursor then shows "0 tools"). Convert them the way the MCP SDK does.
const schemas: Record<string, z.ZodType> = {
  set_research_inputs: z.object({ projectId: z.string(), inputs: RESEARCH_INPUTS }),
  save_style_guide: z.object({ projectId: z.string(), styleGuide: STYLE_GUIDE.input }),
  ...Object.fromEntries(Object.entries(STEPS).map(([step, { tool }]) => [tool, stepToolInput(step as keyof typeof STEPS)])),
};

describe("MCP tool schemas", () => {
  it.each(Object.entries(schemas))("%s converts to JSON Schema", (_name, schema) => {
    expect(() => z.toJSONSchema(schema, { io: "input" })).not.toThrow();
  });

  it("only save_research takes a runId", () => {
    expect(Object.keys(stepToolInput("research").shape)).toContain("runId");
    expect(Object.keys(stepToolInput("strategy").shape)).not.toContain("runId");
  });
});
