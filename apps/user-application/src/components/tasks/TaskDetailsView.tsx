import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import type { Id } from "@stage/data-ops/convex/data-model";
import { DeleteTaskModal } from "@/components/tasks/DeleteTaskModal";
import {
  useDeleteTaskMutation,
  useSettingsOverviewQuery,
  useToggleTaskCompletionMutation,
  useUpdateTaskMutation,
} from "@/hooks/convex-data";
import { setProjectBackDestination } from "@/lib/projectBackDestination";
import { formatInputDate } from "@/lib/format";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { api } from "@/lib/convexApi";
import {
  getNormalizedMimeType,
  TASK_ATTACHMENT_ACCEPT,
  uploadFileToR2,
  validateUploadFile,
} from "@/lib/r2Uploads";
import type { Attachment } from "@/types";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskDetailsView() {
  const navigate = useNavigate();
  const { taskId } = useParams({ from: "/_authed/tasks/$taskId" });
  const search = useSearch({ from: "/_authed/tasks/$taskId" });
  const detail = useConvexQuery(api.tasks.getDetail, {
    taskId: taskId as Id<"tasks">,
  });
  const task = detail?.task ?? null;
  const project = detail?.project ?? null;
  const phase = detail?.phase ?? null;
  const isLoading = detail === undefined;

  const updateTask = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const toggleComplete = useToggleTaskCompletionMutation();
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const profile = settingsOverviewQuery.data?.profile;
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const saveAttachment = useConvexMutation(api.tasks.saveAttachment);
  const deleteAttachment = useConvexMutation(api.tasks.deleteAttachment);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backLabel =
    search.from === "project"
      ? "Back to Project"
      : search.from === "client-portal"
        ? "Back to Client Portal"
        : "Back to Tasks";
  const taskBackHref = typeof window === "undefined" ? "/tasks" : `${window.location.pathname}${window.location.search}`;

  // Sync from server when opening a different task — not on every `updatedAt` bump,
  // or debounced saves / kanban updates wipe the description/title mid-edit.
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setContent(task.content ?? "");
    setAttachments(task.attachments as Attachment[]);
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    setAttachments(task.attachments as Attachment[]);
  }, [task?.attachments, task?.id]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function goBack() {
    if (search.from === "project" && search.projectId) {
      void navigate({ to: "/project/$projectId", params: { projectId: search.projectId } });
      return;
    }

    if (search.from === "client-portal" && search.projectId) {
      void navigate({ to: "/client-portal/$projectId/preview", params: { projectId: search.projectId } });
      return;
    }

    void navigate({ to: "/tasks" });
  }

  function openLinkedProject() {
    if (!search.projectId) return;
    setProjectBackDestination({ href: taskBackHref, label: "Back to task" });
    void navigate({ to: "/project/$projectId", params: { projectId: search.projectId } });
  }

  function flashSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function persistContent(nextContent: string) {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, content: nextContent });
      setErrorMessage(null);
      flashSaved();
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not save the description."));
    }
  }

  async function persistTitle(nextTitle: string) {
    if (!task) return;
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === task.title) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, title: trimmed });
      setErrorMessage(null);
      flashSaved();
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not save the title."));
      setTitle(task.title);
    }
  }

  function handleContentChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    setContent(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistContent(next);
    }, 900);
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setTitle(next);
    if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
    titleSaveTimerRef.current = setTimeout(() => {
      void persistTitle(next);
    }, 600);
  }

  const uploadProjectId = search.projectId ?? project?.id;

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !task || !uploadProjectId) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      for (const file of Array.from(files)) {
        const validationError = validateUploadFile("task-attachment", file);
        if (validationError) {
          throw new Error(validationError);
        }
        const key = await uploadFileToR2({
          generateUploadUrl: r2GenerateUploadUrl,
          syncMetadata: r2SyncMetadata,
          purpose: "task-attachment",
          file,
          scopeId: uploadProjectId,
        });
        await saveAttachment({
          taskId: task.id as Id<"tasks">,
          r2ObjectKey: key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: getNormalizedMimeType(file),
        });
      }
      flashSaved();
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not upload that file."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    setErrorMessage(null);
    try {
      await deleteAttachment({ attachmentId: attachmentId as Id<"attachments"> });
      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
      flashSaved();
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not remove that file."));
    }
  }

  async function handleMarkComplete() {
    if (!task) return;
    setIsMenuOpen(false);
    try {
      await toggleComplete.mutateAsync(task.id);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not update the task."));
    }
  }

  async function handleDeleteTask() {
    if (!task) return;
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      goBack();
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not delete the task."));
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-6 h-8 w-[60%]" />
        <div className="skeleton mt-4 h-5 w-48" />
        <div className="skeleton mt-8 h-[320px] w-full rounded-[12px]" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-[15px] font-medium text-[#171717]">Task not found</p>
        <button type="button" onClick={goBack} className="text-[13px] font-medium text-[#525252] hover:text-[#171717]">
          {backLabel}
        </button>
      </div>
    );
  }

  const primaryAssignee = task.assignees[0];
  const primaryAssigneeLabel = primaryAssignee?.name ?? primaryAssignee?.email ?? "Unassigned";
  const primaryAssigneeAvatarUrl = getAssigneeAvatarUrl(primaryAssignee, profile);
  const dueLabel = task.dueDate ? formatInputDate(new Date(task.dueDate)) : null;
  const isOverdue = Boolean(task.dueDate && task.dueDate < Date.now() && !task.isCompleted);

  return (
    <>
      <div className="flex-1 px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
        <div className="flex w-full flex-col gap-[24px]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex w-fit items-center gap-[8px] text-[13px] font-medium leading-[1.5] text-[#a3a3a3] transition-colors hover:text-[#525252]"
            >
              <ArrowLeftIcon />
              {backLabel}
            </button>
            <span className={`text-[12px] text-[#737373] transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>
              Saved
            </span>
          </div>

          <header className="flex min-w-0 items-start justify-between gap-[12px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
              <input
                value={title}
                onChange={handleTitleChange}
                className="w-full truncate border-0 bg-transparent p-0 text-[20px] font-semibold leading-[1.2] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3]"
                aria-label="Task title"
              />
              <div className="flex min-w-0 flex-wrap items-center gap-[16px]">
                {primaryAssignee ? (
                  <MetaItem>
                    {primaryAssigneeAvatarUrl ? (
                      <img src={primaryAssigneeAvatarUrl} alt="" aria-hidden="true" className="h-[20px] w-[20px] shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-semibold text-[#525252]">
                        {primaryAssigneeLabel.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {primaryAssigneeLabel}
                  </MetaItem>
                ) : (
                  <MetaItem>Unassigned</MetaItem>
                )}
                {dueLabel ? (
                  <>
                    <Dot />
                    <MetaItem>
                      <MaskedIcon src="/logos/dashboard/deadline.svg" className="h-[18px] w-[18px] bg-[#525252]" />
                      {dueLabel}
                    </MetaItem>
                  </>
                ) : null}
                {project && phase ? (
                  <>
                    <Dot />
                    <MetaItem>
                      <button
                        type="button"
                        onClick={openLinkedProject}
                        className="cursor-pointer transition-colors hover:text-[#171717]"
                      >
                        {project.name} · {phase.name}
                      </button>
                    </MetaItem>
                  </>
                ) : null}
                {isOverdue ? (
                  <>
                    <Dot />
                    <span className="rounded-[4px] bg-[#fee2e2] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#dc2626]">
                      Overdue
                    </span>
                  </>
                ) : task.isCompleted ? (
                  <>
                    <Dot />
                    <span className="rounded-[4px] bg-[#dcfce7] px-[6px] py-[2px] text-[12px] font-normal leading-none text-[#166534]">
                      Completed
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                className="flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[6px] bg-[#f5f5f5] text-[#525252] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#eeeeee]"
                aria-label="Task actions"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <DotsIcon />
              </button>
              {isMenuOpen ? (
                <TaskActionsMenu
                  isCompleted={task.isCompleted}
                  onComplete={() => void handleMarkComplete()}
                  onDelete={() => {
                    setIsMenuOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                />
              ) : null}
            </div>
          </header>

          {errorMessage ? (
            <p className="rounded-[6px] bg-[#fef2f2] px-3 py-2 text-[12px] font-medium text-[#b91c1c]">{errorMessage}</p>
          ) : null}

          <article className="rounded-[12px] bg-[#f5f5f5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="rounded-[8px] bg-white px-[clamp(18px,8vw,100px)] py-[clamp(24px,5vw,48px)] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Add detail or context for the task…"
                className="min-h-[280px] w-full resize-y border-0 bg-transparent text-[13px] font-normal leading-[1.5] text-[#262626] outline-none placeholder:text-[#a3a3a3]"
                aria-label="Task description"
              />

              {attachments.length > 0 ? (
                <div className="mt-[24px] flex flex-col gap-[8px]">
                  {attachments.map((attachment) => (
                    <AttachmentRow
                      key={attachment.id}
                      attachment={attachment}
                      onDelete={() => void handleDeleteAttachment(attachment.id)}
                    />
                  ))}
                </div>
              ) : null}

              <div className="mt-[24px] h-px w-full bg-[#e5e5e5]" />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={TASK_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <button
                type="button"
                disabled={uploading || !uploadProjectId}
                onClick={() => fileInputRef.current?.click()}
                className="mt-[12px] flex h-[32px] w-fit cursor-pointer items-center gap-[8px] rounded-[6px] py-[6px] text-[13px] font-medium leading-none text-[#525252] transition-colors hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <img src="/logos/dashboard/plus.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px]" />
                {uploading ? "Uploading…" : "Attach File"}
              </button>
              {!uploadProjectId ? (
                <p className="mt-2 text-[12px] text-[#737373]">Open this task from a project to attach files.</p>
              ) : null}
            </div>
          </article>
        </div>
      </div>
      {isDeleteModalOpen ? (
        <DeleteTaskModal
          onCancel={() => setIsDeleteModalOpen(false)}
          onDelete={() => void handleDeleteTask()}
        />
      ) : null}
    </>
  );
}

function TaskActionsMenu({
  isCompleted,
  onComplete,
  onDelete,
}: {
  isCompleted: boolean;
  onComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Task actions"
      className="absolute right-0 top-[40px] z-50 flex w-[212px] flex-col gap-[8px] rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#fafafa] p-[12px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
    >
      <button
        type="button"
        role="menuitem"
        onClick={onComplete}
        className="flex w-full items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-none text-[#262626] transition-colors hover:bg-[#f5f5f5]"
      >
        <CheckIcon />
        {isCompleted ? "Mark as incomplete" : "Mark as completed"}
      </button>
      <div className="h-px w-full bg-[#e5e5e5]" />
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        className="flex w-full items-center rounded-[6px] px-[8px] py-[6px] text-left text-[12px] font-medium leading-none text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
      >
        Delete Task
      </button>
    </div>
  );
}

function AttachmentRow({
  attachment,
  onDelete,
}: {
  attachment: Attachment;
  onDelete: () => void;
}) {
  return (
    <div className="w-full max-w-[420px] rounded-[12px] bg-[#f5f5f5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
      <div className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-[16px] py-[8px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex min-w-0 items-start gap-[8px]">
          <MaskedIcon src="/logos/dashboard/upload-from-device.svg" className="h-[20px] w-[20px] shrink-0 bg-[#525252]" />
          <div className="flex min-w-0 flex-col gap-[4px]">
            <p className="truncate text-[13px] font-medium leading-none text-[#171717]">{attachment.fileName}</p>
            <p className="text-[12px] font-medium leading-none text-[#737373]">{formatFileSize(attachment.fileSize)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {attachment.url ? (
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-medium text-[#463fba] hover:underline"
            >
              Open
            </a>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="text-[12px] font-medium text-[#737373] transition-colors hover:text-[#dc2626]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-[8px] text-[13px] font-medium leading-[1.2] text-[#525252]">{children}</span>;
}

function getAssigneeAvatarUrl(
  assignee: { userId: string; name: string | null; email?: string | null } | undefined,
  profile: { id: string; name: string; email: string; avatarUrl: string | null } | undefined,
) {
  if (!assignee || !profile?.avatarUrl) return undefined;

  if (assignee.userId === profile.id || assignee.email === profile.email || assignee.name === profile.name) {
    return profile.avatarUrl;
  }

  return undefined;
}

function Dot() {
  return <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-[#d4d4d4]" />;
}

function ArrowLeftIcon() {
  return <img src="/logos/back.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px] shrink-0" />;
}

function DotsIcon() {
  return <img src="/logos/dashboard/dots.svg" alt="" aria-hidden="true" className="h-[16px] w-[16px]" />;
}

function MaskedIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        mask: `url(${src}) center / contain no-repeat`,
        WebkitMask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-[14px] w-[14px] shrink-0">
      <path d="M3 7.1 5.7 9.8 11 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
