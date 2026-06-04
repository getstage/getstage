import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "@shared/ipc/channels";
import type { IntegrationOAuthResult } from "@shared/models/desktop";
import {
  getDesktopIntegrationReturnUrl,
  isStageIntegrationUrl,
  parseIntegrationOAuthCallback,
  type NativeIntegrationProvider,
} from "./helpers/integrations";
import { createMainWindow } from "./windows";

export class DesktopIntegrationsController {
  private pendingCallbackUrl: string | null = null;

  getOAuthReturnUrl(provider: NativeIntegrationProvider) {
    return getDesktopIntegrationReturnUrl(provider);
  }

  queueCallbackUrl(url: string) {
    if (!isStageIntegrationUrl(url)) {
      return;
    }

    this.pendingCallbackUrl = url;
  }

  async consumeQueuedCallback() {
    if (!this.pendingCallbackUrl) {
      return null;
    }

    const url = this.pendingCallbackUrl;
    this.pendingCallbackUrl = null;
    return this.handleCallbackUrl(url);
  }

  handleCallbackUrl(value: string): IntegrationOAuthResult | null {
    if (!isStageIntegrationUrl(value)) {
      return null;
    }

    const result = parseIntegrationOAuthCallback(value);

    if (!result.ok) {
      console.warn(`[stage-integrations] ${result.error}`);
      return result;
    }

    createMainWindow();
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send(IPC_CHANNELS.integrationOAuthCompleted, result);
    });
    console.info(`[stage-integrations] ${result.provider} OAuth ${result.status}`);

    return result;
  }
}

export function createDesktopIntegrationsController() {
  return new DesktopIntegrationsController();
}
