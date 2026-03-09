import {
  DotsThreeVertical,
  ShareNetwork,
} from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Project } from "@/types";

type ProjectHeaderProps = {
  project: Project;
  onShare: () => void;
  onEditName: () => void;
  onEditClient: () => void;
  onAdjustTimeline: () => void;
  onEditPhases: () => void;
  onTogglePaused: () => void;
  onDelete: () => void;
};

export function ProjectHeader({
  project,
  onShare,
  onEditName,
  onEditClient,
  onAdjustTimeline,
  onEditPhases,
  onTogglePaused,
  onDelete,
}: ProjectHeaderProps) {
  return (
    <section className="flex flex-col gap-6 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:text-left">
      <div className="flex min-w-0 flex-col items-center sm:flex-row sm:items-center sm:gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-input-bg sm:h-8 sm:w-8">
          {project.clientAvatarUrl ? (
            <img
              src={project.clientAvatarUrl}
              alt={project.clientName}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <h1 className="max-w-[720px] text-balance font-heading text-[30px] font-semibold tracking-[-0.5px] text-text-primary sm:inline-block sm:max-w-none sm:text-[22px] sm:font-medium sm:tracking-[-0.3px]">
            {project.name}
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary sm:hidden">
            {project.clientName}
          </p>
          <span className="hidden text-[16px] text-text-secondary sm:inline">
            · {project.clientName}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
        <div className="mx-auto w-full max-w-[260px] sm:mx-0 sm:w-[100px] sm:max-w-none">
          <ProgressBar value={project.progress} showLabel className="w-full" />
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="h-11 w-full rounded-[10px] text-[15px] sm:h-8 sm:w-auto sm:rounded-[7px] sm:px-3 sm:text-[13px] sm:text-text-secondary"
          onClick={onShare}
        >
          <ShareNetwork size={13} />
          Share
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-border px-4 text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:h-8 sm:w-8 sm:rounded-[7px] sm:px-0 sm:text-[13px]">
              <DotsThreeVertical size={14} weight="bold" />
              <span className="sm:hidden">Manage project</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="min-w-[200px] max-w-[calc(100vw-24px)] rounded-xl border border-border bg-white p-1.5 shadow-[0_6px_18px_rgba(26,26,46,0.08)]"
            >
              <DropdownMenu.Item
                onSelect={onEditName}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
              >
                Edit project name
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={onEditClient}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
              >
                Edit client
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={onAdjustTimeline}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
              >
                Adjust timeline
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={onEditPhases}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
              >
                Add or remove phases
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
              <DropdownMenu.Item
                onSelect={onTogglePaused}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none hover:bg-bg-subtle"
              >
                {project.status === "paused" ? "Resume project" : "Pause project"}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
              <DropdownMenu.Item
                onSelect={onDelete}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13px] text-destructive outline-none hover:bg-destructive/5"
              >
                Delete project
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </section>
  );
}
