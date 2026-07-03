import { renderStageEmail } from "./dist/render.js";

const TRIAL_TEMPLATES = ["welcome", "download_reminder", "first_project", "trial_ending"];
const ALL_TEMPLATES = [
  "welcome",
  "download_reminder",
  "first_project",
  "workflow_deep_dive",
  "client_portal",
  "trial_ending",
  "welcome_pro",
  "power_user_tips",
  "daily_workflow",
  "feedback",
];

const UNSUB_URL = "https://getstage.co/emails/unsubscribe?token=smoke-test-123";

let ok = true;
const results = [];

for (const template of ALL_TEMPLATES) {
  try {
    const { html, text } = await renderStageEmail(template, {
      firstName: "Adrien",
      unsubscribeUrl: UNSUB_URL,
    });
    const htmlOk = typeof html === "string" && html.length > 100;
    const textOk = typeof text === "string" && text.length > 0;
    const hasUnsub = html.includes("token=smoke-test-123");
    const hasOldTrial = html.includes("7-day");
    const hasNewTrial = TRIAL_TEMPLATES.includes(template) ? html.includes("14-day") : true;
    const rowOk = htmlOk && textOk && hasUnsub && !hasOldTrial && hasNewTrial;
    if (!rowOk) ok = false;
    results.push({
      template,
      html: html.length,
      text: text.length,
      unsub: hasUnsub,
      has7day: hasOldTrial,
      has14day: TRIAL_TEMPLATES.includes(template) ? hasNewTrial : "n/a",
      ok: rowOk,
    });
  } catch (error) {
    ok = false;
    results.push({ template, error: error.message, ok: false });
  }
}

console.table(results);
console.log(ok ? "\nSMOKE OK — all 10 templates render, unsubscribe wired, no '7-day' left." : "\nSMOKE FAIL");
process.exit(ok ? 0 : 1);
