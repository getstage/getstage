import { Tray, app, nativeImage, type NativeImage } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { openCompanionFromTray } from "./windows";

let stageTray: Tray | null = null;

function getTrayIcon(): NativeImage | null {
  const iconCandidates = app.isPackaged
    ? [
        join(process.resourcesPath, "public", "apple-touch-icon.png"),
        join(process.resourcesPath, "app.asar.unpacked", "public", "apple-touch-icon.png"),
      ]
    : [
        join(app.getAppPath(), "public", "apple-touch-icon.png"),
        join(__dirname, "../../public/apple-touch-icon.png"),
      ];

  const iconPath = iconCandidates.find((candidate) => existsSync(candidate));
  if (!iconPath) {
    console.warn("[stage-tray] Tray icon was not found. Skipping tray setup.");
    return null;
  }

  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    console.warn(`[stage-tray] Tray icon could not be loaded from ${iconPath}. Skipping tray setup.`);
    return null;
  }

  return image.resize({ width: 18, height: 18 });
}

export function installStageTray() {
  if (stageTray) {
    return stageTray;
  }

  const icon = getTrayIcon();
  if (!icon) {
    return null;
  }

  try {
    stageTray = new Tray(icon);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown tray setup error.";
    console.warn(`[stage-tray] ${message}`);
    return null;
  }

  stageTray.setToolTip("Stage");
  stageTray.on("click", () => openCompanionFromTray());
  stageTray.on("right-click", () => openCompanionFromTray());

  return stageTray;
}
