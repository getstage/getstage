import type { ChangeEvent, RefObject } from "react";
import { basicDetailsFormSchema } from "@/models/project/createProject";
import {
  ContinueButton,
  CreateProjectStepShell,
  Field,
  FormCard,
  FormError,
  UploadIcon,
  inputSurfaceClassName,
  uploadButtonClassName,
} from "./CreateProjectPrimitives";
import { cn } from "@/lib/utils";

export function BasicDetailsStep({
  projectName,
  projectImageLabel,
  error,
  onProjectNameChange,
  onProjectImageFileChange,
  onPickProjectImage,
  onContinue,
  inputRef,
}: {
  projectName: string;
  projectImageLabel: string;
  error: string | null;
  onProjectNameChange: (value: string) => void;
  onProjectImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPickProjectImage: () => void;
  onContinue: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const canContinue = basicDetailsFormSchema.safeParse({ projectName }).success;

  return (
    <CreateProjectStepShell
      title="Create New Project"
      description="Let's set it up. This only takes a minute."
      activeStepIndex={0}
    >
      <form
        className="flex w-full flex-col items-start gap-[16px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Basic Details">
          <Field label="Project name">
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Baseframe"
              aria-label="Project name"
              className={inputSurfaceClassName}
            />
          </Field>

          <Field label="Project Image" secondaryLabel="(Optional)">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onProjectImageFileChange}
            />
            <button
              type="button"
              onClick={onPickProjectImage}
              className={cn(
                uploadButtonClassName,
                projectImageLabel !== "Upload image" ? "text-[#171717]" : "text-[#525252]",
              )}
            >
              <UploadIcon />
              <span className="min-w-0 truncate">{projectImageLabel}</span>
            </button>
          </Field>
        </FormCard>

        {error ? <FormError>{error}</FormError> : null}
        <ContinueButton disabled={!canContinue} />
      </form>
    </CreateProjectStepShell>
  );
}
