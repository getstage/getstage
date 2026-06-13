/**
 * Project UI endpoints — registered here only.
 * Logic: `lib/projects/handlers/ui.ts`, `lib/projects/domain/*`
 */
import { mutation, query } from "./_generated/server";
import * as uiHandlers from "./lib/projects/handlers/ui";

export { deleteProjectWithDependents } from "./lib/projects/domain/delete";

export const getById = query({
  args: uiHandlers.getByIdArgs,
  handler: uiHandlers.getByIdHandler,
});

export const getDockProjects = query({
  args: uiHandlers.getDockProjectsArgs,
  handler: uiHandlers.getDockProjectsHandler,
});

export const count = query({
  args: uiHandlers.countArgs,
  handler: uiHandlers.countHandler,
});

export const create = mutation({
  args: uiHandlers.createProjectArgsValidator,
  handler: uiHandlers.createHandler,
});

export const update = mutation({
  args: uiHandlers.updateArgs,
  handler: uiHandlers.updateHandler,
});

export const syncPhases = mutation({
  args: uiHandlers.syncPhasesArgs,
  handler: uiHandlers.syncPhasesHandler,
});

export const deleteById = mutation({
  args: uiHandlers.deleteByIdArgs,
  handler: uiHandlers.deleteByIdHandler,
});
