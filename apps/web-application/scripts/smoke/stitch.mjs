import {
  assert,
  createProjectPayload,
  logStep,
  stageRequest,
  uploadBinary,
} from "./shared.mjs";
import { Stitch, StitchToolClient } from "@google/stitch-sdk";

function extractStitchProjectId(url) {
  const match = url.match(/\/projects\/([^/?#]+)/i);
  return match?.[1];
}

function requireStitchApiKey() {
  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("STITCH_API_KEY is required for the Stitch smoke test.");
  }
  return apiKey;
}

function buildStitchProjectUrl(projectId) {
  return `https://stitch.withgoogle.com/projects/${projectId}`;
}

async function downloadImageBytes(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download Stitch image ${imageUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, contentType };
}

async function main() {
  const apiKey = requireStitchApiKey();
  const client = new StitchToolClient({ apiKey });
  const stitch = new Stitch(client);

  try {
  logStep("Creating a project for the Stitch flow");
  const created = await stageRequest("POST", "projects/import-plan", {
    body: createProjectPayload("Stitch smoke project"),
  });
  const project = created.project;
  assert(project?.id, "Expected created project with id.");

  const providedProjectUrl = process.env.STAGE_STITCH_PROJECT_URL?.trim();
  const providedProjectId = providedProjectUrl
    ? extractStitchProjectId(providedProjectUrl)
    : undefined;

  let stitchProject;
  if (providedProjectId) {
    logStep("Loading the provided real Stitch project");
    stitchProject = stitch.project(providedProjectId);
    await stitchProject.screens();
  } else {
    logStep("Creating a real Stitch project through the SDK");
    stitchProject = await stitch.createProject(`Stage smoke ${Date.now()}`);
  }

  const externalProjectId = stitchProject.id;
  const externalProjectUrl = buildStitchProjectUrl(externalProjectId);

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

  logStep("Generating a real Stitch screen");
  const screen = await stitchProject.generate(
    "Create a desktop dashboard overview screen for a design studio project. Keep it clean and structured.",
    "DESKTOP",
  );
  const imageUrl = await screen.getImage();
  const { bytes, contentType } = await downloadImageBytes(imageUrl);

  logStep("Requesting a signed preview upload URL");
  const upload = await stageRequest("POST", `projects/${project.id}/designs/upload-url`, {
    body: {
      fileName: "smoke-preview.png",
      fileSize: bytes.byteLength,
      mimeType: contentType,
    },
  });
  assert(upload.uploadUrl && upload.r2ObjectKey, "Expected upload URL and R2 object key.");

  logStep("Uploading the real Stitch preview image to R2");
  await uploadBinary(upload.uploadUrl, bytes, contentType);

  logStep("Loading project phases so the preview can be tagged");
  const phasesResponse = await stageRequest("GET", `projects/${project.id}/phases`);
  const designPhase =
    phasesResponse.phases?.find(
      (phase) => typeof phase.name === "string" && phase.name.toLowerCase() === "design",
    ) ?? phasesResponse.phases?.[0];
  const phaseId = designPhase?.id;
  assert(phaseId, "Expected at least one phase on the project.");

  logStep("Syncing the latest Stitch preview set");
  const synced = await stageRequest("POST", `projects/${project.id}/designs/sync`, {
    body: {
      externalProjectUrl,
      externalProjectId,
      title: "Smoke Stitch workspace",
      screens: [
        {
          stitchScreenId: screen.id,
          r2ObjectKey: upload.r2ObjectKey,
          title: "Smoke preview",
          prompt: "Create a desktop dashboard overview screen for a design studio project.",
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
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`\n[smoke] Stitch smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
