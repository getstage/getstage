import { parseExternalNavigationUrl } from "@shared/models/safeHttpsUrl";

export async function openExternalLink(url: string) {
  const parsed = parseExternalNavigationUrl(url);

  if (window.stageDesktop?.shell?.openExternal) {
    await window.stageDesktop.shell.openExternal(parsed);
    return;
  }

  window.open(parsed, "_blank", "noopener,noreferrer");
}
