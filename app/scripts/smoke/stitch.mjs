import {
  assert,
  createProjectPayload,
  logStep,
  stageRequest,
  tinyPngBytes,
  uploadBinary,
} from "./shared.mjs";

async function main() {
  logStep("Creating a project for the Stitch flow");
  const created = await stageRequest("POST", "projects/import-plan", {
    body: createProjectPayload("Stitch smoke project"),
  });
  const project = created.project;
  assert(project?.id, "Expected created project with id.");

  const externalProjectId = `stitch-smoke-${Date.now()}`;
  const externalProjectUrl = `https://stitch.withgoogle.com/projects/${externalProjectId}`;

  logStep("Linking the Stitch project");
  const linked = await stageRequest("POST", `projects/${project.id}/design-connections`, {
    body: {
      provider: "stitch",
      externalProjectUrl,
      externalProjectId,
      title: "Smoke Stitch workspace",
    },
  });
  assert(linked.connection?.externalProjectUrl === externalProjectUrl, "Expected linked Stitch connection.");

  logStep("Reading linked Stitch projects");
  const connectionList = await stageRequest("GET", `projects/${project.id}/design-connections`);
  assert(
    Array.isArray(connectionList.connections) &&
      connectionList.connections.some((connection) => connection.externalProjectUrl === externalProjectUrl),
    "Expected linked Stitch connection in list response.",
  );

  logStep("Requesting a signed preview upload URL");
  const upload = await stageRequest("POST", `projects/${project.id}/designs/upload-url`, {
    body: {
      fileName: "smoke-preview.png",
      fileSize: tinyPngBytes.byteLength,
      mimeType: "image/png",
    },
  });
  assert(upload.uploadUrl && upload.r2ObjectKey, "Expected upload URL and R2 object key.");

  logStep("Uploading a preview image to R2");
  await uploadBinary(upload.uploadUrl, tinyPngBytes, "image/png");

  logStep("Loading project phases so the preview can be tagged");
  const phasesResponse = await stageRequest("GET", `projects/${project.id}/phases`);
  const phaseId = phasesResponse.phases?.[0]?.id;
  assert(phaseId, "Expected at least one phase on the project.");

  logStep("Syncing the latest Stitch preview set");
  const synced = await stageRequest("POST", `projects/${project.id}/designs/sync`, {
    body: {
      externalProjectUrl,
      externalProjectId,
      title: "Smoke Stitch workspace",
      screens: [
        {
          stitchScreenId: `screen-${Date.now()}`,
          stitchScreenUrl: `${externalProjectUrl}/screens/smoke-preview`,
          r2ObjectKey: upload.r2ObjectKey,
          title: "Smoke preview",
          prompt: "Sync a smoke preview from Stitch into Stage",
          phaseId,
          deviceType: "DESKTOP",
          sortOrder: 0,
        },
      ],
    },
  });
  assert(Array.isArray(synced.designs) && synced.designs.length >= 1, "Expected synced designs response.");

  logStep("Reading synced previews");
  const designs = await stageRequest("GET", `projects/${project.id}/designs`);
  assert(Array.isArray(designs.designs) && designs.designs.length >= 1, "Expected synced design list.");
  assert(
    designs.designs.some((design) => design.stitchProjectId === externalProjectId),
    "Expected synced design linked to the Stitch project.",
  );

  console.log("\n[smoke] Stitch smoke test passed.");
  console.log(`[smoke] Project: ${project.id}`);
  console.log(`[smoke] Connection: ${externalProjectUrl}`);
  console.log(`[smoke] Preview key: ${upload.r2ObjectKey}`);
}

main().catch((error) => {
  console.error(`\n[smoke] Stitch smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
