/**
 * Project domain + API internal endpoints — barrel for stable `internal.domain.projects.service.*` paths.
 * Logic: `lib/projects/domain/projectService.ts`, `lib/projects/handlers/*`
 */
export {
  projectTypeValidator,
  phaseInputValidator,
  phaseCreationInputValidator,
  createProjectArgsValidator,
  requireProjectAccessForUserId,
  requirePhaseAccessForUserId,
  requireTaskAccessForUserId,
  listProjectSummariesForUser,
  createProjectForUser,
  addPhaseForUser,
  addTaskForUser,
  toggleTaskForUser,
  setTaskPriorityForUser,
  setTaskKanbanColumnForUser,
  setTaskBoardStateForUser,
  deleteTaskForUser,
} from "../../lib/projects/domain/projectService";

export {
  getProjectForApi,
  getProjectReferenceForApi,
  getTaskForApi,
} from "../../lib/projects/handlers/access";

export {
  createProjectForApi,
  addPhaseForApi,
  addTaskForApi,
  createProjectTaskForApi,
  setTaskPriorityForApi,
  deleteTaskForApi,
  toggleTaskForApi,
} from "../../lib/projects/handlers/mutations";

export {
  listProjectsForApi,
  listPhasesForApi,
  listTasksForApi,
  listUserTasksForApi,
} from "../../lib/projects/handlers/queries";
