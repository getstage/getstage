import { DeleteProjectDialog } from "@/components/project/dialogs/DeleteProjectDialog";
import { EditProjectPhasesDialog } from "@/components/project/dialogs/EditProjectPhasesDialog";
import { EditProjectTextDialog } from "@/components/project/dialogs/EditProjectTextDialog";
import { EditProjectTimelineDialog } from "@/components/project/dialogs/EditProjectTimelineDialog";
import { ShareProjectDialog } from "@/components/project/dialogs/ShareProjectDialog";
import type {
  ProjectDialogController,
  ProjectShareController,
} from "@/features/project-detail/controllers";
import type { Project } from "@/types";

type ProjectDialogsProps = {
  project: Project;
  dialogs: ProjectDialogController;
  share: ProjectShareController;
};

export function ProjectDialogs({ project, dialogs, share }: ProjectDialogsProps) {
  return (
    <>
      <ShareProjectDialog
        open={share.open}
        shareUrl={share.shareUrl}
        copied={share.copied}
        onOpenChange={share.setOpen}
        onCopyShareUrl={() => void share.handleCopyShareUrl()}
      />

      <EditProjectTextDialog
        open={dialogs.state.editName}
        title="Edit project name"
        value={dialogs.editNameValue}
        onOpenChange={(open) => dialogs.setOpen("editName", open)}
        onValueChange={dialogs.setEditNameValue}
        onSave={() => void dialogs.handleSaveProjectName()}
      />

      <EditProjectTextDialog
        open={dialogs.state.editClient}
        title="Edit client"
        value={dialogs.editClientValue}
        onOpenChange={(open) => dialogs.setOpen("editClient", open)}
        onValueChange={dialogs.setEditClientValue}
        onSave={() => void dialogs.handleSaveClient()}
      />

      <EditProjectTimelineDialog
        open={dialogs.state.editTimeline}
        startDate={dialogs.editStartDate}
        endDate={dialogs.editEndDate}
        onOpenChange={(open) => dialogs.setOpen("editTimeline", open)}
        onStartDateChange={dialogs.setEditStartDate}
        onEndDateChange={dialogs.setEditEndDate}
        onSave={() => void dialogs.handleSaveTimeline()}
      />

      <EditProjectPhasesDialog
        open={dialogs.state.editPhases}
        value={dialogs.editPhasesValue}
        onOpenChange={(open) => dialogs.setOpen("editPhases", open)}
        onValueChange={dialogs.setEditPhasesValue}
        onSave={() => void dialogs.handleSavePhases()}
      />

      <DeleteProjectDialog
        open={dialogs.state.deleteConfirm}
        projectName={project.name}
        onOpenChange={(open) => dialogs.setOpen("deleteConfirm", open)}
        onConfirm={() => void dialogs.handleConfirmDeleteProject()}
      />
    </>
  );
}
