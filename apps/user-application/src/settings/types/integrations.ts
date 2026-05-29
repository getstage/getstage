import type { ProviderId } from "@stage/data-ops/contracts";

export type IntegrationRowModel = {
  id: string;
  providerId: ProviderId;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  detail: string;
};
