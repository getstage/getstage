import { useMutation as useConvexMutation } from "convex/react";
import {
  canonicalGithubRepoUrl,
  deriveImportedSkillHubId,
  parsePublicHttpsUrl,
} from "@shared/models/safeHttpsUrl";
import { deriveImportedWebId, existingSourceName, fallbackPreviewFromUrl } from "@shared/models/sitePreview";
import { api } from "@/lib/convex";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import {
  parseCatalogPackId,
  parseCatalogSkillId,
} from "@/lib/settings/skillHubIds";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
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

  async function persistImported(next: ImportedSkillHubItem[], kind?: ImportedSkillHubItem["kind"], id?: string) {
    if (next.length > MAX_IMPORTED_HUB_ITEMS) {
      throw new Error("You can import up to 32 GitHub or library items.");
    }
    await updatePrefs({
      importedSkillHubItems: next,
      ...(kind === "skill" && id
        ? {
            installedSkillIds: Array.from(new Set([...installedSkillIds, id])),
            enabledSkillIds: Array.from(new Set([...enabledSkillIds, id])),
          }
        : {}),
      ...(kind === "component" && id
        ? {
            enabledComponentPackIds: Array.from(new Set([...enabledComponentPackIds, id])),
          }
        : {}),
    });
  }

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

  function assertNotAlreadyThere(kind: ImportedSkillHubItem["kind"], rawUrl: string) {
    const catalog =
      kind === "skill" ? DISCOVER_SKILL_CATALOG : COMPONENT_PACK_CATALOG;
    const catalogName = existingSourceName(rawUrl, catalog);
    if (catalogName) {
      throw new Error(
        kind === "skill"
          ? `${catalogName} is already in Installed Skills.`
          : `${catalogName} is already in Component Libraries.`,
      );
    }
    const importedName = existingSourceName(
      rawUrl,
      importedSkillHubItems.filter((item) => item.kind === kind),
    );
    if (importedName) {
      throw new Error(`${importedName} is already imported.`);
    }
  }

  async function importFromGithub(kind: ImportedSkillHubItem["kind"], rawUrl: string) {
    const parsed = canonicalGithubRepoUrl(rawUrl);
    assertNotAlreadyThere(kind, parsed.href);
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
    await persistImported(next, kind, id);
  }

  async function importComponentLibrary(rawUrl: string) {
    try {
      canonicalGithubRepoUrl(rawUrl);
    } catch {
      const pageUrl = parsePublicHttpsUrl(rawUrl);
      assertNotAlreadyThere("component", pageUrl);
      let preview = fallbackPreviewFromUrl(pageUrl);
      try {
        const scraped = await window.stageDesktop?.library?.previewHomepage(pageUrl);
        if (scraped) preview = scraped;
      } catch {
        // Hostname + generic icon is enough when scrape fails.
      }
      const id = deriveImportedWebId(new URL(preview.sourceUrl).hostname);
      const item: ImportedSkillHubItem = {
        id,
        kind: "component",
        name: preview.name.slice(0, 80),
        sourceUrl: preview.sourceUrl,
        ...(preview.subtitle ? { subtitle: preview.subtitle } : {}),
        ...(preview.iconUrl ? { iconUrl: preview.iconUrl } : {}),
      };
      const next = [
        item,
        ...importedSkillHubItems.filter(
          (entry) => entry.id !== id && entry.sourceUrl !== preview.sourceUrl,
        ),
      ];
      await persistImported(next, "component", id);
      return;
    }
    await importFromGithub("component", rawUrl);
  }

  async function removeImportedItem(id: string) {
    const current = importedSkillHubItems.find((item) => item.id === id);
    if (!current) {
      throw new Error("Unknown imported item.");
    }
    await updatePrefs({
      importedSkillHubItems: importedSkillHubItems.filter((item) => item.id !== id),
      installedSkillIds: installedSkillIds.filter((entry) => entry !== id),
      enabledSkillIds: enabledSkillIds.filter((entry) => entry !== id),
      enabledComponentPackIds: enabledComponentPackIds.filter((entry) => entry !== id),
    });
  }

  async function renameImportedItem(id: string, nextName: string) {
    const name = nextName.trim();
    if (name.length === 0 || name.length > 80) {
      throw new Error("Imported item name is invalid.");
    }
    const current = importedSkillHubItems.find((item) => item.id === id);
    if (!current) {
      throw new Error("Unknown imported item.");
    }
    await persistImported(
      importedSkillHubItems.map((item) => (item.id === id ? { ...item, name } : item)),
    );
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
    importComponentLibrary,
    renameImportedItem,
    removeImportedItem,
    isLoading: overview.isLoading,
  };
}
