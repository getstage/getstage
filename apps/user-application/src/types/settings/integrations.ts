import type { ProviderId } from "@stage/data-ops/contracts";

export type NativeIntegrationId = "figma" | "notion" | "google-sheets";

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
