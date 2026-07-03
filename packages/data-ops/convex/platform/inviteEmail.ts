// Shared Loops transactional invite email used by both the legacy per-project
// collaborator path (collaborators.ts) and the workspace-native path
// (workspaceMembers.ts). Copy is still project-oriented; workspace-specific
// copy is Phase 3.

// process is a Node global that Convex's runtime type surface does not expose;
// this well-known cast is unexpressible otherwise.
const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process;

function getEnv(name: string) {
  return globalProcess?.env?.[name];
}

function getInviteTransactionalId() {
  const transactionalId =
    getEnv("LOOPS_INVITE_TRANSACTIONAL_ID") ??
    getEnv("LOOPS_PROJECT_INVITE_TRANSACTIONAL_ID") ??
    getEnv("AUTH_LOOPS_PROJECT_INVITE_TRANSACTIONAL_ID") ??
    null;

  if (!transactionalId) {
    throw new Error("LOOPS_INVITE_TRANSACTIONAL_ID is not set");
  }

  return transactionalId;
}

function getLoopsApiKey() {
  const apiKey = getEnv("AUTH_LOOPS_API_KEY") ?? getEnv("LOOPS_API_KEY");

  if (!apiKey) {
    throw new Error("AUTH_LOOPS_API_KEY is not set");
  }

  return apiKey;
}

export function toInviteErrorMessage(error: unknown) {
  if (!(error instanceof Error) || !error.message) {
    return "Team member added, but the invite email could not be sent.";
  }

  const message = error.message.trim();
  if (
    message.startsWith("Too many invites") ||
    message.startsWith("You've sent too many invites") ||
    message.startsWith("An invite was already sent")
  ) {
    return message;
  }

  return "Team member added, but the invite email could not be sent.";
}

export async function sendInviteEmail(args: {
  email: string;
  inviterName: string;
  projectName: string;
  workspaceUrl: string;
}) {
  const response = await fetch("https://app.loops.so/api/v1/transactional", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getLoopsApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionalId: getInviteTransactionalId(),
      email: args.email,
      dataVariables: {
        inviterName: args.inviterName,
        projectName: args.projectName,
        portalUrl: args.workspaceUrl,
        workspaceUrl: args.workspaceUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send project invite email: ${response.status} ${errorText}`);
  }
}
