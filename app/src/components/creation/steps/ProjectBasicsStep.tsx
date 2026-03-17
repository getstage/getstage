import type { ChangeEvent, RefObject } from "react";
import { PrimaryButton, StepDots } from "@/components/creation/CreationChrome";
import { Avatar } from "@/components/ui/Avatar";
import { PROJECT_MARKER_ACCEPT } from "@/lib/r2Uploads";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

type ExistingClient = {
  id: string;
  name: string;
  avatarUrl?: string;
  projectCount: number;
};

type ProjectBasicsStepProps = {
  projectName: string;
  projectImage: string | null;
  clientMode: "existing" | "new";
  selectedExistingClientName: string;
  clientName: string;
  clientAvatar: string | null;
  existingClients: ExistingClient[];
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  projectImageInputRef: RefObject<HTMLInputElement | null>;
  onProjectNameChange: (value: string) => void;
  onProjectImageChange: (value: string | null) => void;
  onClientAvatarChange: (value: string | null) => void;
  onProjectImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClientModeChange: (value: "existing" | "new") => void;
  onExistingClientSelect: (clientName: string) => void;
  onClientNameChange: (value: string) => void;
  onContinue: () => void;
};

const NEW_CLIENT_VALUE = "__new__";

export function ProjectBasicsStep({
  projectName,
  projectImage,
  clientMode,
  selectedExistingClientName,
  clientName,
  clientAvatar,
  existingClients,
  canContinue,
  currentIndex,
  steps,
  fileInputRef,
  projectImageInputRef,
  onProjectNameChange,
  onProjectImageChange,
  onClientAvatarChange,
  onProjectImageFileChange,
  onAvatarFileChange,
  onClientModeChange,
  onExistingClientSelect,
  onClientNameChange,
  onContinue,
}: ProjectBasicsStepProps) {
  const selectedClient =
    clientMode === "existing"
      ? existingClients.find((client) => client.name === selectedExistingClientName) ?? null
      : null;

  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        New project
      </h2>
      <p className="mb-8 text-center text-[15px] leading-normal text-text-secondary">
        Let&apos;s set it up. This only takes a minute.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Project name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Website Redesign"
          autoFocus
          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
        />
      </div>

      <div className="mb-5">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Project image <span className="font-normal text-text-tertiary">- required</span>
        </label>

        <div className="flex items-center gap-4 rounded-[12px] border border-border-subtle bg-white px-4 py-4">
          <div className="shrink-0">
            {projectImage ? (
              <img
                src={projectImage}
                alt="Project"
                className="h-12 w-12 rounded-full border border-border-subtle object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-input-bg text-[11px] text-text-tertiary">
                IMG
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => projectImageInputRef.current?.click()}
              className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
            >
              {projectImage ? "Replace photo" : "Upload photo"}
            </button>
            <button
              type="button"
              onClick={() => onProjectImageChange(null)}
              disabled={!projectImage}
              className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          ref={projectImageInputRef}
          type="file"
          accept={PROJECT_MARKER_ACCEPT}
          className="hidden"
          onChange={onProjectImageFileChange}
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Client
        </label>
        <select
          value={clientMode === "existing" ? selectedExistingClientName : NEW_CLIENT_VALUE}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === NEW_CLIENT_VALUE) {
              onClientModeChange("new");
              return;
            }

            onExistingClientSelect(nextValue);
          }}
          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 focus:border-border focus:bg-white"
        >
          <option value={NEW_CLIENT_VALUE}>Create a new client</option>
          {existingClients.map((client) => (
            <option key={client.id} value={client.name}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {clientMode === "existing" && selectedClient ? (
        <div className="mb-6 flex items-center gap-3 rounded-[12px] border border-border-subtle bg-bg-subtle px-3 py-3">
          <Avatar
            name={selectedClient.name}
            src={selectedClient.avatarUrl}
            size="md"
            className="border border-border-subtle"
          />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-text-primary">
              {selectedClient.name}
            </p>
            <p className="text-[12px] text-text-secondary">
              {selectedClient.projectCount} project{selectedClient.projectCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
            New client name
          </label>
          <input
            type="text"
            value={clientMode === "new" ? clientName : ""}
            onChange={(event) => onClientNameChange(event.target.value)}
            placeholder="Acme Studio"
            className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
          />
        </div>
      )}

      <div className="mb-6">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Client photo <span className="font-normal text-text-tertiary">- optional</span>
        </label>

        <div className="flex items-center gap-4 rounded-[12px] border border-border-subtle bg-white px-4 py-4">
          <div className="shrink-0">
            <Avatar
              name={clientMode === "existing" ? selectedExistingClientName || clientName : clientName || "Client"}
              src={clientAvatar ?? undefined}
              size="lg"
              className="border border-border-subtle"
            />
          </div>

          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
            >
              {clientAvatar ? "Replace photo" : "Upload photo"}
            </button>
            <button
              type="button"
              onClick={() => onClientAvatarChange(null)}
              disabled={!clientAvatar}
              className="block cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarFileChange}
        />
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <StepDots steps={steps} currentIndex={currentIndex} />
    </div>
  );
}
