import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run once per day to physically remove expired auth records from storage.
crons.daily("prune expired auth records", { hourUTC: 2, minuteUTC: 0 }, internal.authCleanup.pruneExpiredAuthRecords);

export default crons;
