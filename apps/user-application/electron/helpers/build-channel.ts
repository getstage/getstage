// Testing DMGs run as a separate app ("Stage Testing": own URL scheme, data folder
// and engine port) so they can be open next to production without sharing a session.
export const IS_TESTING_BUILD = process.env.STAGE_DESKTOP_CHANNEL === "testing";
