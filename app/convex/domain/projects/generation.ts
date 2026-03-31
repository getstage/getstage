import { generateText, Output } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { resolveProjectGenerationModel } from "../../integrations/llm";

const DEFAULT_PROJECT_DURATION_WEEKS = 6;
const MAX_PHASE_COUNT = 7;
const MAX_TASKS_PER_PHASE = 6;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const projectTypeValues = [
  "branding",
  "web-design",
  "product-design",
  "app-design",
  "packaging",
  "motion-design",
  "illustration",
  "other",
] as const;

const generatedProjectSchema = z.object({
  name: z.string().trim().min(1),
  clientName: z.string().trim().min(1),
  type: z.enum(projectTypeValues),
  durationWeeks: z.number().int().min(1).max(26).optional(),
  phases: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        tasks: z.array(z.string().trim().min(1)).min(1).max(MAX_TASKS_PER_PHASE),
      }),
    )
    .min(1)
    .max(MAX_PHASE_COUNT),
});

type GeneratedProjectPlan = z.infer<typeof generatedProjectSchema>;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function clampDurationWeeks(value: number | undefined) {
  if (!value) {
    return DEFAULT_PROJECT_DURATION_WEEKS;
  }
  return Math.min(26, Math.max(1, Math.round(value)));
}

function buildProjectGenerationSystemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "You turn creative-service briefs into Stage project plans.",
    `Today's date is ${today}.`,
    "Return one practical project structure for a freelancer or small studio.",
    `Use only these project types: ${projectTypeValues.join(", ")}.`,
    "The plan must be realistic, concise, and implementation-ready.",
    "Prefer 4 to 6 phases with clear names.",
    `Keep tasks short and specific. Never exceed ${MAX_TASKS_PER_PHASE} tasks in a phase.`,
    "Infer a reasonable duration in weeks when the user implies a timeline.",
    "Make the project name client-facing and specific.",
  ].join("\n");
}

async function generateProjectPlan(
  description: string,
  model: string | undefined,
): Promise<GeneratedProjectPlan> {
  const resolvedModel = resolveProjectGenerationModel(model);
  const { output } = await generateText({
    model: resolvedModel.model,
    system: buildProjectGenerationSystemPrompt(),
    prompt: description,
    maxOutputTokens: 1400,
    output: Output.object({
      name: "stage_project_plan",
      description: "Generate a Stage project plan from a client brief.",
      schema: generatedProjectSchema,
    }),
  });

  return output;
}

export const generateProjectForApi = internalAction({
  args: {
    userId: v.id("users"),
    description: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    const plan = await generateProjectPlan(args.description, args.model);
    const startDate = startOfToday();
    const durationWeeks = clampDurationWeeks(plan.durationWeeks);
    const endDate = startDate + durationWeeks * MS_PER_WEEK;

    return ctx.runMutation(internal.domain.projects.service.createProjectForApi, {
      userId: args.userId,
      name: plan.name,
      clientName: plan.clientName,
      type: plan.type,
      method: "ai",
      startDate,
      endDate,
      phases: plan.phases,
    });
  },
});
