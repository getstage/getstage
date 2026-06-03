import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import type { ExistingClientOption } from "@/models/project/createProject";
import { clientDetailsFormSchema } from "@/models/project/createProject";
import {
  ChevronDownIcon,
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

export function ClientDetailsStep({
  clientMode,
  selectedExistingClientId,
  existingClients,
  clientName,
  clientEmail,
  clientAvatar,
  hasPendingAvatarFile,
  error,
  onClientModeChange,
  onExistingClientSelect,
  onClientNameChange,
  onClientEmailChange,
  onAvatarFileChange,
  onClearAvatar,
  onPickClientPhoto,
  onContinue,
  inputRef,
}: {
  clientMode: string;
  selectedExistingClientId: string;
  existingClients: ExistingClientOption[];
  clientName: string;
  clientEmail: string;
  clientAvatar: string | null;
  hasPendingAvatarFile: boolean;
  error: string | null;
  onClientModeChange: (value: "new" | "existing") => void;
  onExistingClientSelect: (client: ExistingClientOption) => void;
  onClientNameChange: (value: string) => void;
  onClientEmailChange: (value: string) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearAvatar: () => void;
  onPickClientPhoto: () => void;
  onContinue: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const canContinue = clientDetailsFormSchema.safeParse({
    clientMode,
    clientName,
    clientEmail,
    hasClientPhoto: Boolean(hasPendingAvatarFile || clientAvatar?.trim()),
  }).success;

  return (
    <CreateProjectStepShell
      title="Client Details"
      description="Who is this project for?"
      activeStepIndex={1}
    >
      <form
        className="flex w-full flex-col items-start gap-[16px]"
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
      >
        <FormCard title="Client Details" titleWeight="semibold">
          <Field label="Who is this for?">
            <ClientPickerDropdown
              clientMode={clientMode}
              selectedExistingClientId={selectedExistingClientId}
              existingClients={existingClients}
              onClientModeChange={onClientModeChange}
              onExistingClientSelect={onExistingClientSelect}
            />
          </Field>

          <Field label="Client Name">
            <input
              value={clientName}
              onChange={(event) => onClientNameChange(event.target.value)}
              placeholder="BaseFrame"
              aria-label="Client name"
              className={inputSurfaceClassName}
            />
          </Field>

          <Field label="Client email">
            <input
              value={clientEmail}
              onChange={(event) => onClientEmailChange(event.target.value)}
              placeholder="client@example.com"
              type="email"
              aria-label="Client email"
              className={inputSurfaceClassName}
            />
          </Field>

          <Field label="Client Photo">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarFileChange}
            />

            {clientAvatar ? (
              <div className="flex w-full items-center gap-[8px]">
                <img
                  src={clientAvatar}
                  alt=""
                  className="h-[40px] w-[40px] shrink-0 rounded-full object-cover"
                />
                <div className="flex min-w-0 flex-1 items-center justify-between overflow-hidden rounded-[6px] px-[12px] py-[6px]">
                  <button
                    type="button"
                    onClick={onPickClientPhoto}
                    className="flex min-w-0 cursor-pointer items-center gap-[6px] text-[12px] font-medium leading-[1.25] text-[#525252] transition-colors hover:text-[#171717]"
                  >
                    <UploadIcon />
                    <span className="min-w-0 truncate">Reupload</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClearAvatar}
                    className="cursor-pointer text-[12px] font-medium leading-[1.25] text-[#ef4444] transition-colors hover:text-[#b91c1c]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onPickClientPhoto}
                className={uploadButtonClassName}
              >
                <UploadIcon />
                <span className="whitespace-nowrap">Upload Photo</span>
              </button>
            )}
          </Field>
        </FormCard>

        {error ? <FormError>{error}</FormError> : null}
        <ContinueButton disabled={!canContinue} />
      </form>
    </CreateProjectStepShell>
  );
}

function ClientPickerDropdown({
  clientMode,
  selectedExistingClientId,
  existingClients,
  onClientModeChange,
  onExistingClientSelect,
}: {
  clientMode: string;
  selectedExistingClientId: string;
  existingClients: ExistingClientOption[];
  onClientModeChange: (value: "new" | "existing") => void;
  onExistingClientSelect: (client: ExistingClientOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedClient = existingClients.find((client) => client.id === selectedExistingClientId);
  const label =
    clientMode === "existing" && selectedClient
      ? selectedClient.name
      : clientMode === "existing"
        ? "Select existing client"
        : "Create new client";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function chooseNewClient() {
    onClientModeChange("new");
    setOpen(false);
  }

  function chooseExistingClient(client: ExistingClientOption) {
    onExistingClientSelect(client);
    setOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(inputSurfaceClassName, "flex items-center cursor-pointer justify-between pr-[36px] text-left")}
      >
        <span className={cn("flex min-w-0 items-center gap-[8px]", selectedClient || clientMode === "new" ? "text-[#171717]" : "text-[#525252]")}>
          {selectedClient ? <ClientAvatar client={selectedClient} /> : null}
          <span className="min-w-0 truncate">
          {label}
          </span>
        </span>
      </button>
      <ChevronDownIcon />

      {open ? (
        <div
          role="listbox"
          aria-label="Client options"
          className="absolute left-0 top-[42px] z-30 w-full rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          <div className="rounded-[6px] bg-white p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <ClientPickerOption
              selected={clientMode === "new"}
              label="Create new client"
              onSelect={chooseNewClient}
            />
            <div className="my-[4px] h-px bg-[#E5E5E5]" />
            {existingClients.length > 0 ? (
              existingClients.map((client) => (
                <ClientPickerOption
                  key={client.id}
                  selected={clientMode === "existing" && selectedExistingClientId === client.id}
                  label={client.name}
                  description={client.email}
                  avatar={<ClientAvatar client={client} />}
                  onSelect={() => chooseExistingClient(client)}
                />
              ))
            ) : (
              <p className="px-[8px] py-[8px] text-[12px] font-medium leading-[1.5] text-[#737373]">
                No existing clients yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClientPickerOption({
  selected,
  label,
  description,
  avatar,
  onSelect,
}: {
  selected: boolean;
  label: string;
  description?: string;
  avatar?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-[34px] w-full cursor-pointer items-center gap-[8px] rounded-[6px] px-[8px] py-[6px] text-left outline-none transition-colors",
        selected ? "bg-[#F5F5F5]" : "hover:bg-[#F5F5F5]",
      )}
    >
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
          {label}
        </span>
        {description ? (
          <span className="mt-[2px] truncate text-[12px] font-medium leading-[1.25] text-[#737373]">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ClientAvatar({ client }: { client: ExistingClientOption }) {
  if (client.avatarUrl) {
    return (
      <img
        src={client.avatarUrl}
        alt=""
        aria-hidden="true"
        className="h-[20px] w-[20px] shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#171717] text-[10px] font-semibold uppercase text-white">
      {getClientInitial(client.name)}
    </span>
  );
}

function getClientInitial(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0] : "S";
}
