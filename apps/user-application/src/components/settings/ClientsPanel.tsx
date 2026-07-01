import { useMemo, useState, type ReactNode } from "react";
import { useMutation } from "convex/react";
import { parseConvexId } from "@stage/data-ops";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useClientsQuery, type ClientSummary } from "@/hooks/convex-data/useClientsQuery";
import { api } from "@/lib/convexApi";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

type RenameDraft = { id: string; value: string };

export function ClientsPanel() {
  const clientsQuery = useClientsQuery();
  const clients = clientsQuery.data ?? [];
  const totalProjects = useMemo(
    () => clients.reduce((sum, client) => sum + client.projectCount, 0),
    [clients],
  );

  const renameClient = useMutation(api.clients.renameForCurrentUser);
  const deleteClient = useMutation(api.clients.deleteForCurrentUser);

  const [rename, setRename] = useState<RenameDraft | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<ClientSummary | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function submitRename() {
    if (!rename || busy) return;
    const clientId = parseConvexId<"clients">(rename.id);
    if (!clientId) {
      setError("This client can't be edited.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await renameClient({ clientId, name: rename.value });
      setRename(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not rename client.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const clientId = parseConvexId<"clients">(pendingDelete.id);
    if (!clientId) {
      setError("This client can't be deleted.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await deleteClient({ clientId });
      setPendingDelete(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete client.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title="Your clients">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage clients across all your projects. Renaming a client updates every project it is
        attached to. A client can only be deleted once no projects use it.
      </p>
      {error ? (
        <p className="mb-[8px] px-[12px] text-[12px] font-medium leading-[1.5] text-[#b91c1c]">{error}</p>
      ) : null}
      <div className="flex flex-col gap-[4px]">
        {clientsQuery.isLoading ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">Loading clients...</p>
          </SettingsRow>
        ) : null}
        {!clientsQuery.isLoading && clients.length === 0 ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
              No clients yet. Create a project with a client to see them here.
            </p>
          </SettingsRow>
        ) : null}
        {clients.map((client) => {
          const isRenaming = rename?.id === client.id;
          const isAttached = client.projectCount > 0;
          return (
            <SettingsRow key={client.id}>
              <div className="flex items-center justify-between gap-[18px]">
                <div className="flex min-w-0 flex-1 items-center gap-[12px]">
                  <Avatar name={client.name} src={client.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        value={rename.value}
                        onChange={(event) => setRename({ id: client.id, value: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") submitRename();
                          if (event.key === "Escape") setRename(undefined);
                        }}
                        autoFocus
                        aria-label={`Rename ${client.name}`}
                        className="h-[30px] w-full max-w-[260px] rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-[10px] text-[13px] font-medium leading-none text-[#171717] outline-none focus:border-[#8D87FF] focus:bg-white"
                      />
                    ) : (
                      <h3 className="truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
                        {client.name}
                      </h3>
                    )}
                    <p className="truncate text-[12px] font-normal leading-[1.5] text-[#404040]">
                      {client.email ?? "No email"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-[8px]">
                  <Badge
                    variant="accent"
                    className="rounded-[4px] bg-[#E7E6FD] px-[6px] py-[4px] text-[12px] font-normal leading-none text-[#221E6C]"
                  >
                    {client.projectCount} Project
                  </Badge>
                  {isRenaming ? (
                    <>
                      <SettingsActionButton onClick={submitRename} disabled={busy || !rename.value.trim()}>
                        {busy ? "Saving..." : "Save"}
                      </SettingsActionButton>
                      <SettingsActionButton onClick={() => setRename(undefined)} disabled={busy}>
                        Cancel
                      </SettingsActionButton>
                    </>
                  ) : (
                    <>
                      <SettingsActionButton
                        onClick={() => {
                          setError(undefined);
                          setRename({ id: client.id, value: client.name });
                        }}
                      >
                        Edit name
                      </SettingsActionButton>
                      <SettingsActionButton
                        variant="danger"
                        disabled={isAttached}
                        title={
                          isAttached
                            ? "Detach or delete this client's projects before deleting the client."
                            : "Delete client"
                        }
                        onClick={() => {
                          setError(undefined);
                          setPendingDelete(client);
                        }}
                      >
                        Delete
                      </SettingsActionButton>
                    </>
                  )}
                </div>
              </div>
            </SettingsRow>
          );
        })}
        <div className="px-[20px] py-[6px] text-[13px] text-[#525252]">
          <span className="font-medium text-[#0A0A0A]">{totalProjects}</span> Projects{" "}
          <span className="px-[16px] text-[#A3A3A3]">•</span>{" "}
          <span className="font-medium text-[#0A0A0A]">{clients.length}</span> Clients
        </div>
      </div>

      {pendingDelete ? (
        <DeleteClientDialog
          clientName={pendingDelete.name}
          isDeleting={busy}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </SettingsCard>
  );
}

function SettingsActionButton({
  children,
  onClick,
  disabled = false,
  title,
  variant = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "danger";
}) {
  const tone =
    variant === "danger"
      ? "text-[#b91c1c] hover:bg-[#FEF2F2]"
      : "text-[#171717] hover:bg-[#ECECEC]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-[6px] bg-[#F5F5F5] px-[12px] py-[6px] text-[12px] font-medium leading-none shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
    >
      {children}
    </button>
  );
}

function DeleteClientDialog({
  clientName,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  clientName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-[24px] backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-client-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[460px] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-[8px] bg-white p-[20px] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <h2 id="delete-client-title" className="text-[15px] font-semibold leading-none">
            Delete client
          </h2>
          <p className="mt-[8px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            Delete <span className="font-medium">{clientName}</span>? This removes the client record.
            It cannot be undone.
          </p>
          <div className="mt-[24px] flex items-center gap-[8px]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[6px] bg-[#F5F5F5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
              {isDeleting ? "Deleting..." : "Delete client"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
