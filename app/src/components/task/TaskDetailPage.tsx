import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  DownloadSimple,
  File as FileIcon,
  Image as ImageIcon,
  Plus,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { getProject, getTask } from "@/data-ops/queries";
import { toggleTaskComplete, updateTask, uploadFile } from "@/data-ops/mutations";
import { Checkbox } from "@/components/ui/Checkbox";
import { debounce, formatFileSize } from "@/lib/utils";
import type { Attachment } from "@/types";

export function TaskDetailPage() {
  const { id: projectId, taskId } = useParams({
    from: "/_app/project/$id/task/$taskId",
  });
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", projectId, taskId],
    queryFn: () => getTask(projectId, taskId),
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setContent(task.content ?? "");
    setAttachments(task.attachments);
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (payload: { title?: string; content?: string }) =>
      updateTask(taskId, payload),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["task", projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleTaskComplete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // keep auto-save quiet while typing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedContentSave = useCallback(
    debounce((nextContent: string) => {
      updateMutation.mutate({ content: nextContent });
    }, 900),
    [],
  );

  const phaseName = useMemo(() => {
    if (!project) return "";
    return (
      project.phases.find((phase) =>
        phase.tasks.some((phaseTask) => phaseTask.id === taskId),
      )?.name ?? ""
    );
  }, [project, taskId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 lg:px-14">
        <div className="skeleton mb-6 h-4 w-60" />
        <div className="mx-auto max-w-[680px]">
          <div className="skeleton mb-8 h-10 w-full" />
          <div className="skeleton mb-3 h-6 w-[80%]" />
          <div className="skeleton mb-3 h-6 w-[74%]" />
          <div className="skeleton mb-3 h-6 w-[68%]" />
        </div>
      </div>
    );
  }

  if (!task || !project) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center">
        <h2 className="font-heading text-[22px] font-semibold text-text-primary">
          Task not found
        </h2>
        <Link
          to="/project/$id"
          params={{ id: projectId }}
          className="mt-2 text-[14px] text-accent hover:underline"
        >
          Back to project
        </Link>
      </div>
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        setAttachments((prev) => [...prev, uploaded]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{task.title} — Stage</title>
      </Helmet>

      <div className="mx-auto max-w-[1200px] px-6 pb-14 pt-5 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Link
            to="/project/$id"
            params={{ id: projectId }}
            className="inline-flex items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={14} />
            {project.name} · {phaseName}
          </Link>
          <span
            className={`text-[12px] text-text-tertiary transition-opacity ${
              saved ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-[680px] pt-10"
        >
          <div className="mb-10 flex items-start gap-3">
            <div className="pt-2">
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={() => toggleMutation.mutate()}
              />
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                if (title.trim() && title !== task.title) {
                  updateMutation.mutate({ title: title.trim() });
                }
              }}
              className={`w-full bg-transparent font-heading text-[41px] font-semibold leading-[1.15] tracking-tight outline-none ${
                task.isCompleted
                  ? "text-text-secondary line-through"
                  : "text-text-primary"
              }`}
              placeholder="Task title"
            />
          </div>

          <div
            className="min-h-[220px]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFiles(event.dataTransfer.files);
            }}
          >
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                debouncedContentSave(event.target.value);
              }}
              placeholder="Add notes, upload files, or drop images here..."
              className="min-h-[220px] w-full resize-none border-none bg-transparent text-[15px] leading-8 text-text-primary outline-none placeholder:text-text-tertiary"
            />

            <div className="space-y-4">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-[10px] bg-bg-subtle px-4 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-white">
                    {attachment.type === "image" ? (
                      <ImageIcon size={17} className="text-text-secondary" />
                    ) : (
                      <FileIcon size={17} className="text-text-secondary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text-primary">
                      {attachment.fileName}
                    </p>
                    <p className="text-[12px] text-text-secondary">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                  <button className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-text-secondary">
                    <DownloadSimple size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="mt-4 inline-flex w-full cursor-pointer items-center gap-2 border-t border-border-subtle pt-4 text-[13px] text-text-tertiary transition-colors hover:text-accent">
            <Plus size={13} />
            Attach file
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </label>

          {uploading && (
            <p className="mt-2 text-[12px] text-text-secondary">Uploading files...</p>
          )}
        </motion.div>
      </div>
    </>
  );
}

type TaskDetailChecklistPreviewProps = {
  firstChecked: boolean;
  secondChecked: boolean;
};

export function TaskDetailChecklistPreview({
  firstChecked,
  secondChecked,
}: TaskDetailChecklistPreviewProps) {
  return (
    <div className="w-full rounded-[10px] border border-border-subtle bg-white px-3 py-2.5" aria-hidden>
      <div className="space-y-1.5">
        <div className="group flex items-center gap-2.5 py-1.5 text-[13px]">
          <Checkbox checked={firstChecked} onCheckedChange={() => undefined} disabled />
          <span
            className={`transition-colors ${
              firstChecked ? "text-text-tertiary line-through" : "text-text-primary"
            }`}
          >
            Homepage wireframes
          </span>
        </div>

        <div className="group flex items-center gap-2.5 border-t border-border-subtle py-1.5 text-[13px]">
          <Checkbox checked={secondChecked} onCheckedChange={() => undefined} disabled />
          <span
            className={`transition-colors ${
              secondChecked ? "text-text-tertiary line-through" : "text-text-primary"
            }`}
          >
            Payment flow revision
          </span>
        </div>
      </div>
    </div>
  );
}
