import { useEffect, useMemo, useState } from "react";
import { useResearchTab } from "@/hooks/project";
import { cn } from "@/lib/utils";
import { appendRegeneratedText, cloneSections } from "@/lib/project/strategyTabHelpers";
import type { Project } from "@/models/project/project";
import { initialSections, type StrategySection } from "@/models/project/strategyTab";
import {
  AddSectionEditor,
} from "./AddSectionEditor";
import { StrategySectionCard } from "./StrategySectionCard";
import { MetaDot } from "./StrategyStatus";
import {
  ArrowRightIcon,
  EditIcon,
  PlusIcon,
  SaveIcon,
} from "./strategyIcons";

type StrategyTabProps = {
  project: Pick<Project, "id" | "name" | "clientName">;
  onGoToResearch: () => void;
  isGenerating: boolean;
  onGenerationComplete: () => void;
};

const STRATEGY_GENERATION_DELAY_MS = 1800;

export function StrategyTab({
  project,
  onGoToResearch,
  isGenerating,
  onGenerationComplete,
}: StrategyTabProps) {
  const [sections, setSections] = useState(initialSections);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSections, setEditSections] = useState<StrategySection[]>([]);
  const [draftTitle, setDraftTitle] = useState("Enter Title Here");
  const [draftBody, setDraftBody] = useState("");
  const research = useResearchTab(project);
  const visibleSections = isEditing ? editSections : sections;

  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const timeoutId = window.setTimeout(onGenerationComplete, STRATEGY_GENERATION_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isGenerating, onGenerationComplete]);

  const approvedCount = useMemo(
    () => visibleSections.filter((section) => section.status === "approved").length,
    [visibleSections],
  );

  function approveSection(sectionId: string) {
    setSections((current) => current.map((section) => (
      section.id === sectionId ? { ...section, status: "approved" } : section
    )));
  }

  function regenerateSection(sectionId: string) {
    setSections((current) => current.map((section) => (
      section.id === sectionId
        ? { ...section, status: "action", body: section.body?.map((line) => `${line} Regenerated mock update.`) }
        : section
    )));
  }

  function startEditing() {
    setEditSections(cloneSections(sections));
    setIsEditing(true);
  }

  function discardEditing() {
    setEditSections([]);
    setIsEditing(false);
  }

  function saveEditing() {
    setSections(cloneSections(editSections));
    setEditSections([]);
    setIsEditing(false);
  }

  function updateEditSection(sectionId: string, nextSection: StrategySection) {
    setEditSections((current) => current.map((section) => (
      section.id === sectionId ? nextSection : section
    )));
  }

  function saveDraftSection() {
    const title = draftTitle.trim() || "Untitled Strategy Section";
    const body = draftBody.trim() || "Write here...";
    setSections((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        title,
        status: "approved",
        kind: "paragraph",
        body: [body],
      },
    ]);
    setDraftTitle("Enter Title Here");
    setDraftBody("");
    setIsAdding(false);
  }

  if (research.isLoading) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[clamp(24px,3.8vw,44px)] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <p className="text-[13px] font-medium leading-[1.5] text-[#737373]">Loading research status...</p>
        </div>
      </section>
    );
  }

  if (!research.hasArtifact || !research.data) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex w-full flex-col gap-1 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex items-center justify-center p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[15px] font-medium leading-none text-[#171717]">Generate Strategy</p>
                <p className="max-w-[420px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                  Strategy is generated from the research. Run research first, then come back here to generate the strategy.
                </p>
              </div>
            </div>

            <div className="rounded-[8px] bg-white px-11 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <div className="flex max-w-[420px] flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <p className="text-[20px] font-semibold leading-[1.2] text-[#171717]">
                    Research required
                  </p>
                  <p className="text-[13px] font-medium leading-[1.6] text-[#737373]">
                    We need the project research before strategy can be generated. Add the project context in Research and run it first.
                  </p>
                  {research.parseError ? (
                    <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                      Saved research exists but could not be parsed. Re-run research to continue.
                    </p>
                  ) : null}
                  {research.error ? (
                    <p className="text-[13px] font-medium leading-[1.5] text-[#DC2626]">
                      {research.error}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onGoToResearch}
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] px-3 text-[13px] font-medium leading-[1.25] text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95"
                  >
                    Go to Research
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isGenerating) {
    return (
      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="rounded-[8px] bg-white px-[44px] py-[44px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex min-h-[520px] items-center justify-center">
            <div className="flex w-full max-w-[282px] flex-col items-center gap-6">
              <img
                src="/logos/generating-strategy.svg"
                alt=""
                aria-hidden="true"
                className="h-[37px] w-[37px] animate-spin"
              />

              <div className="flex w-full flex-col items-center gap-2">
                <p className="text-center text-[16px] font-semibold leading-none text-[#171717]">
                  Generating Strategy
                </p>
                <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
                  Extracting structural patterns - AI ignores color, typography, and visual style.
                </p>
              </div>

              <div className="flex w-full flex-col items-center gap-2">
                <StrategyLoadingStep icon="/logos/check.svg" label="Identified Goals & KPIs" />
                <StrategyLoadingStep icon="/logos/check.svg" label="Created user journey" />
                <StrategyLoadingStep icon="/logos/loader.svg" label="Generating conversion approach" spinning />
                <StrategyLoadingStep icon="/logos/unchecked.svg" label="Identify Technical Requirements" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="rounded-[8px] bg-white p-[clamp(24px,3.8vw,44px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-[10px] w-[65px] overflow-hidden rounded-full bg-[#E5E5E5]">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-[width]"
                  style={{ width: `${Math.max(8, (approvedCount / visibleSections.length) * 100)}%` }}
                />
              </div>
              <p className="text-[13px] font-medium leading-[1.25] text-[#171717]">
                {approvedCount} of {visibleSections.length} sections approved
              </p>
              <MetaDot />
              <p className="text-[13px] font-medium leading-[1.25] text-[#737373]">Total {visibleSections.length} sections</p>
              <MetaDot />
              <p className="text-[13px] font-medium leading-[1.25] text-[#737373]">Based on Research</p>
            </div>
            {isEditing ? (
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={discardEditing}
                  className="inline-flex h-8 cursor-pointer items-center rounded-[6px] bg-[#F5F5F5] px-3 py-2 text-[12px] font-medium leading-[1.25] text-[#EF4444] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#FEF2F2]"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={saveEditing}
                  className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[6px] border border-[#34D399] bg-gradient-to-b from-[#10B981] to-[#059669] px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#ECFDF5] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:opacity-95"
                >
                  <SaveIcon />
                  Save Changes
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC]"
              >
                <EditIcon />
                Edit Strategy
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {visibleSections.map((section, index) => (
              <StrategySectionCard
                key={section.id}
                section={section}
                showDivider={index > 0}
                isEditing={isEditing}
                onSectionChange={(nextSection) => updateEditSection(section.id, nextSection)}
                onApprove={() => approveSection(section.id)}
                onRegenerate={() => {
                  if (isEditing) {
                    updateEditSection(section.id, appendRegeneratedText(section));
                    return;
                  }
                  regenerateSection(section.id);
                }}
              />
            ))}
          </div>

          {isAdding ? (
            <AddSectionEditor
              title={draftTitle}
              body={draftBody}
              onTitleChange={setDraftTitle}
              onBodyChange={setDraftBody}
              onSave={saveDraftSection}
              onCancel={() => setIsAdding(false)}
            />
          ) : null}

          <div className={cn("flex flex-wrap items-center justify-between gap-4", isEditing && "opacity-50")}>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[6px] py-2 pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#F5F5F5]"
            >
              <PlusIcon />
              Add Section
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="inline-flex h-[29px] cursor-pointer items-center gap-[6px] rounded-[4px] bg-[#F5F5F5] p-2 text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] hover:bg-[#ECECEC]">
                Add to notion
              </button>
              <button type="button" disabled className="inline-flex h-8 cursor-not-allowed items-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-2 pl-3 pr-[10px] text-[13px] font-medium leading-[1.25] text-[#FAFAFA] opacity-50 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
                Continue to Flows
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategyLoadingStep({
  icon,
  label,
  spinning = false,
}: {
  icon: string;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className={cn("shrink-0", spinning ? "h-[16px] w-[16px] animate-spin" : "h-[18px] w-[18px]")}
      />
      <p className="text-center text-[13px] font-medium leading-[1.5] text-[#525252]">
        {label}
      </p>
    </div>
  );
}
