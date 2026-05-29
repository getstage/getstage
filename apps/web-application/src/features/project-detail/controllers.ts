import type { ChangeEvent, RefObject } from "react";
import type { Id } from "@stage/data-ops/convex/data-model";

export type ProjectDialogKey =
  | "editName"
  | "editClient"
  | "editTimeline"
  | "editPhases"
  | "deleteConfirm";

export type ProjectDialogState = Record<ProjectDialogKey, boolean>;

export type ProjectDialogController = {
  state: ProjectDialogState;
  editNameValue: string;
  editProjectImageDataUrl: string | null;
  editClientValue: string;
  editClientAvatarDataUrl: string | null;
  editStartDate: string;
  editEndDate: string;
  editPhasesValue: string;
  isSavingProject: boolean;
  isSavingClient: boolean;
  projectImageInputRef: RefObject<HTMLInputElement | null>;
  clientAvatarInputRef: RefObject<HTMLInputElement | null>;
  setOpen: (dialog: ProjectDialogKey, open: boolean) => void;
  openEditNameDialog: () => void;
  openEditClientDialog: () => void;
  openTimelineDialog: () => void;
  openPhasesDialog: () => void;
  setEditNameValue: (value: string) => void;
  handleProjectImageInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveProjectImage: () => void;
  setEditClientValue: (value: string) => void;
  handleClientAvatarInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveClientAvatar: () => void;
  setEditStartDate: (value: string) => void;
  setEditEndDate: (value: string) => void;
  setEditPhasesValue: (value: string) => void;
  handleSaveProject: () => Promise<void>;
  handleSaveClient: () => Promise<void>;
  handleSaveTimeline: () => Promise<void>;
  handleSavePhases: () => Promise<void>;
  handleToggleProjectPaused: () => Promise<void>;
  handleConfirmDeleteProject: () => Promise<void>;
};

export type ProjectShareController = {
  open: boolean;
  setOpen: (open: boolean) => void;
  shareUrl: string;
  copied: boolean;
  handleCopyShareUrl: () => Promise<void>;
};

export type ProjectTaskController = {
  addTaskInputRef: RefObject<HTMLInputElement | null>;
  showAddTask: boolean;
  addTaskValue: string;
  setShowAddTask: (value: boolean) => void;
  setAddTaskValue: (value: string) => void;
  handleAddTaskSubmit: () => Promise<void>;
  handleToggleTask: (taskId: Id<"tasks">) => Promise<void>;
  handleDeleteTask: (taskId: Id<"tasks">) => Promise<void>;
};
