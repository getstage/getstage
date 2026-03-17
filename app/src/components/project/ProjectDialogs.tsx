import { DeleteProjectDialog } from "@/components/project/dialogs/DeleteProjectDialog";
import { EditClientDialog } from "@/components/project/dialogs/EditClientDialog";
import { EditProjectDialog } from "@/components/project/dialogs/EditProjectDialog";
import { EditProjectPhasesDialog } from "@/components/project/dialogs/EditProjectPhasesDialog";
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
        clientAccess={share.clientAccess}
        onOpenChange={share.setOpen}
        onTogglePortalEnabled={() => void share.handleTogglePortalEnabled()}
        onCopyShareUrl={() => void share.handleCopyShareUrl()}
      />

      <EditProjectDialog
        open={dialogs.state.editName}
        projectName={dialogs.editNameValue}
        startMarkerImageUrl={dialogs.editStartMarkerDataUrl}
        endMarkerImageUrl={dialogs.editEndMarkerDataUrl}
        isSaving={dialogs.isSavingProject}
        onOpenChange={(open) => dialogs.setOpen("editName", open)}
        onProjectNameChange={dialogs.setEditNameValue}
        onStartMarkerInputChange={dialogs.handleStartMarkerInputChange}
        onEndMarkerInputChange={dialogs.handleEndMarkerInputChange}
        onRemoveStartMarker={dialogs.handleRemoveStartMarker}
        onRemoveEndMarker={dialogs.handleRemoveEndMarker}
        onSave={() => void dialogs.handleSaveProject()}
        startMarkerInputRef={dialogs.startMarkerInputRef}
        endMarkerInputRef={dialogs.endMarkerInputRef}
      />

      <EditClientDialog
        open={dialogs.state.editClient}
        clientName={dialogs.editClientValue}
        clientAvatarUrl={dialogs.editClientAvatarDataUrl}
        isSaving={dialogs.isSavingClient}
        onOpenChange={(open) => dialogs.setOpen("editClient", open)}
        onClientNameChange={dialogs.setEditClientValue}
        onAvatarInputChange={dialogs.handleClientAvatarInputChange}
        onRemoveAvatar={dialogs.handleRemoveClientAvatar}
        onSave={() => void dialogs.handleSaveClient()}
        avatarInputRef={dialogs.clientAvatarInputRef}
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
