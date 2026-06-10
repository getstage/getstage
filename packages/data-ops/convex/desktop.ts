import { mutation, query } from "./_generated/server";
import * as handlers from "./lib/desktop/handlers";

export const listProjects = query({
  args: handlers.listProjectsArgs,
  returns: handlers.listProjectsReturns,
  handler: handlers.listProjectsHandler,
});

export const getProject = query({
  args: handlers.getProjectArgs,
  returns: handlers.getProjectReturns,
  handler: handlers.getProjectHandler,
});

export const listProjectPhases = query({
  args: handlers.listProjectPhasesArgs,
  returns: handlers.listProjectPhasesReturns,
  handler: handlers.listProjectPhasesHandler,
});

export const getProjectData = query({
  args: handlers.getProjectDataArgs,
  returns: handlers.getProjectDataReturns,
  handler: handlers.getProjectDataHandler,
});

export const listPhaseTasks = query({
  args: handlers.listPhaseTasksArgs,
  returns: handlers.listPhaseTasksReturns,
  handler: handlers.listPhaseTasksHandler,
});

export const listUserTasks = query({
  args: handlers.listUserTasksArgs,
  returns: handlers.listUserTasksReturns,
  handler: handlers.listUserTasksHandler,
});

export const createProject = mutation({
  args: handlers.createProjectArgs,
  returns: handlers.createProjectReturns,
  handler: handlers.createProjectHandler,
});

export const createTask = mutation({
  args: handlers.createTaskArgs,
  returns: handlers.createTaskReturns,
  handler: handlers.createTaskHandler,
});

export const setTaskKanbanColumn = mutation({
  args: handlers.setTaskKanbanColumnArgs,
  returns: handlers.setTaskKanbanColumnReturns,
  handler: handlers.setTaskKanbanColumnHandler,
});

export const setTaskPriority = mutation({
  args: handlers.setTaskPriorityArgs,
  returns: handlers.setTaskPriorityReturns,
  handler: handlers.setTaskPriorityHandler,
});

export const updateTaskBoardState = mutation({
  args: handlers.updateTaskBoardStateArgs,
  returns: handlers.updateTaskBoardStateReturns,
  handler: handlers.updateTaskBoardStateHandler,
});

export const deleteTask = mutation({
  args: handlers.deleteTaskArgs,
  returns: handlers.deleteTaskReturns,
  handler: handlers.deleteTaskHandler,
});
