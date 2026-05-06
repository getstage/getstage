import {
  assert,
  createProjectPayload,
  logStep,
  stageRequest,
} from "./shared.mjs";

async function main() {
  logStep("Listing existing projects");
  const listBefore = await stageRequest("GET", "projects");
  assert(Array.isArray(listBefore.projects), "Expected projects list response.");

  logStep("Creating a project with import-plan");
  const created = await stageRequest("POST", "projects/import-plan", {
    body: createProjectPayload("REST smoke project"),
  });
  const project = created.project;
  assert(project?.id, "Expected created project with id.");

  logStep("Loading project detail");
  const detail = await stageRequest("GET", `projects/${project.id}`);
  assert(detail.project?.id === project.id, "Expected matching project detail.");

  logStep("Listing project phases");
  const phasesResponse = await stageRequest("GET", `projects/${project.id}/phases`);
  assert(Array.isArray(phasesResponse.phases), "Expected phase list.");
  assert(phasesResponse.phases.length >= 2, "Expected imported phases.");

  logStep("Adding a new phase with seed tasks");
  const addedPhase = await stageRequest("POST", `projects/${project.id}/phases`, {
    body: {
      name: "Review",
      tasks: ["QA check"],
    },
  });
  assert(addedPhase.phase?.id, "Expected created phase.");

  logStep("Listing tasks for the new phase");
  const phaseTasks = await stageRequest("GET", `phases/${addedPhase.phase.id}/tasks`);
  assert(Array.isArray(phaseTasks.tasks), "Expected task list for phase.");
  assert(phaseTasks.tasks.length >= 1, "Expected seeded task in new phase.");

  logStep("Adding a task to the phase");
  const addedTask = await stageRequest("POST", `phases/${addedPhase.phase.id}/tasks`, {
    body: {
      title: "Smoke follow-up",
    },
  });
  assert(addedTask.task?.id, "Expected created task.");

  logStep("Loading task detail");
  const taskDetail = await stageRequest("GET", `tasks/${addedTask.task.id}`);
  assert(taskDetail.task?.id === addedTask.task.id, "Expected matching task detail.");

  logStep("Toggling the task");
  const toggledTask = await stageRequest("POST", `tasks/${addedTask.task.id}/toggle`);
  assert(toggledTask.task?.isCompleted === true, "Expected task to be toggled complete.");

  logStep("Listing projects again");
  const listAfter = await stageRequest("GET", "projects");
  assert(
    Array.isArray(listAfter.projects) &&
      listAfter.projects.some((candidate) => candidate.id === project.id),
    "Expected created project in list response.",
  );

  console.log("\n[smoke] REST smoke test passed.");
  console.log(`[smoke] Project: ${project.id}`);
  console.log(`[smoke] Phase: ${addedPhase.phase.id}`);
  console.log(`[smoke] Task: ${addedTask.task.id}`);
}

main().catch((error) => {
  console.error(`\n[smoke] REST smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
