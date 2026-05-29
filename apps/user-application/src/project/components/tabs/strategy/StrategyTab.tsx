import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { appendRegeneratedText, cloneSections } from "../../../helpers/strategyTabHelpers";
import { initialSections, type StrategySection } from "../../../models/strategyTab";
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

export function StrategyTab() {
  const [sections, setSections] = useState(initialSections);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSections, setEditSections] = useState<StrategySection[]>([]);
  const [draftTitle, setDraftTitle] = useState("Enter Title Here");
  const [draftBody, setDraftBody] = useState("");
  const visibleSections = isEditing ? editSections : sections;

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
