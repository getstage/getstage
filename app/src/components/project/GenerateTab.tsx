import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, CheckCircle, FigmaLogo, ImageSquare, WarningCircle } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import {
  AiGeneratedMeta,
  artifactText,
  ClaudeMark,
  FieldLabel,
  formatTimestamp,
  LoadingWorkflow,
  ModuleEmptyState,
  ModulePanel,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
  TextArea,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type GenerateTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type WireframeScreen = {
  id: string;
  name: string;
  type: "Page" | "Section" | "Modal";
  priority: "P0" | "P1";
  requirement: "Required" | "Optional";
};

export function GenerateTab({ projectId, projectName }: GenerateTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "generate" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "generate" });
  const createRun = useMutation(api.projectAi.createRun);
  const requestArtifactDestination = useMutation(api.projectAi.requestArtifactDestination);

  const [configOpen, setConfigOpen] = useState(false);
  const [layoutPreference, setLayoutPreference] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(DEFAULT_SCREENS.map((screen) => screen.id)));

  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const latestRun = runList[0] ?? null;
  const latestRunActive = latestRun && latestRun.status !== "completed" && latestRun.status !== "failed";
  const selectedScreens = DEFAULT_SCREENS.filter((screen) => selectedIds.has(screen.id));

  const cards = useMemo(() => {
    if (artifactList.length > 0) {
      return artifactList.map((artifact, index) => ({
        id: artifact.id,
        title: artifact.title || getDefaultOutput(index).title,
        summary: artifact.summary || artifactText(artifact),
        updatedAt: artifact.updatedAt,
        externalUrl: artifact.externalUrl,
        artifactId: artifact.id,
      }));
    }

    return DEFAULT_OUTPUTS.map((item, index) => ({
      id: `default-${index}`,
      title: item.title,
      summary: item.summary,
      updatedAt: Date.now(),
      externalUrl: null,
      artifactId: null,
    }));
  }, [artifactList]);

  async function launchGenerateRun() {
    const result = await createRun({
      projectId,
      module: "generate",
      title: `${projectName} wireframe generation`,
      inputSummary: `Generate ${selectedScreens.length} wireframes. Preference: ${layoutPreference || "none"}`,
    });
    window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=generate&runId=${result.runId}`);
  }

  async function handleDestination(artifactId: string | null, action: string) {
    if (!artifactId) {
      return;
    }
    await requestArtifactDestination({
      artifactId: artifactId as Id<"projectAiArtifacts">,
      provider: "figma",
      action,
    });
    window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&artifactId=${artifactId}&provider=figma&action=${encodeURIComponent(action)}`);
  }

  if (latestRunActive && artifactList.length === 0) {
    return (
      <div className="pb-20">
        <LoadingWorkflow
          title="Creating Wireframes"
          description="Claude is generating screen-level wireframes from flows and moodboard patterns."
          steps={["Reading selected screens", "Applying moodboard patterns", "Preparing Figma outputs"]}
        />
      </div>
    );
  }

  if (artifactList.length === 0 && !configOpen) {
    return (
      <div className="pb-20">
        <ModuleEmptyState
          icon={WarningCircle}
          title="No generated outputs yet."
          description="Launch Claude to create first wireframes or structured deliverables."
          action={<PrimaryButton onClick={() => setConfigOpen(true)}>Create Flows</PrimaryButton>}
        />
      </div>
    );
  }

  if (artifactList.length === 0 && configOpen) {
    return (
      <div className="pb-20">
        <ModulePanel
          title="Generate Wireframes"
          description="Select the screens to generate and add any layout preference before Claude starts."
          bodyClassName="p-5 sm:p-11"
        >
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone="purple">13 screens from Flows</StatusPill>
            <StatusPill tone="neutral">14 patterns applied from Moodboard</StatusPill>
            <SecondaryButton onClick={() => window.location.assign(`/project/${projectId}?tab=moodboard`)}>
              Review moodboard
              <ArrowRight size={14} />
            </SecondaryButton>
          </div>

          <div className="mt-8">
            <h3 className="text-[17px] font-semibold leading-none text-[#171717]">Screens To Generate</h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {DEFAULT_SCREENS.map((screen) => {
                const selected = selectedIds.has(screen.id);
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => {
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(screen.id)) {
                          next.delete(screen.id);
                        } else {
                          next.add(screen.id);
                        }
                        return next;
                      });
                    }}
                    className={cn(
                      "rounded-[10px] border bg-white p-4 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.12)] transition-colors",
                      selected ? "border-[#8D87FF]" : "border-[#E5E5E5] hover:bg-[#FAFAFA]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border", selected ? "border-[#7B76DF] bg-[#7B76DF] text-white" : "border-[#D4D4D4] bg-white text-transparent")}>
                        <CheckCircle size={13} weight="fill" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-semibold leading-none text-[#171717]">{screen.name}</h4>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPill tone="neutral" className="h-7 text-[12px]">{screen.type}</StatusPill>
                          <StatusPill tone="purple" className="h-7 text-[12px]">{screen.priority}</StatusPill>
                          <StatusPill tone={screen.requirement === "Required" ? "warning" : "neutral"} className="h-7 text-[12px]">
                            {screen.requirement}
                          </StatusPill>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 max-w-[760px]">
            <FieldLabel>Layout preference</FieldLabel>
            <TextArea
              value={layoutPreference}
              onChange={setLayoutPreference}
              placeholder="Add layout notes, density preferences, or constraints for Claude."
              className="h-[116px]"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <SecondaryButton onClick={() => window.location.assign(`/project/${projectId}?tab=flows`)}>
              Back to Flows
            </SecondaryButton>
            <PrimaryButton onClick={() => void launchGenerateRun()} disabled={selectedScreens.length === 0}>
              <ClaudeMark />
              Generate {selectedScreens.length} Wireframes
            </PrimaryButton>
          </div>
        </ModulePanel>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <ModulePanel bodyClassName="p-5 sm:p-11">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold leading-none text-[#171717]">Wireframes</h2>
            <p className="mt-2 text-[13px] font-medium text-[#737373]">
              {cards.length} generated outputs available
            </p>
          </div>
          <PrimaryButton onClick={() => setConfigOpen(true)}>
            <ClaudeMark />
            Regenerate Wireframes
          </PrimaryButton>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <WhiteCard key={card.id} className="overflow-hidden">
              <div className="flex aspect-[1.28] items-center justify-center bg-[#E5E5E5]">
                <ImageSquare size={28} className="text-[#737373]" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-medium leading-none text-[#171717]">{card.title}</h3>
                    <div className="mt-2">
                      <AiGeneratedMeta />
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] font-medium text-[#737373]">
                    {formatTimestamp(card.updatedAt)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
                  {card.summary || getDefaultOutput(index).summary}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <StatusPill tone="purple" className="h-7 text-[12px]">{index < 4 ? "P0" : "P1"}</StatusPill>
                  <PrimaryButton
                    className="h-8"
                    onClick={() => {
                      if (card.externalUrl) {
                        window.open(card.externalUrl, "_blank", "noopener,noreferrer");
                        return;
                      }
                      void handleDestination(card.artifactId, "open_in_figma");
                    }}
                  >
                    <FigmaLogo size={14} />
                    Open in Figma
                  </PrimaryButton>
                </div>
              </div>
            </WhiteCard>
          ))}
        </div>
      </ModulePanel>
    </div>
  );
}

const DEFAULT_SCREENS: WireframeScreen[] = [
  { id: "overview", name: "Project Overview", type: "Page", priority: "P0", requirement: "Required" },
  { id: "research-inputs", name: "Research Inputs", type: "Page", priority: "P0", requirement: "Required" },
  { id: "research-output", name: "Research Output", type: "Page", priority: "P0", requirement: "Required" },
  { id: "strategy-review", name: "Strategy Review", type: "Page", priority: "P0", requirement: "Required" },
  { id: "moodboard-empty", name: "Moodboard Empty", type: "Page", priority: "P1", requirement: "Optional" },
  { id: "moodboard-patterns", name: "Moodboard Patterns", type: "Page", priority: "P0", requirement: "Required" },
  { id: "flows-list", name: "Flows List", type: "Page", priority: "P0", requirement: "Required" },
  { id: "screens-grid", name: "Screens Grid", type: "Page", priority: "P0", requirement: "Required" },
  { id: "manual-flow", name: "Manual Flow Modal", type: "Modal", priority: "P1", requirement: "Optional" },
  { id: "generate-config", name: "Generate Config", type: "Page", priority: "P0", requirement: "Required" },
  { id: "wireframe-grid", name: "Wireframe Grid", type: "Page", priority: "P0", requirement: "Required" },
  { id: "assets-grid", name: "Assets Grid", type: "Page", priority: "P1", requirement: "Optional" },
  { id: "share-modal", name: "Share Modal", type: "Modal", priority: "P1", requirement: "Optional" },
];

const DEFAULT_OUTPUTS = [
  { title: "Homepage Wireframe", summary: "Primary page layout generated from the approved flow set." },
  { title: "Research Screen Wireframe", summary: "Research configuration and output states translated into wireframe structure." },
  { title: "Moodboard Wireframe", summary: "Reference collection and pattern review states prepared for Figma." },
  { title: "Flows Wireframe", summary: "Flow list and screens views generated as editable Figma frames." },
  { title: "Generate Wireframe", summary: "Wireframe generation setup and output grid prepared for review." },
  { title: "Assets Wireframe", summary: "Asset upload and generated file library structure." },
] as const;

function getDefaultOutput(index: number) {
  return DEFAULT_OUTPUTS[index % DEFAULT_OUTPUTS.length] ?? DEFAULT_OUTPUTS[0]!;
}
