import { Stitch, StitchToolClient } from "@google/stitch-sdk";

function extractStitchProjectId(url) {
  const match = url.match(/\/projects\/([^/?#]+)/i);
  return match?.[1];
}

async function main() {
  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("STITCH_API_KEY is required.");
  }

  const client = new StitchToolClient({ apiKey });
  const stitch = new Stitch(client);

  try {
    const providedProjectUrl = process.env.STAGE_STITCH_PROJECT_URL?.trim();

    if (providedProjectUrl) {
      const projectId = extractStitchProjectId(providedProjectUrl);
      if (!projectId) {
        throw new Error("STAGE_STITCH_PROJECT_URL must be a valid Stitch project URL.");
      }

      const project = stitch.project(projectId);
      const screens = await project.screens();

      console.log("[stitch] API key is valid.");
      console.log(`[stitch] Project reachable: ${projectId}`);
      console.log(`[stitch] Screens found: ${screens.length}`);
      return;
    }

    const projects = await stitch.projects();
    console.log("[stitch] API key is valid.");
    console.log(`[stitch] Accessible projects: ${projects.length}`);
    if (projects[0]) {
      console.log(`[stitch] First project: ${projects[0].id}`);
    }
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[stitch] Check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
