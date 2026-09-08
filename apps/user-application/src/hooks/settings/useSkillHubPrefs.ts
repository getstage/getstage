import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import {
  parseCatalogPackId,
  parseCatalogSkillId,
} from "@/lib/settings/skillHubIds";
import {
  defaultEnabledComponentPackIds,
  defaultEnabledSkillIds,
  defaultInstalledSkillIds,
} from "@/lib/settings/skillsCatalog";

export function useSkillHubPrefs() {
  const overview = useSettingsOverviewQuery();
  const updatePrefs = useConvexMutation(api.settings.updateSkillHubPrefs);

  const installedSkillIds =
    overview.data?.skillHub?.installedSkillIds ?? defaultInstalledSkillIds();
  const enabledSkillIds =
    overview.data?.skillHub?.enabledSkillIds ?? defaultEnabledSkillIds();
  const enabledComponentPackIds =
    overview.data?.skillHub?.enabledComponentPackIds ??
    defaultEnabledComponentPackIds();

  async function setSkillEnabled(id: string, enabled: boolean) {
    const skillId = parseCatalogSkillId(id);
    const next = enabled
      ? Array.from(new Set([...enabledSkillIds, skillId]))
      : enabledSkillIds.filter((entry) => entry !== skillId);
    await updatePrefs({ enabledSkillIds: next });
  }

  async function addSkill(id: string) {
    const skillId = parseCatalogSkillId(id);
    await updatePrefs({
      installedSkillIds: Array.from(new Set([...installedSkillIds, skillId])),
      enabledSkillIds: Array.from(new Set([...enabledSkillIds, skillId])),
    });
  }

  async function uninstallSkill(id: string) {
    const skillId = parseCatalogSkillId(id);
    await updatePrefs({
      installedSkillIds: installedSkillIds.filter((entry) => entry !== skillId),
      enabledSkillIds: enabledSkillIds.filter((entry) => entry !== skillId),
    });
  }

  async function setPackEnabled(id: string, enabled: boolean) {
    const packId = parseCatalogPackId(id);
    const next = enabled
      ? Array.from(new Set([...enabledComponentPackIds, packId]))
      : enabledComponentPackIds.filter((entry) => entry !== packId);
    await updatePrefs({ enabledComponentPackIds: next });
  }

  return {
    installedSkillIds,
    enabledSkillIds,
    enabledComponentPackIds,
    setSkillEnabled,
    addSkill,
    uninstallSkill,
    setPackEnabled,
    isLoading: overview.isLoading,
  };
}
