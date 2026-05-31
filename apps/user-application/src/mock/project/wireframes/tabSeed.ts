import type { ScreenItem } from "@/types/project/wireframesTab";
import { mockWireframesArtifact } from "./wireframesArtifact";
import { mapConfigureScreenToScreenItem } from "@/lib/project/mapWireframesArtifactToTabData";

export function createSeedConfigureScreens(): ScreenItem[] {
  return mockWireframesArtifact.configureScreens.map(mapConfigureScreenToScreenItem);
}
