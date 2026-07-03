import { defineApp } from "convex/server";
import r2 from "@convex-dev/r2/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";
import resend from "@convex-dev/resend/convex.config.js";

const app = defineApp();

app.use(r2);
app.use(rateLimiter);
app.use(stripe);
app.use(resend);

export default app;
