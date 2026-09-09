import { useMutation as useConvexMutation } from "convex/react";
import {
  canonicalGithubRepoUrl,
  deriveImportedSkillHubId,
} from "@shared/models/safeHttpsUrl";
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
  type ImportedSkillHubItem,
} from "@/lib/settings/skillsCatalog";

const MAX_IMPORTED_HUB_ITEMS = 32;

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
  const importedSkillHubItems: ImportedSkillHubItem[] =
    overview.data?.skillHub?.importedSkillHubItems ?? [];
  const extraSkillIds = importedSkillHubItems
    .filter((item) => item.kind === "skill")
    .map((item) => item.id);
  const extraPackIds = importedSkillHubItems
    .filter((item) => item.kind === "component")
    .map((item) => item.id);

  async function setSkillEnabled(id: string, enabled: boolean) {
    const skillId = parseCatalogSkillId(id, extraSkillIds);
    const next = enabled
      ? Array.from(new Set([...enabledSkillIds, skillId]))
      : enabledSkillIds.filter((entry) => entry !== skillId);
    await updatePrefs({ enabledSkillIds: next });
  }

  async function addSkill(id: string) {
    const skillId = parseCatalogSkillId(id, extraSkillIds);
    await updatePrefs({
      installedSkillIds: Array.from(new Set([...installedSkillIds, skillId])),
      enabledSkillIds: Array.from(new Set([...enabledSkillIds, skillId])),
    });
  }

  async function uninstallSkill(id: string) {
    const skillId = parseCatalogSkillId(id, extraSkillIds);
    const remainingImported = importedSkillHubItems.filter((item) => item.id !== skillId);
    await updatePrefs({
      installedSkillIds: installedSkillIds.filter((entry) => entry !== skillId),
      enabledSkillIds: enabledSkillIds.filter((entry) => entry !== skillId),
      ...(remainingImported.length !== importedSkillHubItems.length
        ? { importedSkillHubItems: remainingImported }
        : {}),
    });
  }

  async function setPackEnabled(id: string, enabled: boolean) {
    const packId = parseCatalogPackId(id, extraPackIds);
    const next = enabled
      ? Array.from(new Set([...enabledComponentPackIds, packId]))
      : enabledComponentPackIds.filter((entry) => entry !== packId);
    await updatePrefs({ enabledComponentPackIds: next });
  }

  async function importFromGithub(kind: ImportedSkillHubItem["kind"], rawUrl: string) {
    const parsed = canonicalGithubRepoUrl(rawUrl);
    const id = deriveImportedSkillHubId(parsed.owner, parsed.repo);
    const item: ImportedSkillHubItem = {
      id,
      kind,
      name: parsed.repo.slice(0, 80),
      sourceUrl: parsed.href,
    };
    const next = [
      item,
      ...importedSkillHubItems.filter(
        (entry) => entry.id !== id && entry.sourceUrl !== parsed.href,
      ),
    ];
    if (next.length > MAX_IMPORTED_HUB_ITEMS) {
      throw new Error("You can import up to 32 GitHub items.");
    }
    await updatePrefs({
      importedSkillHubItems: next,
      ...(kind === "skill"
        ? {
            installedSkillIds: Array.from(new Set([...installedSkillIds, id])),
            enabledSkillIds: Array.from(new Set([...enabledSkillIds, id])),
          }
        : {
            enabledComponentPackIds: Array.from(new Set([...enabledComponentPackIds, id])),
          }),
    });
  }

  return {
    installedSkillIds,
    enabledSkillIds,
    enabledComponentPackIds,
    importedSkillHubItems,
    extraSkillIds,
    extraPackIds,
    setSkillEnabled,
    addSkill,
    uninstallSkill,
    setPackEnabled,
    importFromGithub,
    isLoading: overview.isLoading,
  };
}
