import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run once per day to physically remove expired auth records from storage.
crons.daily("prune expired auth records", { hourUTC: 2, minuteUTC: 0 }, internal.domain.auth.cleanup.pruneExpiredAuthRecords);
crons.hourly("normalize legacy uploaded assets", { minuteUTC: 7 }, internal.r2.normalizeLegacyUploadedAssets, {
  limit: 200,
});
crons.hourly("prune stale pending uploads", { minuteUTC: 17 }, internal.r2.pruneStalePendingUploads, {
  limit: 100,
});
// Physically remove email drip rows that reached a terminal state > 30 days ago
// (sent / skipped / cancelled / failed). Keeps scheduledEmails small.
crons.hourly("prune finalized emails", { minuteUTC: 23 }, internal.emails.cleanupFinalizedEmails, {
  olderThanDays: 30,
  limit: 200,
});

export default crons;
