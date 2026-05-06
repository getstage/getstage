import type { ChangeEvent, ReactNode, RefObject } from "react";
import { BackButton, PrimaryButton } from "@/components/creation/CreationChrome";
import { Avatar } from "@/components/ui/Avatar";
import { AVATAR_ACCEPT } from "@/lib/r2Uploads";
import type { WorkflowStep } from "@/hooks/useProjectCreation";

type ExistingClient = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  projectCount: number;
};

type ClientStepProps = {
  clientMode: "existing" | "new";
  selectedExistingClientName: string;
  clientName: string;
  clientEmail: string;
  clientAvatar: string | null;
  existingClients: ExistingClient[];
  canContinue: boolean;
  currentIndex: number;
  steps: WorkflowStep[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onClientModeChange: (value: "existing" | "new") => void;
  onExistingClientSelect: (clientName: string) => void;
  onClientNameChange: (value: string) => void;
  onClientEmailChange: (value: string) => void;
  onClientAvatarChange: (value: string | null) => void;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
  onBack: () => void;
};

const NEW_CLIENT_VALUE = "__new__";
const ICON_SRC = {
  download: "/logos/download.svg",
  dropdown: "/logos/dropdown.svg",
};

export function ClientStep({
  clientMode,
  selectedExistingClientName,
  clientName,
  clientEmail,
  clientAvatar,
  existingClients,
  canContinue,
  currentIndex: _currentIndex,
  steps: _steps,
  fileInputRef,
  onClientModeChange,
  onExistingClientSelect,
  onClientNameChange,
  onClientEmailChange,
  onClientAvatarChange,
  onAvatarFileChange,
  onContinue,
  onBack,
}: ClientStepProps) {
  const selectedClient =
    clientMode === "existing"
      ? existingClients.find((client) => client.name === selectedExistingClientName) ?? null
      : null;

  return (
    <div>
      <div className="mb-6">
        <SectionShell label="Client Details">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Who is this for?
            </label>
            <div className="relative">
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
                className="h-10 w-full appearance-none rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 pr-10 text-[12px] font-medium text-text-secondary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 focus:border-border focus:bg-white"
              >
                <option value={NEW_CLIENT_VALUE}>Create new client</option>
                {existingClients.map((client) => (
                  <option key={client.id} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
              <img
                src={ICON_SRC.dropdown}
                alt=""
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70"
              />
            </div>
          </div>

          {clientMode === "existing" && selectedClient ? (
            <div className="flex items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
              <Avatar name={selectedClient.name} src={selectedClient.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-text-primary">
                  {selectedClient.name}
                </p>
                <p className="text-[12px] text-text-secondary">
                  {selectedClient.projectCount} project{selectedClient.projectCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                Client Name
              </label>
              <input
                type="text"
                value={clientMode === "new" ? clientName : ""}
                onChange={(event) => onClientNameChange(event.target.value)}
                placeholder="Baseframe"
                className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-primary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client email
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(event) => onClientEmailChange(event.target.value)}
              placeholder="client@example.com"
              className="w-full rounded-[6px] border border-transparent bg-[#F5F5F5] px-3 py-2.5 text-[13px] font-medium text-text-primary shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none transition-all duration-200 placeholder:text-text-tertiary focus:border-border focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
              Client Photo
            </label>
            <div className="flex items-center gap-3">
              {clientAvatar ? (
                <Avatar
                  name={clientName || "Client"}
                  src={clientAvatar}
                  size="md"
                  className="shrink-0"
                />
              ) : null}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-[6px] bg-[#F5F5F5] px-3 py-2.5 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
              >
                <img src={ICON_SRC.download} alt="" className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-[13px] font-medium text-text-secondary">
                  {clientAvatar ? "Reupload" : "Upload Photo"}
                </span>
              </button>
              {clientAvatar ? (
                <button
                  type="button"
                  onClick={() => onClientAvatarChange(null)}
                  className="cursor-pointer bg-transparent p-0 text-[12px] font-medium text-destructive transition-colors hover:text-destructive/80"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={onAvatarFileChange}
            />
          </div>
        </SectionShell>
      </div>

      <PrimaryButton label="Continue" disabled={!canContinue} onClick={onContinue} />
      <BackButton onClick={onBack} />
    </div>
  );
}

function SectionShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
      <div className="px-4 pb-3 pt-3 text-[13px] font-semibold text-text-primary">{label}</div>
      <div className="space-y-4 rounded-[8px] bg-white p-4 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        {children}
      </div>
    </div>
  );
}
