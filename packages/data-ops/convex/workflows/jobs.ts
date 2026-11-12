import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "../_generated/api";

// Background jobs for AI tools (MCP). A tool call only starts a job and returns its run id; the work runs here
// as durable steps, and the tool checks the run's status. maxParallelism caps how many steps run at once across
// all users (Refero/Details searches, image imports), so a burst of jobs queues instead of filling Convex's
// action slots or hitting Refero's rate limit. Actions retry with backoff on transient errors.
export const jobs = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 10,
    retryActionsByDefault: true,
    defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
  },
});
