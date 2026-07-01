import { useMemo, useState } from "react";
import type { Phase, Task } from "@/types";

type PortalColumnKey = "backlog" | "todo" | "in-progress" | "done" | "revision";

type PortalCard = { task: Task; phaseName: string };

const COLUMNS: { key: PortalColumnKey; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To-do" },
  { key: "in-progress", label: "In-progress" },
  { key: "done", label: "Done" },
  { key: "revision", label: "Revision" },
];

const PHASE_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Research: { bg: "bg-[#FDECEC]", text: "text-[#D64545]" },
  Strategy: { bg: "bg-[#FEF3E2]", text: "text-[#D4890A]" },
  Identity: { bg: "bg-[#EAF4FC]", text: "text-[#2E7DB5]" },
  Guidelines: { bg: "bg-[#EDFCF2]", text: "text-[#22C55E]" },
  Design: { bg: "bg-[#F3EEFF]", text: "text-[#7C3AED]" },
  Development: { bg: "bg-[#EAF4FC]", text: "text-[#2E7DB5]" },
  Delivery: { bg: "bg-[#F5F5F5]", text: "text-[#525252]" },
  Launch: { bg: "bg-[#EDFCF2]", text: "text-[#22C55E]" },
  Testing: { bg: "bg-[#FEF3E2]", text: "text-[#D4890A]" },
  Discovery: { bg: "bg-[#FEF3E2]", text: "text-[#D4890A]" },
};

const DEFAULT_TAG_COLOR = { bg: "bg-[#F5F5F5]", text: "text-[#525252]" };

function getColumn(task: Task, phaseStatus: string): PortalColumnKey {
  if (task.boardStatus) return task.boardStatus;
  if (task.isCompleted) return "done";
  if (phaseStatus === "upcoming") return "backlog";
  if (phaseStatus === "active") return "in-progress";
  return "todo";
}

export function PortalBoard({
  phases,
  accentColor,
  canRequestRevision,
  onRequestRevision,
}: {
  phases: Phase[];
  accentColor: string;
  canRequestRevision: boolean;
  onRequestRevision: (taskId: string, note: string) => Promise<void>;
}) {
  const columns = useMemo(() => {
    const grouped: Record<PortalColumnKey, PortalCard[]> = {
      backlog: [],
      todo: [],
      "in-progress": [],
      done: [],
      revision: [],
    };
    for (const phase of phases) {
      for (const task of phase.tasks) {
        grouped[getColumn(task, phase.status)].push({ task, phaseName: phase.name });
      }
    }
    return grouped;
  }, [phases]);

  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [isRevisionDragOver, setIsRevisionDragOver] = useState(false);
  const [composerTaskId, setComposerTaskId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openComposer(taskId: string) {
    if (!canRequestRevision) return;
    const existing = columns.revision.find((card) => card.task.id === taskId);
    setComposerTaskId(taskId);
    setNoteDraft(existing?.task.revisionNote ?? "");
    setError(null);
  }

  function closeComposer() {
    setComposerTaskId(null);
    setNoteDraft("");
    setError(null);
  }

  async function submitRevision() {
    if (!composerTaskId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onRequestRevision(composerTaskId, noteDraft.trim());
      closeComposer();
    } catch {
      setError("Could not save your revision. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-[10px] bg-[#F5F5F5] p-4 sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const isRevision = col.key === "revision";
        return (
          <div
            key={col.key}
            className={`flex flex-col rounded-[8px] transition-colors ${
              isRevision && isRevisionDragOver ? "bg-white/60 ring-2 ring-inset" : ""
            }`}
            style={isRevision && isRevisionDragOver ? { boxShadow: `inset 0 0 0 2px ${accentColor}` } : undefined}
            onDragOver={
              isRevision && canRequestRevision
                ? (event) => {
                    event.preventDefault();
                    setIsRevisionDragOver(true);
                  }
                : undefined
            }
            onDragLeave={isRevision ? () => setIsRevisionDragOver(false) : undefined}
            onDrop={
              isRevision && canRequestRevision
                ? (event) => {
                    event.preventDefault();
                    setIsRevisionDragOver(false);
                    if (dragTaskId) openComposer(dragTaskId);
                    setDragTaskId(null);
                  }
                : undefined
            }
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-[13px] font-semibold text-text-primary">{col.label}</h3>
              <span className="text-[12px] text-text-tertiary">{columns[col.key].length}</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {isRevision && composerTaskId ? (
                <div className="rounded-[8px] border border-border-subtle bg-white p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                  <p className="mb-2 text-[12px] font-medium text-text-secondary">
                    Leave your thoughts for this revision
                  </p>
                  <textarea
                    autoFocus
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="What would you like changed?"
                    className="w-full resize-none rounded-[6px] border border-border-subtle bg-white p-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1"
                    style={{ outlineColor: accentColor }}
                  />
                  {error ? <p className="mt-1 text-[12px] text-[#D64545]">{error}</p> : null}
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeComposer}
                      disabled={isSubmitting}
                      className="rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-bg-subtle disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitRevision()}
                      disabled={isSubmitting}
                      className="rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: accentColor }}
                    >
                      {isSubmitting ? "Saving…" : "Submit revision"}
                    </button>
                  </div>
                </div>
              ) : null}

              {columns[col.key].map(({ task, phaseName }) => {
                const tagColor = PHASE_TAG_COLORS[phaseName] ?? DEFAULT_TAG_COLOR;
                const draggable = canRequestRevision && !isRevision;
                return (
                  <div
                    key={task.id}
                    draggable={draggable}
                    onDragStart={draggable ? () => setDragTaskId(task.id) : undefined}
                    onDragEnd={draggable ? () => setDragTaskId(null) : undefined}
                    className={`rounded-[8px] bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                      draggable ? "cursor-grab active:cursor-grabbing" : ""
                    } ${dragTaskId === task.id ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`mb-2 inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${tagColor.bg} ${tagColor.text}`}
                    >
                      {phaseName}
                    </span>
                    <p
                      className={`text-[13px] font-medium leading-[1.35] ${
                        task.isCompleted ? "text-text-tertiary line-through" : "text-text-primary"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.content ? (
                      <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-text-tertiary">
                        {task.content}
                      </p>
                    ) : null}

                    {isRevision && task.revisionNote ? (
                      <p className="mt-2 rounded-[6px] bg-bg-subtle/70 p-2 text-[12px] leading-[1.5] text-text-secondary">
                        “{task.revisionNote}”
                      </p>
                    ) : null}

                    {canRequestRevision ? (
                      <button
                        type="button"
                        onClick={() => openComposer(task.id)}
                        className="mt-2 text-[11px] font-medium transition-colors hover:underline"
                        style={{ color: accentColor }}
                      >
                        {isRevision ? "Edit revision note" : "Request revision"}
                      </button>
                    ) : null}
                  </div>
                );
              })}

              {columns[col.key].length === 0 && !(isRevision && composerTaskId) ? (
                <div className="rounded-[8px] bg-white/50 p-4 text-center text-[12px] text-text-tertiary">
                  {isRevision && canRequestRevision ? "Drag a task here to request changes" : "No tasks"}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
