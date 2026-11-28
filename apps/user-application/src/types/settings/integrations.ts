import type { DesktopOAuthProvider } from "@shared/models/desktop";
import type { ProviderId } from "@stage/data-ops/contracts";

export type NativeIntegrationId = DesktopOAuthProvider | "google-sheets" | "paper";

export type IntegrationRowModel = {
  id: string;
  providerId?: ProviderId;
  nativeIntegrationId?: NativeIntegrationId;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  detail: string;
  helpNote?: string;
  status?: string;
};
