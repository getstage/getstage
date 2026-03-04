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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 overflow-hidden rounded-full bg-input-bg">
          {project.clientAvatarUrl ? (
            <img
              src={project.clientAvatarUrl}
              alt={project.clientName}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <h1 className="font-heading text-[22px] font-medium tracking-[-0.3px] text-text-primary">
          {project.name}
        </h1>
        <span className="text-[16px] text-text-secondary">· {project.clientName}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="w-[100px]">
          <ProgressBar value={project.progress} showLabel />
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="h-8 rounded-[7px] px-3 text-[13px] text-text-secondary"
          onClick={onShare}
        >
          <ShareNetwork size={13} />
          Share
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[7px] border border-border text-text-secondary transition-colors hover:text-text-primary">
              <DotsThreeVertical size={14} weight="bold" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="min-w-[200px] rounded-xl border border-border bg-white p-1.5 shadow-[0_6px_18px_rgba(26,26,46,0.08)]"
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
    </div>
  );
}
