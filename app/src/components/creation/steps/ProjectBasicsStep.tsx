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
  startMarkerImage: string | null;
  endMarkerImage: string | null;
  clientMode: "existing" | "new";
  selectedExistingClientName: string;
  clientName: string;
  clientAvatar: string | null;
  existingClients: ExistingClient[];
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  startMarkerInputRef: RefObject<HTMLInputElement | null>;
  endMarkerInputRef: RefObject<HTMLInputElement | null>;
  onProjectNameChange: (value: string) => void;
  onStartMarkerImageChange: (value: string | null) => void;
  onEndMarkerImageChange: (value: string | null) => void;
  onClientAvatarChange: (value: string | null) => void;
  onStartMarkerFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEndMarkerFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClientModeChange: (value: "existing" | "new") => void;
  onExistingClientSelect: (clientName: string) => void;
  onClientNameChange: (value: string) => void;
  onContinue: () => void;
};

const NEW_CLIENT_VALUE = "__new__";

export function ProjectBasicsStep({
  projectName,
  startMarkerImage,
  endMarkerImage,
  clientMode,
  selectedExistingClientName,
  clientName,
  clientAvatar,
  existingClients,
  canContinue,
  currentIndex,
  steps,
  fileInputRef,
  startMarkerInputRef,
  endMarkerInputRef,
  onProjectNameChange,
  onStartMarkerImageChange,
  onEndMarkerImageChange,
  onClientAvatarChange,
  onStartMarkerFileChange,
  onEndMarkerFileChange,
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

      <div className="mb-5 space-y-4">
        <label className="block text-[13px] font-medium text-text-primary">
          Project marker images <span className="font-normal text-text-tertiary">- required</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProjectMarkerField
            label="Start marker image"
            imageUrl={startMarkerImage}
            inputRef={startMarkerInputRef}
            onFileChange={onStartMarkerFileChange}
            onRemove={() => onStartMarkerImageChange(null)}
          />
          <ProjectMarkerField
            label="End marker image"
            imageUrl={endMarkerImage}
            inputRef={endMarkerInputRef}
            onFileChange={onEndMarkerFileChange}
            onRemove={() => onEndMarkerImageChange(null)}
          />
        </div>
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

type ProjectMarkerFieldProps = {
  label: string;
  imageUrl: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

function ProjectMarkerField({
  label,
  imageUrl,
  inputRef,
  onFileChange,
  onRemove,
}: ProjectMarkerFieldProps) {
  return (
    <div className="rounded-[12px] border border-border-subtle bg-white p-3">
      <p className="mb-2 text-[13px] font-medium text-text-primary">{label}</p>
      <div className="relative h-[132px] overflow-hidden rounded-[12px] bg-input-bg">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-[13px] text-text-tertiary">
            Upload image
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
        >
          {imageUrl ? "Replace image" : "Upload image"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={!imageUrl}
          className="cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
        >
          Remove
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROJECT_MARKER_ACCEPT}
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
