import {
  projectContextSchema,
  type ProjectContext,
} from "../contracts/project-context";

export function parseProjectContext(input: unknown): ProjectContext {
  return projectContextSchema.parse(input);
}

export function summarizeProjectContext(context: ProjectContext): string {
  const sections = [
    `Project: ${context.projectName}`,
    context.clientName ? `Client: ${context.clientName}` : undefined,
    context.currentPhase ? `Current phase: ${context.currentPhase}` : undefined,
    context.brief ? `Brief: ${context.brief}` : undefined,
    context.strategy ? `Strategy: ${context.strategy}` : undefined,
    context.visualDirection
      ? `Visual direction: ${context.visualDirection}`
      : undefined,
  ].filter(Boolean);

  return sections.join("\n");
}
