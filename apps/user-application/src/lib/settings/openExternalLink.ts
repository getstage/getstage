import { parsePublicHttpsUrl } from "@shared/models/safeHttpsUrl";

export async function openExternalLink(url: string) {
  const parsed = parsePublicHttpsUrl(url);

  if (window.stageDesktop?.shell?.openExternal) {
    await window.stageDesktop.shell.openExternal(parsed);
    return;
  }

  window.open(parsed, "_blank", "noopener,noreferrer");
}
