import { useEffect, useState } from "react";
import type { ProjectExportProvider } from "@shared/models/desktop";

const EMPTY_APP_AVAILABILITY: Record<ProjectExportProvider, boolean> = {
  claude: false,
  codex: false,
  cursor: false,
  vscode: false,
  zed: false,
  antigravity: false,
  windsurf: false,
};

export function useInstalledExportApps() {
  const [availableApps, setAvailableApps] = useState<Record<
    ProjectExportProvider,
    boolean
  > | null>(null);

  useEffect(() => {
    const listApps = window.stageDesktop?.project?.listExportApps;
    if (!listApps) {
      setAvailableApps({ ...EMPTY_APP_AVAILABILITY, claude: true, codex: true });
      return;
    }
    void listApps()
      .then((response) => {
        const next = { ...EMPTY_APP_AVAILABILITY };
        for (const app of response.apps) {
          next[app.id] = app.available;
        }
        setAvailableApps(next);
      })
      .catch(() => {
        setAvailableApps({ ...EMPTY_APP_AVAILABILITY, claude: true, codex: true });
      });
  }, []);

  return availableApps;
}
