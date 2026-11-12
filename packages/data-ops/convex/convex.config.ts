import { defineApp } from "convex/server";
import r2 from "@convex-dev/r2/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";
import presence from "@convex-dev/presence/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";

const app = defineApp();

app.use(r2);
app.use(rateLimiter);
app.use(stripe);
app.use(resend);
app.use(presence);
// Background jobs for AI tools (MCP): Research reference collection, moodboard imports.
app.use(workflow);

export default app;
