import * as Dialog from "@radix-ui/react-dialog";
import type { ProviderId } from "@stage/data-ops/contracts";
import type { ResearchConfigureFormValues } from "@/lib/project/researchConfigureInput";
import type { ValidatedResearchConfigureInput } from "@/lib/project/researchConfigureInput";
import { ResearchConfigureStep } from "./tabs/research/ResearchConfigureStep";

type ResearchRerunDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: ResearchConfigureFormValues;
  isSubmitting: boolean;
  onBriefFileChange?: (file: File | null) => void;
  onClearBriefAttachment?: () => void;
  onSubmit: (input: ValidatedResearchConfigureInput, providerId: ProviderId) => void;
};

export function ResearchRerunDialog({
  open,
  onOpenChange,
  initialValues,
  isSubmitting,
  onBriefFileChange,
  onClearBriefAttachment,
  onSubmit,
}: ResearchRerunDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(90vh,920px)] w-[calc(100vw-24px)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] outline-none">
          <Dialog.Title className="sr-only">Re-run research</Dialog.Title>
          <ResearchConfigureStep
            isSubmitting={isSubmitting}
            initialValues={initialValues}
            onBriefFileChange={onBriefFileChange}
            onClearBriefAttachment={onClearBriefAttachment}
            onSubmit={(input, providerId) => {
              onSubmit(input, providerId);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            title="Re-run research"
            description="Update project context, then replace the saved research. Strategy will be reset and must be regenerated."
            submitLabel="Replace research & run"
            submitVariant="secondary"
            warningMessage="This replaces the current research artifact and clears strategy. Moodboard, flows, and wireframes stay unless you clear them after the run."
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
