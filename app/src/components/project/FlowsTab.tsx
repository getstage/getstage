import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  CaretDown,
  FigmaLogo,
  FloppyDisk,
  GitBranch,
  Monitor,
  Plus,
  X,
} from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import {
  artifactText,
  ClaudeMark,
  FieldLabel,
  LoadingWorkflow,
  ModuleEmptyState,
  ModulePanel,
  PrimaryButton,
  SecondaryButton,
  splitMarkdownSections,
  StatusPill,
  TextArea,
  TextInput,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type FlowsTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type FlowView = "flows" | "screens";

type FlowItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  steps: string[];
  screens: string[];
};

type ScreenItem = {
  id: string;
  name: string;
  type: string;
  priority: "P0" | "P1";
  requirement: "Required" | "Optional";
  description: string;
};

export function FlowsTab({ projectId, projectName }: FlowsTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "flows" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "flows" });
  const createRun = useMutation(api.projectAi.createRun);
  const requestArtifactDestination = useMutation(api.projectAi.requestArtifactDestination);

  const [isLaunching, setIsLaunching] = useState(false);
  const [view, setView] = useState<FlowView>("flows");
  const [customFlows, setCustomFlows] = useState<FlowItem[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<"details" | "steps" | null>(null);
  const [newFlowTitle, setNewFlowTitle] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [newFlowType, setNewFlowType] = useState("Core flow");
  const [newFlowSteps, setNewFlowSteps] = useState<string[]>([""]);
  const [editingScreenId, setEditingScreenId] = useState<string | null>(null);
  const [draftScreenText, setDraftScreenText] = useState("");

  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const latestArtifact = artifactList[0] ?? null;
  const latestRun = runList[0] ?? null;
  const latestRunActive = latestRun && latestRun.status !== "completed" && latestRun.status !== "failed";

  const generatedFlows = useMemo(() => buildFlowsFromArtifact(latestArtifact), [latestArtifact]);
  const flows = [...generatedFlows, ...customFlows];
  const selectedFlow = flows.find((flow) => flow.id === (selectedFlowId ?? flows[0]?.id)) ?? flows[0] ?? null;
  const screens = useMemo(() => buildScreensFromFlows(flows), [flows]);
  const approvedCount = Math.min(2, flows.length);

  async function launchFlowsRun() {
    setIsLaunching(true);
    try {
      const result = await createRun({
        projectId,
        module: "flows",
        title: `${projectName} flows run`,
        inputSummary: `Existing flows: ${flows.length}`,
      });
      window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=flows&runId=${result.runId}`);
    } finally {
      setIsLaunching(false);
    }
  }

  async function sendToFigJam() {
    const firstArtifact = artifactList[0];
    if (!firstArtifact) {
      return;
    }
    await requestArtifactDestination({
      artifactId: firstArtifact.id as Id<"projectAiArtifacts">,
      provider: "figma",
      action: "send_to_figjam",
    });
    window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&artifactId=${firstArtifact.id}&provider=figma&action=send_to_figjam`);
  }

  function saveManualFlow() {
    const title = newFlowTitle.trim();
    if (!title) {
      return;
    }

    const steps = newFlowSteps.map((step) => step.trim()).filter(Boolean);
    setCustomFlows((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        title,
        description: newFlowDescription.trim() || "Manual flow added by the project team.",
        type: newFlowType.trim() || "Core flow",
        steps: steps.length > 0 ? steps : ["Define entry point", "Complete main action", "Confirm outcome"],
        screens: steps.length > 0 ? steps.map((step) => `${step} screen`) : ["Entry screen", "Action screen", "Confirmation screen"],
      },
    ]);
    setNewFlowTitle("");
    setNewFlowDescription("");
    setNewFlowType("Core flow");
    setNewFlowSteps([""]);
    setModalStep(null);
  }

  if (!latestArtifact) {
    if (latestRunActive) {
      return (
        <div className="pb-20">
          <LoadingWorkflow
            title="Generating Flows"
            description="Claude is identifying user journeys, steps, and required screens."
            steps={["Reading strategy", "Mapping key flows", "Identifying unique screens"]}
          />
        </div>
      );
    }

    return (
      <div className="pb-20">
        <ModuleEmptyState
          icon={GitBranch}
          title="No flows generated yet."
          description="Create flows from the approved strategy and moodboard patterns."
          action={
            <PrimaryButton onClick={() => void launchFlowsRun()} disabled={isLaunching}>
              <ClaudeMark />
              {isLaunching ? "Creating..." : "Create Flows"}
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
            <h2 className="text-[22px] font-semibold leading-none text-[#171717]">Flows</h2>
            <p className="mt-2 text-[13px] font-medium text-[#737373]">
              {approvedCount} of {flows.length} flows approved - {screens.length} unique screens identified
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton onClick={() => setModalStep("details")}>
              <Plus size={14} />
              Add a flow manually
            </SecondaryButton>
            <PrimaryButton onClick={() => void sendToFigJam()}>
              <FigmaLogo size={15} />
              Send to FigJam
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-[8px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
            <ViewTab active={view === "flows"} onClick={() => setView("flows")}>
              Flows ({flows.length})
            </ViewTab>
            <ViewTab active={view === "screens"} onClick={() => setView("screens")}>
              Screens ({screens.length})
            </ViewTab>
          </div>
          {view === "screens" ? (
            <SecondaryButton>
              All ({screens.length})
              <CaretDown size={14} />
            </SecondaryButton>
          ) : null}
        </div>

        {view === "flows" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3">
              {flows.map((flow, index) => (
                <button
                  type="button"
                  key={flow.id}
                  onClick={() => setSelectedFlowId(flow.id)}
                  className={cn(
                    "w-full rounded-[10px] border bg-white p-4 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.12)] transition-colors hover:bg-[#FAFAFA]",
                    selectedFlow?.id === flow.id ? "border-[#8D87FF]" : "border-[#E5E5E5]",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#F5F5F5] text-[13px] font-semibold text-[#525252]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold leading-none text-[#171717]">{flow.title}</h3>
                        <StatusPill tone="purple" className="h-7 text-[12px]">{flow.type}</StatusPill>
                        {index < approvedCount ? <StatusPill tone="success" className="h-7 text-[12px]">Approved</StatusPill> : null}
                      </div>
                      <p className="mt-2 text-[13px] font-medium leading-[1.5] text-[#737373]">{flow.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-medium text-[#737373]">
                        <span>{flow.steps.length} steps</span>
                        <span>{flow.screens.length} screens</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <WhiteCard className="p-5">
              <h3 className="text-[17px] font-semibold leading-none text-[#171717]">{selectedFlow?.title ?? "Flow steps"}</h3>
              <p className="mt-2 text-[13px] font-medium leading-[1.5] text-[#737373]">{selectedFlow?.description}</p>
              <div className="mt-5 space-y-3">
                {(selectedFlow?.steps ?? []).map((step, index) => (
                  <div key={`${step}-${index}`} className="flex items-start gap-3 rounded-[8px] bg-[#F5F5F5] p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.18)]">
                      {index + 1}
                    </span>
                    <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">{step}</p>
                  </div>
                ))}
              </div>
            </WhiteCard>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {screens.map((screen) => {
              const isEditing = editingScreenId === screen.id;
              return (
                <WhiteCard key={screen.id} className={cn("p-5", isEditing && "bg-[#F5F5F5]")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Monitor size={16} className="text-[#525252]" />
                        <h3 className="text-[15px] font-semibold leading-none text-[#171717]">{screen.name}</h3>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill tone="neutral" className="h-7 text-[12px]">{screen.type}</StatusPill>
                        <StatusPill tone="purple" className="h-7 text-[12px]">{screen.priority}</StatusPill>
                        <StatusPill tone={screen.requirement === "Required" ? "warning" : "neutral"} className="h-7 text-[12px]">
                          {screen.requirement}
                        </StatusPill>
                      </div>
                    </div>
                    <SecondaryButton
                      onClick={() => {
                        setEditingScreenId(screen.id);
                        setDraftScreenText(screen.description);
                      }}
                    >
                      Edit
                    </SecondaryButton>
                  </div>
                  {isEditing ? (
                    <div className="mt-4">
                      <TextArea value={draftScreenText} onChange={setDraftScreenText} className="min-h-[130px]" />
                      <div className="mt-3 flex justify-end gap-2">
                        <SecondaryButton onClick={() => setEditingScreenId(null)}>Discard</SecondaryButton>
                        <PrimaryButton onClick={() => setEditingScreenId(null)}>
                          <FloppyDisk size={14} />
                          Save
                        </PrimaryButton>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-[13px] font-medium leading-[1.6] text-[#737373]">{screen.description}</p>
                  )}
                </WhiteCard>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <PrimaryButton onClick={() => window.location.assign(`/project/${projectId}?tab=generate`)}>
            Continue to Wireframes
            <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </ModulePanel>

      {modalStep ? (
        <ManualFlowModal
          step={modalStep}
          title={newFlowTitle}
          description={newFlowDescription}
          typeValue={newFlowType}
          steps={newFlowSteps}
          onTitleChange={setNewFlowTitle}
          onDescriptionChange={setNewFlowDescription}
          onTypeChange={setNewFlowType}
          onStepsChange={setNewFlowSteps}
          onCancel={() => setModalStep(null)}
          onNext={() => setModalStep("steps")}
          onSave={saveManualFlow}
        />
      ) : null}
    </div>
  );
}

function ViewTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-[6px] px-3 text-[13px] font-medium transition-colors ${active ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white" : "text-[#737373] hover:bg-white"}`}
    >
      {children}
    </button>
  );
}

function ManualFlowModal({
  step,
  title,
  description,
  typeValue,
  steps,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onStepsChange,
  onCancel,
  onNext,
  onSave,
}: {
  step: "details" | "steps";
  title: string;
  description: string;
  typeValue: string;
  steps: string[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStepsChange: (value: string[]) => void;
  onCancel: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4 backdrop-blur-[2px]">
      <WhiteCard className="w-full max-w-[520px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold leading-none text-[#171717]">
              {step === "details" ? "Add Flow Manually" : "Add Steps"}
            </h2>
            <p className="mt-2 text-[13px] font-medium text-[#737373]">
              {step === "details" ? "Define the flow before adding its step sequence." : "List the steps a user takes in this flow."}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#525252] hover:bg-[#F5F5F5]" aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {step === "details" ? (
          <div className="mt-6 space-y-4">
            <div>
              <FieldLabel>Flow Title</FieldLabel>
              <TextInput value={title} onChange={onTitleChange} placeholder="Client submits onboarding form" />
            </div>
            <div>
              <FieldLabel>Flow Description</FieldLabel>
              <TextArea value={description} onChange={onDescriptionChange} placeholder="What happens in this flow?" />
            </div>
            <div>
              <FieldLabel>Flow Type</FieldLabel>
              <TextInput value={typeValue} onChange={onTypeChange} placeholder="Core flow" />
            </div>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
              <PrimaryButton onClick={onNext}>Add Steps</PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {steps.map((value, index) => (
              <div key={`step-${index}`}>
                <FieldLabel>Step {index + 1}</FieldLabel>
                <TextInput
                  value={value}
                  onChange={(nextValue) => {
                    const next = [...steps];
                    next[index] = nextValue;
                    onStepsChange(next);
                  }}
                  placeholder="Describe this step"
                />
              </div>
            ))}
            <SecondaryButton onClick={() => onStepsChange([...steps, ""])}>
              <Plus size={14} />
              Add Step
            </SecondaryButton>
            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
              <PrimaryButton onClick={onSave}>Save & Continue</PrimaryButton>
            </div>
          </div>
        )}
      </WhiteCard>
    </div>
  );
}

function buildFlowsFromArtifact(artifact: ProjectAiArtifact | null): FlowItem[] {
  if (!artifact) {
    return [];
  }

  const sections = splitMarkdownSections(artifactText(artifact), artifact.title);
  if (sections.length > 1) {
    return sections.slice(0, 6).map((section, index) => ({
      id: `${artifact.id}-${index}`,
      title: section.title,
      description: section.body || getDefaultFlow(index).description,
      type: getDefaultFlow(index).type,
      steps: getDefaultFlow(index).steps,
      screens: getDefaultFlow(index).screens,
    }));
  }

  return DEFAULT_FLOWS.map((flow, index) => ({
    ...flow,
    id: `${artifact.id}-${index}`,
  }));
}

function getDefaultFlow(index: number) {
  return DEFAULT_FLOWS[index % DEFAULT_FLOWS.length] ?? DEFAULT_FLOWS[0]!;
}

function buildScreensFromFlows(flows: FlowItem[]): ScreenItem[] {
  const seen = new Set<string>();
  const screens: ScreenItem[] = [];

  for (const flow of flows) {
    for (const screen of flow.screens) {
      const id = screen.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      screens.push({
        id,
        name: screen,
        type: screen.includes("Modal") ? "Modal" : "Page",
        priority: screens.length < 6 ? "P0" : "P1",
        requirement: screens.length < 8 ? "Required" : "Optional",
        description: `Screen required by ${flow.title}. It should support the main user action and keep the flow compact.`,
      });
    }
  }

  return screens;
}

const DEFAULT_FLOWS: FlowItem[] = [
  {
    id: "flow-1",
    title: "Project kickoff",
    description: "Client and team align on goals, context, and initial assets.",
    type: "Core flow",
    steps: ["Open project", "Review client context", "Upload brief", "Confirm kickoff tasks"],
    screens: ["Project Overview", "Research Inputs", "Brief Upload", "Kickoff Confirmation"],
  },
  {
    id: "flow-2",
    title: "Research approval",
    description: "Team reviews AI research, edits the findings, and sends the output onward.",
    type: "Review flow",
    steps: ["Open latest research", "Edit findings", "Approve content", "Send to Notion"],
    screens: ["Research Overview", "Research Edit", "Approval State", "Export Modal"],
  },
  {
    id: "flow-3",
    title: "Moodboard collection",
    description: "References are collected and turned into patterns for later generation.",
    type: "Creative flow",
    steps: ["Create moodboard", "Add references", "Analyze references", "Approve patterns"],
    screens: ["Moodboard Empty", "Collect References", "Analyzing Moodboard", "Pattern Review"],
  },
  {
    id: "flow-4",
    title: "Wireframe generation",
    description: "Selected screens and pattern guidance are used to generate wireframes.",
    type: "Generation flow",
    steps: ["Select screens", "Add layout preference", "Launch generation", "Open output"],
    screens: ["Generate Empty", "Wireframe Config", "Creating Wireframes", "Wireframe Grid"],
  },
] as const satisfies FlowItem[];
