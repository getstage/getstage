import { useEffect, useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ProjectExportProvider } from "@shared/models/desktop";
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
  type ProjectExportSection,
} from "@/lib/project/projectExport";

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

type ProjectExportDialogProps = {
  projectId: string;
  projectName: string;
  clientName: string;
  typeLabel: string;
  onClose: () => void;
};

export function ProjectExportDialog({
  projectId,
  projectName,
  clientName,
  typeLabel,
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
  const [selected, setSelected] = useState<Set<ProjectExportSection>>(
    new Set(),
  );
  const [selectionInitialized, setSelectionInitialized] = useState(false);
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
    wireframes: Boolean(artifacts.wireframes),
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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingAction) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pendingAction]);

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
      const bundle = buildProjectExport({
        project: { name: projectName, clientName, typeLabel },
        selected,
        artifacts,
        uploadedAssets: uploadedAssets ?? [],
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
          `Project workspace exported, but the coding agent could not be opened. ${result.launchError}${assetNote}`,
        );
      } else if (result.launchedProvider) {
        const providerName =
          result.launchedProvider === "claude" ? "Claude Code" : "Codex";
        const promptNote =
          result.launchedProvider === "codex"
            ? " Paste the copied task."
            : "";
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

  const canExport = !isLoading && selected.size > 0 && !pendingAction;

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
        className="w-full max-w-[560px] rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-3">
          <div>
            <h2
              id="project-export-title"
              className="text-[15px] font-medium text-[#0A0A0A]"
            >
              Export project
            </h2>
            <p className="mt-1 text-[13px] leading-[1.5] text-[#525252]">
              Creates a standalone local workspace with your selected project
              documents and assets.
            </p>
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

        <div className="rounded-[8px] bg-white p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
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

          {errorMessage ? (
            <p className="mt-3 text-[12px] text-[#b91c1c]">{errorMessage}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={!canExport}
              onClick={() => void runExport()}
              className="h-9 rounded-[7px] border border-[#D4D4D4] bg-white px-3 text-[13px] font-medium text-[#404040] hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "export" ? "Exporting…" : "Export only"}
            </button>
            <button
              type="button"
              disabled={!canExport}
              onClick={() => void runExport("claude")}
              className="inline-flex h-9 items-center gap-2 rounded-[7px] bg-[#262626] px-3 text-[13px] font-medium text-white hover:bg-[#171717] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <img
                src="/logos/integrations/claude.svg"
                alt=""
                className="h-4 w-4"
              />
              {pendingAction === "claude" ? "Opening…" : "Open in Claude Code"}
            </button>
            <button
              type="button"
              disabled={!canExport}
              onClick={() => void runExport("codex")}
              className="inline-flex h-9 items-center gap-2 rounded-[7px] bg-gradient-to-b from-[#8D87FF] to-[#6D67D8] px-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-white">
                <img
                  src="/logos/integrations/codex.svg"
                  alt=""
                  className="h-4 w-4"
                />
              </span>
              {pendingAction === "codex" ? "Opening…" : "Open in Codex"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
