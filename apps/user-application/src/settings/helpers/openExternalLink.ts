export async function openExternalLink(url: string) {
  if (window.stageDesktop?.shell?.openExternal) {
    await window.stageDesktop.shell.openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
