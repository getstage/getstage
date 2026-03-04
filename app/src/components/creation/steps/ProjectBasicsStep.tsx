import type { ChangeEvent, RefObject } from "react";
import { PrimaryButton, StepDots } from "@/components/creation/CreationChrome";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

type ProjectBasicsStepProps = {
  projectName: string;
  clientName: string;
  clientAvatar: string | null;
  avatarUrlOpen: boolean;
  avatarUrlInput: string;
  avatarFetching: boolean;
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onProjectNameChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onAvatarUrlOpenChange: (open: boolean) => void;
  onAvatarUrlInputChange: (value: string) => void;
  onClientAvatarChange: (value: string | null) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFetchAvatar: () => void;
  onContinue: () => void;
};

export function ProjectBasicsStep({
  projectName,
  clientName,
  clientAvatar,
  avatarUrlOpen,
  avatarUrlInput,
  avatarFetching,
  canContinue,
  currentIndex,
  steps,
  fileInputRef,
  onProjectNameChange,
  onClientNameChange,
  onAvatarUrlOpenChange,
  onAvatarUrlInputChange,
  onClientAvatarChange,
  onAvatarFileChange,
  onFetchAvatar,
  onContinue,
}: ProjectBasicsStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-heading text-[24px] font-semibold tracking-[-0.4px] text-text-primary">
        New project
      </h2>
      <p className="mb-8 text-center text-[15px] leading-[1.5] text-text-secondary">
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
          Client
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(event) => onClientNameChange(event.target.value)}
          placeholder="Acme Studio"
          className="w-full rounded-[10px] border border-transparent bg-input-bg px-4 py-3 text-[15px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
        />
      </div>

      <div className="mb-0">
        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
          Client photo <span className="font-normal text-text-tertiary">- optional</span>
        </label>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-input-bg">
          {clientAvatar ? (
            <img src={clientAvatar} alt="Client" className="h-full w-full object-cover" />
          ) : (
            <UserIcon />
          )}
          {clientAvatar ? (
            <button
              type="button"
              onClick={() => onClientAvatarChange(null)}
              className="absolute right-[-4px] top-[-4px] flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-2 border-white bg-text-secondary text-[11px] leading-none text-white transition-colors hover:bg-text-primary"
              aria-label="Remove avatar"
            >
              &times;
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
          >
            Upload photo
          </button>
          <button
            type="button"
            onClick={() => onAvatarUrlOpenChange(!avatarUrlOpen)}
            className="cursor-pointer bg-transparent p-0 text-left text-[13px] text-text-secondary transition-colors hover:text-accent"
          >
            Import from URL
          </button>

          {avatarUrlOpen ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={avatarUrlInput}
                onChange={(event) => onAvatarUrlInputChange(event.target.value)}
                placeholder="Paste LinkedIn or website URL..."
                className="rounded-md border border-transparent bg-input-bg px-2.5 py-1.5 text-[13px] text-text-primary outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
              />
              <button
                type="button"
                onClick={onFetchAvatar}
                className="cursor-pointer whitespace-nowrap rounded-md border border-[rgba(135,130,245,0.2)] bg-[rgba(135,130,245,0.08)] px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-[rgba(135,130,245,0.15)]"
              >
                {avatarFetching ? "..." : "Fetch"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onAvatarFileChange}
      />

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <StepDots steps={steps} currentIndex={currentIndex} />
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-tertiary"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
