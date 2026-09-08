import { useEffect, useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ProjectExportProvider } from "@shared/models/desktop";
import { SkillsComponentsPanel } from "@/components/project/SkillsComponentsSelect";
import {
  EXPORT_APP_LABELS,
  ExportDestinationMenu,
} from "@/components/project/header/ExportDestinationMenu";
import { useInstalledExportApps } from "@/hooks/project/useInstalledExportApps";
import { useSkillHubPrefs } from "@/hooks/settings/useSkillHubPrefs";
import {
  useAssetsArtifact,
  useFlowsArtifact,
  useMoodboardArtifact,
  useResearchArtifact,
  useStrategyArtifact,
  useWireframesArtifact,
} from "@/hooks/project";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import {
  PROJECT_EXPORT_SECTIONS,
  buildProjectExport,
  hasExportableWireframes,
  type ProjectExportSection,
} from "@/lib/project/projectExport";
import {
  initialPickerSelection,
  sanitizeProjectCatalogSelection,
} from "@/lib/settings/skillHubIds";

const SECTION_LABELS: Record<
  ProjectExportSection,
  { label: string; description: string }
> = {
  research: {
    label: "Research",
    description: "Findings, competitors and references",
  },
  strategy: {
    label: "Strategy",
    description: "Approved product and design direction",
  },
  moodboard: {
    label: "Moodboard",
    description: "Visual references and directions",
  },
  styleGuide: {
    label: "Style guide",
    description: "Colors, typography and visual tokens",
  },
  flows: {
    label: "Flows",
    description: "User flows, screens and key elements",
  },
  wireframes: {
    label: "Wireframes",
    description: "Generated screen structure and source",
  },
  assets: {
    label: "Assets",
    description: "Project uploads and asset metadata",
  },
};

type ExportStep = "sections" | "skills";

export type ProjectExportDialogProps = {
  projectId: string;
  projectName: string;
  clientName: string;
  typeLabel: string;
  skillIds: readonly string[];
  componentPackIds: readonly string[];
  initialStep?: ExportStep;
  onClose: () => void;
};

export function ProjectExportDialog({
  projectId,
  projectName,
  clientName,
  typeLabel,
  skillIds,
  componentPackIds,
  initialStep = "sections",
  onClose,
}: ProjectExportDialogProps) {
  const research = useResearchArtifact(projectId);
  const strategy = useStrategyArtifact(projectId);
  const moodboard = useMoodboardArtifact(projectId);
  const flows = useFlowsArtifact(projectId);
  const wireframes = useWireframesArtifact(projectId);
  const assetsArtifact = useAssetsArtifact(projectId);
  const uploadedAssets = useConvexQuery(api.r2.listProjectAssets, {
    projectId: projectId as Id<"projects">,
  });
  const prefs = useSkillHubPrefs();
  const availableApps = useInstalledExportApps();
  const [step, setStep] = useState<ExportStep>(initialStep);
  const [selected, setSelected] = useState<Set<ProjectExportSection>>(new Set());
  const [catalogSelection, setCatalogSelection] = useState(() =>
    sanitizeProjectCatalogSelection(skillIds, componentPackIds),
  );
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [pickerHydrated, setPickerHydrated] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "export" | ProjectExportProvider | null
  >(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const artifacts = {
    research: research.data?.artifact,
    strategy: strategy.data?.artifact,
    moodboard: moodboard.data?.artifact,
    flows: flows.data?.artifact,
    wireframes: wireframes.data?.artifact,
    assets: assetsArtifact.data?.artifact,
  };
  const available: Record<ProjectExportSection, boolean> = {
    research: Boolean(artifacts.research),
    strategy: Boolean(artifacts.strategy),
    moodboard: Boolean(artifacts.moodboard),
    styleGuide: Boolean(artifacts.moodboard?.styleGuides.length),
    flows: Boolean(artifacts.flows),
    wireframes: hasExportableWireframes(artifacts.wireframes),
    assets: Boolean(artifacts.assets || uploadedAssets?.length),
  };
  const isLoading =
    research.isLoading ||
    strategy.isLoading ||
    moodboard.isLoading ||
    flows.isLoading ||
    wireframes.isLoading ||
    assetsArtifact.isLoading ||
    uploadedAssets === undefined;

  useEffect(() => {
    if (isLoading || selectionInitialized) return;
    setSelected(
      new Set(PROJECT_EXPORT_SECTIONS.filter((section) => available[section])),
    );
    setSelectionInitialized(true);
  }, [available, isLoading, selectionInitialized]);

  useEffect(() => {
    if (prefs.isLoading || pickerHydrated) return;
    setCatalogSelection(
      initialPickerSelection({
        skillIds,
        componentPackIds,
        installedSkillIds: prefs.installedSkillIds,
        enabledComponentPackIds: prefs.enabledComponentPackIds,
      }),
    );
    setPickerHydrated(true);
  }, [
    componentPackIds,
    pickerHydrated,
    prefs.enabledComponentPackIds,
    prefs.installedSkillIds,
    prefs.isLoading,
    skillIds,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || pendingAction) return;
      if (step === "skills" && initialStep !== "skills") setStep("sections");
      else onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [initialStep, onClose, pendingAction, step]);

  function toggleSection(section: ProjectExportSection) {
    if (!available[section]) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  async function runExport(provider?: ProjectExportProvider) {
    setPendingAction(provider ?? "export");
    setErrorMessage(null);
    setResultMessage(null);
    try {
      const resolved = sanitizeProjectCatalogSelection(
        catalogSelection.skillIds,
        catalogSelection.componentPackIds,
      );
      const bundle = buildProjectExport({
        project: { name: projectName, clientName, typeLabel },
        selected,
        artifacts,
        uploadedAssets: uploadedAssets ?? [],
        skillIds: resolved.skillIds,
        componentPackIds: resolved.componentPackIds,
      });
      const result = await window.stageDesktop.project.export({
        projectName,
        files: bundle.files,
        assets: bundle.assets,
        provider,
      });
      if (result.cancelled) return;

      const assetNote = result.failedAssets.length
        ? ` ${result.failedAssets.length} file${result.failedAssets.length === 1 ? "" : "s"} could not be downloaded.`
        : "";
      if (result.launchError) {
        setResultMessage(
          `Project workspace exported, but the coding tool could not be opened. ${result.launchError}${assetNote}`,
        );
      } else if (result.launchedProvider) {
        const providerName = EXPORT_APP_LABELS[result.launchedProvider];
        const promptNote =
          result.launchedProvider === "claude"
            ? ""
            : " Paste the copied task.";
        setResultMessage(
          `Project workspace opened in ${providerName}.${promptNote}${assetNote}`,
        );
      } else {
        setResultMessage(`Project workspace exported.${assetNote}`);
      }
    } catch (error) {
      setErrorMessage(
        toUserFacingErrorMessage(
          error,
          "Could not export this project. Please try again.",
        ),
      );
    } finally {
      setPendingAction(null);
    }
  }

  const canContinue = !isLoading && selected.size > 0 && !pendingAction;
  const hasAnythingToExport = PROJECT_EXPORT_SECTIONS.some(
    (section) => available[section],
  );
  const exportBusy = Boolean(pendingAction);
  const exportTriggerLabel =
    pendingAction === "export"
      ? "Exporting…"
      : pendingAction
        ? "Opening…"
        : "Export";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-export-title"
      onClick={() => {
        if (!pendingAction) onClose();
      }}
    >
      {resultMessage ? (
        <div
          className="fixed left-1/2 top-6 z-[60] flex w-[calc(100vw-32px)] max-w-[440px] -translate-x-1/2 items-start gap-3 rounded-[9px] border border-[#404040] bg-[#171717] px-3.5 py-3 text-[13px] leading-[1.45] text-white shadow-[0_12px_32px_rgba(10,10,10,0.24)]"
          role="status"
          onClick={(event) => event.stopPropagation()}
        >
          <span
            className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#8D87FF]"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 break-words">{resultMessage}</span>
          <button
            type="button"
            onClick={() => setResultMessage(null)}
            className="text-[16px] leading-none text-[#A3A3A3] hover:text-white"
            aria-label="Dismiss export message"
          >
            ×
          </button>
        </div>
      ) : null}
      <div
        className="flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 p-3">
          <div>
            <h2
              id="project-export-title"
              className="text-[15px] font-medium text-[#0A0A0A]"
            >
              {step === "sections" ? "Export project" : "Skills & components"}
            </h2>
            <p className="mt-1 text-[13px] leading-[1.5] text-[#525252]">
              {step === "sections"
                ? "Choose which project documents to include in the local workspace."
                : "Public references for the coding agent. Added skills and libraries sit on top."}
            </p>
            <div className="mt-3 flex gap-1" aria-hidden="true">
              <span
                className={`h-1 w-5 rounded-full ${step === "sections" ? "bg-[#7B76DF]" : "bg-[#D4D4D4]"}`}
              />
              <span
                className={`h-1 w-5 rounded-full ${step === "skills" ? "bg-[#7B76DF]" : "bg-[#D4D4D4]"}`}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(pendingAction)}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[18px] text-[#737373] hover:bg-white disabled:opacity-50"
            aria-label="Close export dialog"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          {step === "sections" ? (
            <>
              <p className="mb-3 text-[13px] font-medium text-[#171717]">
                Include in export
              </p>
              <div className="flex flex-col gap-2">
                {PROJECT_EXPORT_SECTIONS.map((section) => {
                  const isAvailable = available[section];
                  const copy = SECTION_LABELS[section];
                  return (
                    <label
                      key={section}
                      className={`flex items-center gap-3 rounded-[8px] border px-3 py-2.5 ${
                        isAvailable
                          ? "cursor-pointer border-[#E5E5E5]"
                          : "border-[#F0F0F0] opacity-45"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(section)}
                        disabled={!isAvailable || isLoading}
                        onChange={() => toggleSection(section)}
                        className="h-4 w-4 accent-[#7B76DF]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-[#171717]">
                          {copy.label}
                        </span>
                        <span className="block text-[12px] text-[#737373]">
                          {isLoading
                            ? "Checking…"
                            : isAvailable
                              ? copy.description
                              : "Not created yet"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {!isLoading && !hasAnythingToExport ? (
                <p className="mt-3 text-[12px] leading-[1.45] text-[#737373]">
                  Nothing to export yet. Each section appears here only after it
                  exists. Wireframes count only after they have been generated.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <SkillsComponentsPanel
                skillIds={catalogSelection.skillIds}
                componentPackIds={catalogSelection.componentPackIds}
                onChange={setCatalogSelection}
                disabled={exportBusy}
              />
              {errorMessage ? (
                <p className="mt-3 text-[12px] text-[#b91c1c]">{errorMessage}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-3">
          {step === "sections" ? (
            <>
              <span />
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep("skills")}
                className="inline-flex h-9 items-center rounded-[7px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              {initialStep === "skills" ? (
                <span />
              ) : (
                <button
                  type="button"
                  disabled={exportBusy}
                  onClick={() => {
                    setErrorMessage(null);
                    setStep("sections");
                  }}
                  className="h-9 rounded-[7px] px-3 text-[13px] font-medium text-[#525252] hover:bg-white disabled:opacity-50"
                >
                  Back
                </button>
              )}
              <ExportDestinationMenu
                availableApps={availableApps}
                disabled={!canContinue}
                dropUp
                triggerLabel={exportTriggerLabel}
                triggerClassName="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                onExportOnly={() => void runExport()}
                onOpenIn={(id) => void runExport(id)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
