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
    <section className="text-center">
      <div className="mx-auto flex max-w-[760px] flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-input-bg sm:h-16 sm:w-16">
          {project.clientAvatarUrl ? (
            <img
              src={project.clientAvatarUrl}
              alt={project.clientName}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <h1 className="mt-5 max-w-[720px] text-balance font-heading text-[30px] font-semibold tracking-[-0.5px] text-text-primary sm:text-[42px]">
          {project.name}
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary sm:text-[16px]">
          {project.clientName}
        </p>

        <div className="mt-6 w-full max-w-[260px] sm:max-w-[300px]">
          <ProgressBar value={project.progress} showLabel className="w-full" />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onShare}
        >
          <ShareNetwork size={13} />
          Share
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-border px-4 text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:h-11 sm:w-auto">
              <DotsThreeVertical size={14} weight="bold" />
              Manage project
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="center"
              sideOffset={6}
              className="min-w-[220px] max-w-[calc(100vw-24px)] rounded-xl border border-border bg-white p-1.5 shadow-[0_6px_18px_rgba(26,26,46,0.08)]"
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
