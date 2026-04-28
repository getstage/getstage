import { useMemo, useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Images } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import { PROJECT_LOGO } from "@/components/project/assets/logoPaths";
import { PROJECT_ASSET_ACCEPT, uploadFileToR2, validateUploadFile } from "@/lib/r2Uploads";
import {
  artifactText,
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
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type MoodboardTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type ReferenceMode = "figma" | "upload";

type UploadedReference = {
  id: string;
  name: string;
  size: number;
  key: string | null;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
};

export function MoodboardTab({ projectId, projectName }: MoodboardTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "moodboard" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "moodboard" });
  const createRun = useMutation(api.projectAi.createRun);
  const cancelRunMutation = useMutation(api.projectAi.cancelRun);
  const r2GenerateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useMutation(api.r2.syncMetadata);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("figma");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [uploadDropActive, setUploadDropActive] = useState(false);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([
    "https://figma.com/file/reference-homepage",
    "https://dribbble.com/shots/reference-flow",
    "https://example.com/brand-system",
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedReference[]>([
    { id: "seed-1", name: "Homepage inspiration.png", size: 1_200_000, key: null, status: "uploaded" },
    { id: "seed-2", name: "Navigation ideas.jpg", size: 1_500_000, key: null, status: "uploaded" },
  ]);

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
      await createRun({
        projectId,
        module: "moodboard",
        title: `${projectName} moodboard run`,
        inputSummary: `References: ${referenceUrls.length + uploadedFiles.length}`,
      });
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

  async function uploadReferenceFile(file: File | null) {
    if (!file) return;
    const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const validationError = validateUploadFile("project-asset", file);
    const draft: UploadedReference = {
      id,
      name: file.name,
      size: file.size,
      key: null,
      status: validationError ? "failed" : "uploading",
      error: validationError ?? undefined,
    };
    setUploadedFiles((current) => [draft, ...current]);
    if (validationError) return;

    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "project-asset",
        file,
      });
      setUploadedFiles((current) =>
        current.map((item) => (item.id === id ? { ...item, key, status: "uploaded" } : item)),
      );
    } catch (error) {
      setUploadedFiles((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: "failed", error: error instanceof Error ? error.message : "Upload failed." }
            : item,
        ),
      );
    }
  }

  function handleUploadDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setUploadDropActive(false);
    const file = event.dataTransfer.files?.[0];
    void uploadReferenceFile(file ?? null);
  }

  if (!latestArtifact) {
    if (latestRunActive) {
      return (
        <div className="pb-20">
          <LoadingWorkflow
            icon="/logos/projects/Property 1=Moodboard.svg"
            title="Analyzing your moodboard"
            description="Stage is reading your references and extracting structural patterns — not colors, typography or visual style."
            steps={["Scanning references", "Extracting structural patterns", "Preparing design direction"]}
            onCancel={() => {
              if (latestRun) void cancelRunMutation({ runId: latestRun.id, projectId });
            }}
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

    const referenceCount = referenceUrls.length + uploadedFiles.length;

    return (
      <div className="pb-20">
        <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="rounded-[10px] bg-white p-5 shadow-[0_0.45px_1px_rgba(10,10,10,0.15)] sm:p-6">
            <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-[#171717]">
              Collect References
            </h2>
            <p className="mt-2 max-w-[560px] text-[13px] font-medium leading-[1.5] text-[#737373]">
              Drop in screenshots or paste a figma link. Stage extracts structural patterns — not colors,
              typography or visual style.
            </p>

            <div className="mt-6 flex gap-0 border-b border-[#ECECEC]">
              <button
                type="button"
                onClick={() => setReferenceMode("figma")}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-4 pb-3 text-[13px] font-semibold transition-colors",
                  referenceMode === "figma"
                    ? "border-[#5C56D4] text-[#171717]"
                    : "border-transparent text-[#737373] hover:text-[#525252]",
                )}
              >
                <img
                  src={PROJECT_LOGO.smartSearch}
                  alt=""
                  className={cn(
                    "h-4 w-4 shrink-0 brightness-0",
                    referenceMode === "figma" ? "opacity-[0.88]" : "opacity-40",
                  )}
                />
                Figma Link
              </button>
              <button
                type="button"
                onClick={() => setReferenceMode("upload")}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-4 pb-3 text-[13px] font-semibold transition-colors",
                  referenceMode === "upload"
                    ? "border-[#5C56D4] text-[#171717]"
                    : "border-transparent text-[#737373] hover:text-[#525252]",
                )}
              >
                <img
                  src={PROJECT_LOGO.upload}
                  alt=""
                  className={cn(
                    "h-4 w-4 shrink-0 brightness-0",
                    referenceMode === "upload" ? "opacity-[0.88]" : "opacity-40",
                  )}
                />
                Upload from Device
              </button>
            </div>

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] lg:gap-10">
              <div className="min-w-0">
                {referenceMode === "figma" ? (
                  <>
                    <FieldLabel>Figma or Website Link</FieldLabel>
                    <div className="flex flex-row items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <TextInput
                          value={referenceUrl}
                          onChange={setReferenceUrl}
                          placeholder="Paste reference link"
                          className="w-full"
                        />
                      </div>
                      <PrimaryButton onClick={addReferenceUrl} className="h-9 shrink-0 gap-2 px-4">
                        <img src={PROJECT_LOGO.add} alt="" className="h-3.5 w-3.5 brightness-0 invert" />
                        Add
                      </PrimaryButton>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept={PROJECT_ASSET_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        void uploadReferenceFile(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setUploadDropActive(true);
                      }}
                      onDragLeave={() => setUploadDropActive(false)}
                      onDrop={handleUploadDrop}
                      className={cn(
                        "w-full rounded-[12px] border-2 border-dashed border-[#5C56D4]/70 bg-white text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.12)] transition-colors",
                        "hover:border-[#5C56D4] hover:bg-[#FAFAFF]",
                        uploadDropActive && "border-[#5C56D4] bg-[#F0EFFF]/60",
                      )}
                    >
                      <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10">
                        <img
                          src={PROJECT_LOGO.upload}
                          alt=""
                          className="h-9 w-9 brightness-0 opacity-40"
                        />
                        <p className="mt-4 text-[15px] font-semibold leading-tight text-[#171717]">
                          Upload files or drag and drop
                        </p>
                        <p className="mt-1.5 text-center text-[12px] font-medium leading-[1.5] text-[#737373]">
                          Images, PDFs, Fonts, Files etc.
                        </p>
                      </div>
                    </button>
                  </>
                )}

                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <SecondaryButton onClick={() => setCollecting(false)}>Cancel</SecondaryButton>
                  <PrimaryButton onClick={() => void launchMoodboardRun()} disabled={isLaunching} className="gap-2">
                    <img
                      src={PROJECT_LOGO.sparkles}
                      alt=""
                      className="h-4 w-4 shrink-0 brightness-0 invert"
                    />
                    {isLaunching ? "Creating…" : "Create Moodboard"}
                  </PrimaryButton>
                </div>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[16px] font-semibold leading-tight text-[#171717]">Existing references</h3>
                  <span className="shrink-0 text-[12px] font-medium text-[#A3A3A3]">{referenceCount} items</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {referenceUrls.map((url) => (
                    <ReferenceCard
                      key={url}
                      variant="url"
                      label={url}
                      onRemove={() => setReferenceUrls((current) => current.filter((item) => item !== url))}
                    />
                  ))}
                  {uploadedFiles.map((file) => (
                    <ReferenceCard
                      key={file.id}
                      variant="file"
                      label={file.error ? `${file.name} — ${file.error}` : file.name}
                      fileMeta={
                        file.status === "uploading"
                          ? "Uploading…"
                          : file.status === "failed"
                            ? "Upload failed"
                            : formatBytes(file.size)
                      }
                      onRemove={() => setUploadedFiles((current) => current.filter((item) => item.id !== file.id))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
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
            <div
              key={item}
              className="flex aspect-[4/3] items-center justify-center rounded-[8px] bg-[#E5E5E5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            >
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

function linkSourceLabel(url: string): string {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const host = new URL(normalized).hostname.toLowerCase();
    if (host.includes("figma.com")) return "Figma";
    if (host.includes("dribbble.com")) return "Dribbble";
    return "Link";
  } catch {
    return "Link";
  }
}

function displayUrlTitle(url: string): string {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/$/, "");
    const s = path && path !== "/" ? `${host}${path}` : host;
    return s.length > 38 ? `${s.slice(0, 38)}…` : s;
  } catch {
    const s = url.replace(/^https?:\/\//, "");
    return s.length > 38 ? `${s.slice(0, 38)}…` : s;
  }
}

function ReferenceCard({
  variant,
  label,
  fileMeta,
  onRemove,
}: {
  variant: "url" | "file";
  label: string;
  fileMeta?: string;
  onRemove: () => void;
}) {
  const sourceType = variant === "file" ? "Uploaded" : linkSourceLabel(label);
  const displayName = variant === "url" ? displayUrlTitle(label) : label;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[10px] border border-[#E5E5E5] bg-white shadow-[0_0.45px_1px_rgba(10,10,10,0.08)]">
      <div className="flex aspect-[16/10] min-h-[100px] items-center justify-center bg-[#F4F4F5]">
        <img src={PROJECT_LOGO.placeholder} alt="" className="h-9 w-9 brightness-0 opacity-[0.28]" />
      </div>
      <div className="relative p-3 pr-11">
        <p className="truncate text-[13px] font-semibold leading-snug text-[#171717]">{displayName}</p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-[#A3A3A3]">
          {variant === "file" && fileMeta ? `${sourceType} · ${fileMeta}` : sourceType}
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors hover:bg-[#F4F4F5]"
          aria-label="Remove reference"
        >
          <img src={PROJECT_LOGO.trash} alt="" className="h-4 w-4 brightness-0 opacity-45" />
        </button>
      </div>
    </article>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
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
