import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Images, LinkSimple, Plus, Sparkle, Trash, UploadSimple } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import {
  artifactText,
  ClaudeMark,
  FieldLabel,
  formatTimestamp,
  LoadingWorkflow,
  ModuleEmptyState,
  ModulePanel,
  PrimaryButton,
  SecondaryButton,
  splitMarkdownSections,
  StatusPill,
  TextInput,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type MoodboardTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type ReferenceMode = "figma" | "upload";

export function MoodboardTab({ projectId, projectName }: MoodboardTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "moodboard" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "moodboard" });
  const createRun = useMutation(api.projectAi.createRun);

  const [isLaunching, setIsLaunching] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("figma");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([
    "https://figma.com/file/reference-homepage",
    "https://dribbble.com/shots/reference-flow",
    "https://example.com/brand-system",
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(["Homepage inspiration.png", "Navigation ideas.jpg"]);

  const artifactList: ProjectAiArtifact[] = artifacts ?? [];
  const runList: ProjectAiRun[] = runs ?? [];
  const latestRun = runList[0] ?? null;
  const latestArtifact = artifactList[0] ?? null;
  const latestRunActive = latestRun && latestRun.status !== "completed" && latestRun.status !== "failed";

  const patternSections = useMemo(() => {
    const parsed = splitMarkdownSections(artifactText(latestArtifact), "Visual Direction");
    return parsed.length > 0 ? parsed.slice(0, 6) : DEFAULT_PATTERNS;
  }, [latestArtifact]);

  async function launchMoodboardRun() {
    setIsLaunching(true);
    try {
      const result = await createRun({
        projectId,
        module: "moodboard",
        title: `${projectName} moodboard run`,
        inputSummary: `References: ${referenceUrls.length + uploadedFiles.length}`,
      });
      window.location.assign(`/agents/claude?source=settings&projectId=${projectId}&module=moodboard&runId=${result.runId}`);
    } finally {
      setIsLaunching(false);
    }
  }

  function addReferenceUrl() {
    const value = referenceUrl.trim();
    if (!value) {
      return;
    }
    setReferenceUrls((current) => [...current, value]);
    setReferenceUrl("");
  }

  if (!latestArtifact) {
    if (latestRunActive) {
      return (
        <div className="pb-20">
          <LoadingWorkflow
            title="Analyzing your Moodboard"
            description="Claude is reading references and extracting repeatable visual patterns."
            steps={["Collecting references", "Finding recurring patterns", "Preparing design direction"]}
          />
        </div>
      );
    }

    if (!collecting) {
      return (
        <div className="pb-20">
          <ModuleEmptyState
            icon={Images}
            title="No Moodboard Generated"
            description="Start creating your moodboard in a few simple steps. It takes just 2 mins."
            action={<PrimaryButton onClick={() => setCollecting(true)}>Create Moodboard</PrimaryButton>}
          />
        </div>
      );
    }

    return (
      <div className="pb-20">
        <ModulePanel
          title="Collect References"
          description="Add Figma links or upload local references before Claude extracts the patterns."
          bodyClassName="p-5 sm:p-11"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReferenceMode("figma")}
              className={`inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] ${referenceMode === "figma" ? "bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-white" : "bg-[#F5F5F5] text-[#737373]"}`}
            >
              <LinkSimple size={15} />
              Figma Link
            </button>
            <button
              type="button"
              onClick={() => setReferenceMode("upload")}
              className={`inline-flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] ${referenceMode === "upload" ? "bg-gradient-to-b from-[#7B76DF] to-[#463FBA] text-white" : "bg-[#F5F5F5] text-[#737373]"}`}
            >
              <UploadSimple size={15} />
              Upload from Device
            </button>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,390px)_1fr]">
            <div>
              {referenceMode === "figma" ? (
                <>
                  <FieldLabel>Figma or Website Link</FieldLabel>
                  <div className="flex items-center gap-2">
                    <TextInput value={referenceUrl} onChange={setReferenceUrl} placeholder="Paste reference link" />
                    <PrimaryButton onClick={addReferenceUrl} className="h-9">
                      <Plus size={14} />
                      Add
                    </PrimaryButton>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setUploadedFiles((current) => [...current, `Reference ${current.length + 1}.png`])}
                  className="flex min-h-[220px] w-full items-center justify-center rounded-[10px] bg-[#F5F5F5] p-6 text-center shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                >
                  <div className="max-w-[190px]">
                    <UploadSimple size={24} weight="fill" className="mx-auto text-[#525252]" />
                    <p className="mt-3 text-[15px] font-medium text-[#171717]">Upload files or drag and drop</p>
                    <p className="mt-1 text-[12px] font-medium text-[#737373]">Images, PDFs, screenshots etc.</p>
                  </div>
                </button>
              )}

              <div className="mt-8 flex items-center gap-3">
                <SecondaryButton onClick={() => setCollecting(false)}>Cancel</SecondaryButton>
                <PrimaryButton onClick={() => void launchMoodboardRun()} disabled={isLaunching}>
                  <ClaudeMark />
                  {isLaunching ? "Creating..." : "Create Moodboard"}
                </PrimaryButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[15px] font-medium leading-none text-[#171717]">
                Existing references
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {referenceUrls.map((url) => (
                  <ReferenceCard key={url} label={url} onRemove={() => setReferenceUrls((current) => current.filter((item) => item !== url))} />
                ))}
                {uploadedFiles.map((file) => (
                  <ReferenceCard key={file} label={file} onRemove={() => setUploadedFiles((current) => current.filter((item) => item !== file))} />
                ))}
              </div>
            </div>
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
            <h2 className="text-[22px] font-semibold leading-none text-[#171717]">Patterns from references</h2>
            <p className="mt-2 text-[13px] font-medium text-[#737373]">
              Updated {formatTimestamp(latestArtifact.updatedAt)}
            </p>
          </div>
          <StatusPill tone="success">10 references collected</StatusPill>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex aspect-[4/3] items-center justify-center rounded-[8px] bg-[#E5E5E5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <Images size={24} className="text-[#737373]" />
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {patternSections.map((section, index) => (
            <WhiteCard key={`${section.title}-${index}`} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[17px] font-semibold leading-none text-[#171717]">{section.title}</h3>
                <StatusPill tone="purple" className="h-7 text-[12px]">
                  {index < 2 ? "8x Strong" : "4x Medium"}
                </StatusPill>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-[14px] font-medium leading-[1.7] text-[#737373]">
                {section.body || "Consistent visual pattern detected across the collected references."}
              </p>
            </WhiteCard>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <PrimaryButton onClick={() => window.location.assign(`/project/${projectId}?tab=flows`)}>
            Continue to Flows
            <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </ModulePanel>
    </div>
  );
}

function ReferenceCard({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <WhiteCard className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#F5F5F5]">
          <Sparkle size={16} weight="fill" className="text-[#525252]" />
        </div>
        <p className="truncate text-[13px] font-medium text-[#525252]">{label}</p>
      </div>
      <button type="button" onClick={onRemove} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-destructive transition-colors hover:bg-[#FDECEC]" aria-label="Remove reference">
        <Trash size={14} weight="fill" />
      </button>
    </WhiteCard>
  );
}

const DEFAULT_PATTERNS = [
  {
    title: "Navigation Structure",
    body: "References favor short primary navigation, compact tab systems, and clear active states.",
  },
  {
    title: "Content Density",
    body: "Layouts use calm spacing with compact cards so project work remains scannable.",
  },
  {
    title: "Visual Rhythm",
    body: "Muted gray surfaces create structure while purple highlights mark the current action.",
  },
  {
    title: "Asset Treatment",
    body: "Screenshots and references are framed in simple image tiles with minimal decoration.",
  },
] as const;
