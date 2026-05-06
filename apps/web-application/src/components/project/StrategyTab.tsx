import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowClockwise, ArrowRight, FloppyDisk, Plus, Sparkle } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import {
  artifactText,
  ClaudeMark,
  formatTimestamp,
  LoadingWorkflow,
  ModuleEmptyState,
  ModulePanel,
  PrimaryButton,
  SecondaryButton,
  splitMarkdownSections,
  StatusPill,
  TextArea,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type StrategyTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type StrategySectionStatus = "approved" | "draft" | "needs_revision" | "failed";

export function StrategyTab({ projectId, projectName }: StrategyTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "strategy" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "strategy" });
  const createRun = useMutation(api.projectAi.createRun);
  const cancelRunMutation = useMutation(api.projectAi.cancelRun);
  const setArtifactStatus = useMutation(api.projectAi.setArtifactStatus);
  const requestArtifactDestination = useMutation(api.projectAi.requestArtifactDestination);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSection, setDraftSection] = useState("");

  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const latestRun = runList[0] ?? null;
  const latestRunActive = latestRun && latestRun.status !== "completed" && latestRun.status !== "failed";

  const sections = useMemo(() => {
    if (artifactList.length === 1) {
      const artifact = artifactList[0];
      if (!artifact) {
        return [];
      }
      return splitMarkdownSections(artifactText(artifact), artifact.title).map((section, index) => ({
        id: `${artifact.id}-${index}`,
        artifactId: artifact.id,
        title: section.title,
        body: section.body,
        updatedAt: artifact.updatedAt,
        uiStatus: toSectionStatus(index < 2 ? "approved" : artifact.status),
      }));
    }

    return artifactList.map((artifact, index) => ({
      id: artifact.id,
      artifactId: artifact.id,
      title: artifact.title || STRATEGY_SECTION_TITLES[index % STRATEGY_SECTION_TITLES.length],
      body: artifactText(artifact),
      updatedAt: artifact.updatedAt,
      uiStatus: toSectionStatus(artifact.status),
    }));
  }, [artifactList]);

  const approvedCount = sections.filter((section) => section.uiStatus === "approved").length;
  const totalCount = sections.length;
  const progressPercent = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

  async function launchStrategyRun() {
    await createRun({
      projectId,
      module: "strategy",
      title: `${projectName} strategy run`,
      inputSummary: `Existing strategy sections: ${sections.length}`,
    });
  }

  async function sendToNotion() {
    const firstArtifact = artifactList[0];
    if (!firstArtifact) {
      return;
    }

    await requestArtifactDestination({
      artifactId: firstArtifact.id as Id<"projectAiArtifacts">,
      provider: "notion",
      action: "export_to_notion",
    });
  }

  if (sections.length === 0) {
    if (latestRunActive) {
      return (
        <div className="pb-20">
          <LoadingWorkflow
            icon="/logos/projects/Property 1=Strategy.svg"
            title="Generating Strategy"
            description="Claude is turning research into an actionable project strategy."
            steps={["Analyzing research output", "Mapping project sections", "Preparing approval checklist"]}
            onCancel={() => {
              if (latestRun) void cancelRunMutation({ runId: latestRun.id, projectId });
            }}
          />
        </div>
      );
    }

    return (
      <div className="pb-20">
        <ModuleEmptyState
          icon={Sparkle}
          title="No strategy generated yet."
          description="Generate a strategy once the research foundation is ready."
          action={
            <PrimaryButton onClick={() => void launchStrategyRun()}>
              <ClaudeMark />
              Generate Strategy
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <ModulePanel bodyClassName="p-5 sm:p-11">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold leading-none text-[#171717]">Strategy</h2>
            <p className="mt-2 text-[13px] font-medium text-[#737373]">
              Updated {formatTimestamp(sections[0]?.updatedAt)}
            </p>
          </div>
          <PrimaryButton onClick={() => void launchStrategyRun()}>
            <ClaudeMark />
            Regenerate with AI
          </PrimaryButton>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-[#525252]">
            {approvedCount} of {totalCount} sections approved
          </span>
          <div className="h-2 min-w-[220px] flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
            <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${progressPercent}%` }} />
          </div>
          <StatusPill tone={approvedCount === totalCount ? "success" : "warning"}>
            Total {totalCount} sections
          </StatusPill>
        </div>

        <div className="mt-8 space-y-4">
          {sections.map((section) => {
            const isEditing = editingId === section.id;
            const needsAction = section.uiStatus !== "approved";

            return (
              <WhiteCard
                key={section.id}
                className={needsAction ? "border-transparent bg-[#F5F5F5] p-5" : "p-5"}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                      <StatusPill tone={needsAction ? "warning" : "success"} className="h-7 text-[12px]">
                        {needsAction ? "Action Required" : "Approved"}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-[12px] font-medium text-[#737373]">
                      Updated {formatTimestamp(section.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SecondaryButton
                      onClick={() => {
                        setEditingId(section.id);
                        setDraftSection(section.body);
                      }}
                    >
                      Edit
                    </SecondaryButton>
                    {needsAction ? (
                      <PrimaryButton onClick={() => void setArtifactStatus({ artifactId: section.artifactId as Id<"projectAiArtifacts">, status: "approved" })}>
                        <FloppyDisk size={14} />
                        Approve & Save
                      </PrimaryButton>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4">
                    <TextArea value={draftSection} onChange={setDraftSection} className="min-h-[160px] text-[13px]" />
                    <div className="mt-3 flex justify-end gap-2">
                      <SecondaryButton onClick={() => setEditingId(null)}>Discard Changes</SecondaryButton>
                      <PrimaryButton onClick={() => setEditingId(null)}>Save Changes</PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 whitespace-pre-wrap text-[14px] font-medium leading-[1.7] text-[#737373]">
                    {section.body || "No content available yet."}
                  </div>
                )}

                {needsAction ? (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <SecondaryButton onClick={() => void launchStrategyRun()}>
                      <ArrowClockwise size={14} />
                      Regenerate with AI
                    </SecondaryButton>
                  </div>
                ) : null}
              </WhiteCard>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton>
            <Plus size={14} />
            Add Section
          </SecondaryButton>
          <div className="flex flex-wrap items-center gap-3">
            <SecondaryButton onClick={() => void sendToNotion()}>Add to Notion</SecondaryButton>
            <PrimaryButton onClick={() => window.location.assign(`/project/${projectId}?tab=moodboard`)}>
              Continue to Moodboard
              <ArrowRight size={14} />
            </PrimaryButton>
          </div>
        </div>
      </ModulePanel>
    </div>
  );
}

function toSectionStatus(status: string): StrategySectionStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "failed":
      return "failed";
    case "draft":
      return "draft";
    default:
      return "needs_revision";
  }
}

const STRATEGY_SECTION_TITLES = [
  "Goal & KPIs",
  "User Journey",
  "Conversion Approach",
  "Technical Requirements",
  "Content Strategy",
  "Success Criteria",
] as const;
