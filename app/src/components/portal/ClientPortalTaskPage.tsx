import { useMemo } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { Helmet } from "react-helmet-async";
import { useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  DownloadSimple,
  File as FileIcon,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Checkbox } from "@/components/ui/Checkbox";
import { api } from "@/lib/convex";
import { buildPortalPath } from "@/lib/portal";
import { formatFileSize } from "@/lib/utils";
import type { Phase, Task } from "@/types";

export function ClientPortalTaskPage() {
  const { token, taskId } = useParams({ from: "/portal/$token/task/$taskId" });
  const data = useConvexQuery(api.portal.getByShareToken, { shareToken: token });
  const isLoading = data === undefined;
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const previewSuffix = isPreview ? "?preview=1" : "";
  const phases = (data?.project.phases as Phase[] | undefined) ?? [];
  const project = data?.project ?? null;

  const task = useMemo(
    () =>
      phases.flatMap((phase) => phase.tasks).find((phaseTask: Task) => phaseTask.id === taskId) ??
      null,
    [phases, taskId],
  );

  const phaseName = useMemo(
    () =>
      phases.find((phase) => phase.tasks.some((phaseTask) => phaseTask.id === taskId))?.name ?? "",
    [phases, taskId],
  );

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

  if (!data || !project) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <h2 className="font-heading text-[22px] font-semibold text-text-primary">
          Portal not found
        </h2>
        <p className="mt-2 max-w-[360px] text-[15px] text-text-secondary">
          This link may have expired or client access has been turned off.
        </p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6">
        <h2 className="font-heading text-[22px] font-semibold text-text-primary">
          Task not found
        </h2>
        <a
          href={`${buildPortalPath(token)}${previewSuffix}`}
          className="mt-2 text-[14px] text-accent hover:underline"
        >
          Back to portal
        </a>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{task.title} - Client Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-white">
        {isPreview ? (
          <div className="bg-[#141531] px-6 py-2 text-center text-[12px] text-white sm:text-[13px]">
            Preview mode
            <span className="ml-2 text-white/60">This is what your client will see</span>
          </div>
        ) : null}

        <div className="mx-auto max-w-[1200px] px-6 pb-14 pt-5 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <a
              href={`${buildPortalPath(token)}${previewSuffix}`}
              className="inline-flex items-center gap-1 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={14} />
              {project.name} · {phaseName}
            </a>
            <span className="text-[12px] text-text-tertiary">View only</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-[680px] pt-10"
          >
            <div className="mb-10 flex items-start gap-3">
              <div className="pt-1">
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={() => undefined}
                  disabled
                  className="h-[22px] w-[22px] rounded-[4px] border-[1.5px]"
                />
              </div>
              <div className="w-full">
                <h1
                  className={`font-heading text-[28px] font-semibold leading-[1.3] tracking-[-0.5px] ${
                    task.isCompleted ? "text-text-secondary line-through" : "text-text-primary"
                  }`}
                >
                  {task.title}
                </h1>
              </div>
            </div>

            <div className="min-h-[220px]">
              {task.content ? (
                looksLikeHtml(task.content) ? (
                  <div
                    className="min-h-[220px] text-[15px] leading-8 text-text-primary [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-2 [&_p]:mb-5 [&_p:last-child]:mb-0 [&_ul]:ml-6 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: task.content }}
                  />
                ) : (
                  <div className="min-h-[220px] whitespace-pre-wrap text-[15px] leading-8 text-text-primary">
                    {task.content}
                  </div>
                )
              ) : (
                <p className="min-h-[220px] text-[15px] leading-8 text-text-tertiary">
                  No notes have been added to this task yet.
                </p>
              )}

              {task.attachments.length > 0 ? (
                <div className="space-y-4">
                  {task.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="relative flex items-center gap-3 rounded-[10px] bg-bg-subtle px-4 py-3"
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
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        download={attachment.fileName}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:text-text-secondary"
                        aria-label={`Download ${attachment.fileName}`}
                      >
                        <DownloadSimple size={16} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}
