import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Check, FigmaLogo, ImageSquare, Plus, UploadSimple } from "@phosphor-icons/react";
import { api } from "@/lib/convex";
import { PROJECT_ASSET_ACCEPT, uploadFileToR2, validateUploadFile } from "@/lib/r2Uploads";
import {
  AiGeneratedMeta,
  artifactText,
  formatTimestamp,
  LoadingWorkflow,
  ModulePanel,
  PrimaryButton,
  SecondaryButton,
  TextArea,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";
import { cn } from "@/lib/utils";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ProjectAiArtifact, ProjectAiRun } from "@/types/ai";

type GenerateTabProps = {
  projectId: Id<"projects">;
  projectName: string;
};

type WireframeScreen = {
  id: string;
  name: string;
  description: string;
  type: "Page" | "Section" | "Modal";
  priority: "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  requirement: "Required" | "Optional";
};

export function GenerateTab({ projectId, projectName }: GenerateTabProps) {
  const artifacts = useQuery(api.projectAi.listArtifacts, { projectId, module: "generate" });
  const runs = useQuery(api.projectAi.listRuns, { projectId, module: "generate" });
  const createRun = useMutation(api.projectAi.createRun);
  const requestArtifactDestination = useMutation(api.projectAi.requestArtifactDestination);
  const r2GenerateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useMutation(api.r2.syncMetadata);

  const brandKitInputRef = useRef<HTMLInputElement | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<"type" | "brand-kit" | "config">("type");
  const [wireframeType, setWireframeType] = useState<"lo-fi" | "hi-fi" | null>(null);
  const [brandKit, setBrandKit] = useState<{ name: string; size: number; key: string | null } | null>(null);
  const [brandKitError, setBrandKitError] = useState<string | null>(null);
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

  const cancelRun = useMutation(api.projectAi.cancelRun);

  async function launchGenerateRun() {
    await createRun({
      projectId,
      module: "generate",
      title: `${projectName} wireframe generation`,
      inputSummary: `Generate ${selectedScreens.length} ${wireframeType ?? "lo-fi"} wireframes. Brand kit: ${brandKit?.name ?? "none"}. Preference: ${layoutPreference || "none"}`,
    });
  }

  async function handleCancelRun() {
    if (!latestRun) return;
    await cancelRun({ runId: latestRun.id, projectId });
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
  }

  async function uploadBrandKit(file: File) {
    const validationError = validateUploadFile("project-asset", file);
    if (validationError) {
      setBrandKitError(validationError);
      return;
    }

    setBrandKit({ name: file.name, size: file.size, key: null });
    setBrandKitError(null);

    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "project-asset",
        file,
      });
      setBrandKit({ name: file.name, size: file.size, key });
    } catch (error) {
      setBrandKitError(error instanceof Error ? error.message : "Could not upload this brand kit.");
    }
  }

  function toggleScreen(screenId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(screenId)) {
        next.delete(screenId);
      } else {
        next.add(screenId);
      }
      return next;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Loading state                                                      */
  /* ------------------------------------------------------------------ */
  if (latestRunActive && artifactList.length === 0) {
    return (
      <div className="pb-20">
        <LoadingWorkflow
          icon="/logos/projects/Property 1=Wireframe.svg"
          title="Creating Wireframe"
          description="Hold tight, we're building your wireframes based on the moodboard and flows."
          steps={["Scanned Moodboard", "Scanned Flows", "Creating Layouts", "Create Wireframes"]}
          onCancel={() => void handleCancelRun()}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Empty state – wireframe type selection                             */
  /* ------------------------------------------------------------------ */
  if (artifactList.length === 0 && !configOpen) {
    return (
      <div className="pb-20">
        <ModulePanel bodyClassName="flex min-h-[642px] items-center justify-center px-6">
          <div className="w-full max-w-[320px]">
            <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Create Wireframe</h2>
            <p className="mt-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
              Select how you want your wireframe to look like.
            </p>
            <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[8px] bg-white p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <WireframeTypeCard
                active={wireframeType === "lo-fi"}
                label="Lo-Fi Wireframe"
                onClick={() => setWireframeType("lo-fi")}
              />
              <WireframeTypeCard
                active={wireframeType === "hi-fi"}
                label="Hi-Fi Wireframe"
                onClick={() => setWireframeType("hi-fi")}
              />
            </div>
            <PrimaryButton
              className="mt-2 w-full"
              disabled={!wireframeType}
              onClick={() => {
                setSetupStep("brand-kit");
                setConfigOpen(true);
              }}
            >
              Continue
              <ArrowRight size={14} />
            </PrimaryButton>
          </div>
        </ModulePanel>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Brand-kit upload step                                              */
  /* ------------------------------------------------------------------ */
  if (artifactList.length === 0 && configOpen && setupStep === "brand-kit") {
    return (
      <div className="pb-20">
        <ModulePanel bodyClassName="flex min-h-[642px] items-center justify-center px-6">
          <div className="w-full max-w-[320px]">
            <h2 className="text-[15px] font-semibold leading-none text-[#171717]">Upload Your Brand Kit</h2>
            <p className="mt-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
              Upload a brand guideline document for higher-fidelity wireframes.
            </p>
            <input
              ref={brandKitInputRef}
              type="file"
              accept={PROJECT_ASSET_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) return;
                void uploadBrandKit(file);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => brandKitInputRef.current?.click()}
              className="mt-4 flex h-[128px] w-full items-center justify-center rounded-[8px] border-2 border-dashed border-[#D4D4D4] bg-[#FAFAFA] p-5 text-center transition-colors hover:border-[#7B76DF] hover:bg-[#F5F5FF]"
            >
              <div>
                <UploadSimple size={18} weight="fill" className="mx-auto text-[#525252]" />
                <p className="mt-3 text-[13px] font-medium leading-none text-[#171717]">Upload files or drag and drop</p>
                <p className="mt-1 text-[12px] font-medium text-[#737373]">Images, PDFs, Fonts, Files etc.</p>
              </div>
            </button>
            {brandKit ? (
              <div className="mt-1 flex h-8 items-center justify-between rounded-[6px] bg-white px-3 text-[12px] font-medium text-[#525252] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ImageSquare size={14} weight="fill" />
                  <span className="truncate">{brandKit.name}</span>
                </span>
                <span>{Math.round((brandKit.size / (1024 * 1024)) * 10) / 10}MB</span>
              </div>
            ) : null}
            {brandKitError ? <p className="mt-2 text-[12px] text-destructive">{brandKitError}</p> : null}
            <div className="mt-2 grid grid-cols-[64px_1fr] gap-1">
              <SecondaryButton onClick={() => {
                setConfigOpen(false);
                setSetupStep("type");
              }}>
                <ArrowLeft size={14} />
                Back
              </SecondaryButton>
              <PrimaryButton onClick={() => setSetupStep("config")}>
                Continue
                <ArrowRight size={14} />
              </PrimaryButton>
            </div>
          </div>
        </ModulePanel>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Config screen – screen selection + layout preference               */
  /* ------------------------------------------------------------------ */
  if (artifactList.length === 0 && configOpen) {
    return (
      <div className="pb-20">
        <ModulePanel bodyClassName="p-4">
          <div className="flex flex-col gap-[10px] p-4">
            <p className="text-[15px] font-medium leading-none text-[#0A0A0A]">
              Generate Wireframes
            </p>
            <p className="max-w-[354px] text-[12px] font-medium leading-[1.5] text-[#525252]">
              AI will produce low-fidelity block layouts for every screen.
              You'll take them into Figma for the High-fidelity design pass.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[#171717]">
                  {DEFAULT_SCREENS.length} screens from Flows
                </span>
                <span className="h-1 w-1 rounded-full bg-[#A3A3A3]" />
                <span className="text-[13px] font-medium text-[#737373]">
                  14 patterns applied from Moodboard
                </span>
              </div>
              <div className="flex items-center gap-3">
                <SecondaryButton onClick={() => {
                  setSetupStep("type");
                  setConfigOpen(false);
                }}>
                  <ArrowLeft size={14} />
                  Change Wireframe type
                </SecondaryButton>
                {!brandKit ? (
                  <button
                    type="button"
                    onClick={() => setSetupStep("brand-kit")}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7C3AED] transition-opacity hover:opacity-80"
                  >
                    <Plus size={14} />
                    Add Brand Kit
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <WhiteCard className="p-11">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium leading-none text-[#171717]">Screens To Generate</h3>
              <span className="text-[13px] font-medium text-[#525252]">
                {selectedScreens.length} of {DEFAULT_SCREENS.length} selected
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-1">
              {DEFAULT_SCREENS.map((screen) => {
                const selected = selectedIds.has(screen.id);
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => toggleScreen(screen.id)}
                    className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)] transition-colors hover:bg-[#F0F0F0]"
                  >
                    <div className="flex items-end justify-between p-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]",
                            selected ? "bg-[#0A0A0A] text-white" : "border border-[#D4D4D4] bg-white",
                          )}>
                            {selected ? <Check size={12} weight="bold" /> : null}
                          </span>
                          <span className="text-[13px] font-medium text-[#171717]">{screen.name}</span>
                        </div>
                        <p className="text-[12px] font-normal leading-[1.5] text-[#525252]">{screen.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="rounded-[2px] bg-[#DBEAFE] px-1.5 py-0.5 text-[12px] font-normal text-[#172554]">
                          {screen.type}
                        </span>
                        <span className="rounded-[2px] bg-[#FFE4E6] px-1.5 py-0.5 text-[12px] font-normal text-[#4C0519]">
                          {screen.priority}
                        </span>
                        <span className="rounded-[2px] bg-[#E7E5E4] px-1.5 py-0.5 text-[12px] font-normal text-[#57534E]">
                          {screen.requirement}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <span className="text-[#171717]">Layout Preference</span>
                <span className="text-[#737373]">(Optional)</span>
              </div>
              <TextArea
                value={layoutPreference}
                onChange={setLayoutPreference}
                placeholder="ex. sticky header with primary CTA, wide hero, keep forms short, mobile-first density..."
                className="h-[84px]"
              />
            </div>

            <div className="mt-6 flex items-center justify-end">
              <PrimaryButton onClick={() => void launchGenerateRun()} disabled={selectedScreens.length === 0}>
                Generate {selectedScreens.length} Wireframes
                <ArrowRight size={14} />
              </PrimaryButton>
            </div>
          </WhiteCard>
        </ModulePanel>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Results – generated wireframe cards                                */
  /* ------------------------------------------------------------------ */
  const typeLabel = wireframeType === "hi-fi" ? "Hi-Fi" : "Lo-Fi";

  return (
    <div className="pb-20">
      <ModulePanel bodyClassName="p-1">
        <div className="flex items-center justify-between p-4">
          <p className="text-[15px] font-medium leading-none text-[#171717]">
            {typeLabel} Wireframes
          </p>
          <button
            type="button"
            onClick={() => {
              setWireframeType(wireframeType === "lo-fi" ? "hi-fi" : "lo-fi");
              setConfigOpen(true);
              setSetupStep("config");
            }}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#7C3AED] transition-opacity hover:opacity-80"
          >
            Convert to {wireframeType === "lo-fi" ? "High-fi" : "Lo-fi"}
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <WhiteCard key={card.id} className="overflow-hidden">
              <div className="flex aspect-[1.4] items-center justify-center bg-[#E5E5E5] rounded-[6px] m-[2px] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <ImageSquare size={24} className="text-[#737373]" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-medium leading-none text-[#171717]">{card.title}</h3>
                      <span className="rounded-[2px] bg-[#F3E8FF] px-1 py-0.5 text-[12px] font-normal text-[#3B0764]">
                        {index < 4 ? "P0" : "P1"}
                      </span>
                    </div>
                    <AiGeneratedMeta />
                    <span className="text-[12px] font-medium leading-[1.5] text-[#737373]">
                      {formatTimestamp(card.updatedAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (card.externalUrl) {
                        window.open(card.externalUrl, "_blank", "noopener,noreferrer");
                        return;
                      }
                      void handleDestination(card.artifactId, "open_in_figma");
                    }}
                    className="inline-flex shrink-0 items-center gap-2 rounded-[4px] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
                  >
                    <FigmaLogo size={15} />
                    Open in Figma
                  </button>
                </div>
              </div>
            </WhiteCard>
          ))}
        </div>
      </ModulePanel>
    </div>
  );
}

function WireframeTypeCard({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[92px] items-center justify-center gap-2 rounded-[6px] text-[12px] font-medium transition-colors",
        active ? "bg-[#EEEDFE] text-[#2F277C] shadow-[0_0_0_1px_#C9C5FF_inset]" : "bg-white text-[#525252] hover:bg-[#F5F5F5]",
      )}
    >
      <ImageSquare size={14} weight={active ? "fill" : "regular"} />
      {label}
    </button>
  );
}

const DEFAULT_SCREENS: WireframeScreen[] = [
  { id: "homepage", name: "Homepage", description: "Primary Landing - communicates value, drives demo conversion", type: "Page", priority: "P0", requirement: "Required" },
  { id: "about-us", name: "About Us", description: "Describes company mission and vision", type: "Section", priority: "P1", requirement: "Optional" },
  { id: "features", name: "Features", description: "Highlights key functionalities, engages users", type: "Page", priority: "P2", requirement: "Required" },
  { id: "pricing", name: "Pricing", description: "Details pricing tiers, promotes sign-up", type: "Page", priority: "P3", requirement: "Required" },
  { id: "testimonials", name: "Testimonials", description: "Showcases user feedback, builds trust", type: "Section", priority: "P4", requirement: "Optional" },
  { id: "blog", name: "Blog", description: "Provides insights, fosters community engagement", type: "Page", priority: "P5", requirement: "Optional" },
  { id: "contact-us", name: "Contact Us", description: "Facilitates inquiries, supports user needs", type: "Section", priority: "P6", requirement: "Required" },
];

const DEFAULT_OUTPUTS = [
  { title: "Homepage Wireframe", summary: "Primary page layout generated from the approved flow set." },
  { title: "About Us Wireframe", summary: "Company mission and vision page structure." },
  { title: "Features Wireframe", summary: "Key functionalities layout with feature cards and CTAs." },
  { title: "Pricing Wireframe", summary: "Pricing tiers comparison layout with sign-up flows." },
  { title: "Testimonials Wireframe", summary: "User feedback showcase with social proof elements." },
  { title: "Blog Wireframe", summary: "Content listing and article detail page structure." },
] as const;

function getDefaultOutput(index: number) {
  return DEFAULT_OUTPUTS[index % DEFAULT_OUTPUTS.length] ?? DEFAULT_OUTPUTS[0]!;
}
