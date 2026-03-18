import { useEffect, useState } from "react";
import { Check, LinkSimple, Lock, Trash, UserPlus } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAction, useQuery as useConvexQuery, useMutation } from "convex/react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/convex";
import { useAuth } from "@/lib/auth";
import type { Id } from "../../../../convex/_generated/dataModel";

type ShareProjectDialogProps = {
  open: boolean;
  shareUrl: string;
  copied: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onCopyShareUrl: () => void;
};

function toUserFriendlyAddError(message: string) {
  switch (message) {
    case "Active Stage subscription required to invite collaborators.":
      return "Upgrade to Stage Pro to add team members.";
    case "This user needs an active Stage subscription before they can collaborate.":
      return "This person needs an active Stage subscription before they can collaborate.";
    case "No user found with that email address.":
      return "This person needs a Stage account before they can collaborate.";
    case "This user is already a collaborator on this project.":
      return "This person is already a team member on this project.";
    case "You are already the owner of this project.":
      return "You already own this project.";
    default:
      return message;
  }
}

export function ShareProjectDialog({
  open,
  shareUrl,
  copied,
  projectId,
  onOpenChange,
  onCopyShareUrl,
}: ShareProjectDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const isPro = user?.plan === "pro";

  const collaborators = useConvexQuery(
    api.collaborators.listByProject,
    open ? { projectId: projectId as Id<"projects"> } : "skip",
  );
  const addCollaborator = useAction(api.collaborators.add);
  const removeCollaborator = useMutation(api.collaborators.remove);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setAddError("");
      setAddSuccess("");
    }
  }, [open]);

  async function handleAddCollaborator(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || isAdding) return;

    setAddError("");
    setAddSuccess("");
    setIsAdding(true);
    try {
      const result = await addCollaborator({
        projectId: projectId as Id<"projects">,
        email: trimmed,
      });
      setEmail("");

      if (result.inviteSent) {
        setAddSuccess("Invite sent.");
      } else {
        setAddError(
          result.inviteError ??
            "Team member added, but the invite email could not be sent.",
        );
      }
    } catch (error) {
      let message = "Failed to add team member. Please try again.";
      if (error instanceof Error) {
        const match = error.message.match(/Uncaught Error:\s*(.+?)(?:\.\s*at\s|$)/);
        if (match?.[1]) {
          message = toUserFriendlyAddError(match[1].trim());
          if (!message.endsWith(".")) message += ".";
        }
      }
      setAddError(message);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(collaboratorId: string) {
    try {
      await removeCollaborator({
        projectId: projectId as Id<"projects">,
        collaboratorId: collaboratorId as Id<"projectCollaborators">,
      });
    } catch {
      // Silently handle — record may already be deleted
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[470px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border border-border-subtle bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="px-6 py-6">
            <Dialog.Title className="font-heading text-[22px] font-semibold tracking-[-0.3px] text-text-primary">
              Share with client
            </Dialog.Title>
            <p className="mt-1 text-[14px] leading-7 text-text-secondary">
              Clients can view progress, phases, and tasks. They cannot edit anything.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-[13px] font-medium text-text-primary">
                Client portal link
              </label>

              <div className="flex items-center gap-3 rounded-[10px] border border-border bg-bg px-3">
                <LinkSimple size={18} className="shrink-0 text-text-secondary" />
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                  spellCheck={false}
                  className="share-project-dialog-input h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-text-primary"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <label className="block text-[13px] font-medium text-text-primary">
                  Team members
                </label>
                {!isPro ? (
                  <button
                    type="button"
                    onClick={() => window.location.assign("/settings?tab=billing")}
                    className="inline-flex items-center gap-1 rounded-full border border-[#d8d4ff] bg-[#f4f2ff] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent transition-colors hover:border-[#c8c1ff] hover:bg-[#ece9ff]"
                  >
                    <Lock size={11} weight="duotone" aria-hidden="true" />
                    Pro
                  </button>
                ) : null}
              </div>
              <p className="mb-3 text-[13px] text-text-secondary">
                Team members with an active subscription can open this project in the Stage workspace and collaborate there.
              </p>

              <div
                className={`rounded-[12px] border px-3 py-3 ${
                  isPro
                    ? "border-border-subtle bg-transparent"
                    : "border-[#f4c7c3] bg-[#fff7f6]"
                }`}
              >
                <form onSubmit={handleAddCollaborator} className="flex items-center gap-2">
                  <div
                    className={`flex flex-1 items-center gap-2 rounded-[10px] border px-3 ${
                      isPro
                        ? "border-border bg-bg"
                        : "border-border-subtle bg-white/70 opacity-70"
                    }`}
                  >
                    <UserPlus size={16} className="shrink-0 text-text-secondary" />
                    <input
                      type="email"
                      placeholder={
                        isPro ? "Enter email address" : "Upgrade to unlock team member invites"
                      }
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setAddError("");
                        setAddSuccess("");
                      }}
                      disabled={!isPro}
                      className="h-10 min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={!isPro || isAdding || !email.trim()}>
                    Add
                  </Button>
                </form>

                {!isPro ? (
                  <p className="mt-2 text-[12px] leading-5 text-destructive">
                    Upgrade to Stage Pro to add team members. The invited person also needs an
                    active Stage subscription before they can collaborate.
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] leading-5 text-text-secondary">
                    Both you and the invited person need an active Stage subscription to
                    collaborate.
                  </p>
                )}
              </div>

              {addError ? (
                <p className="mt-1.5 text-[12px] text-destructive">{addError}</p>
              ) : null}
              {addSuccess ? (
                <p className="mt-1.5 text-[12px] text-accent">{addSuccess}</p>
              ) : null}

              {collaborators && collaborators.length > 0 ? (
                <div className="mt-3 space-y-1">
                  {collaborators.map((collab) => (
                    <div
                      key={collab._id}
                      className="flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-bg-subtle"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-subtle text-[12px] font-medium text-text-secondary">
                        {(collab.name ?? collab.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-text-primary">
                          {collab.name ?? "Unknown"}
                        </p>
                        <p className="truncate text-[12px] text-text-secondary">
                          {collab.email ?? ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemove(collab._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-destructive"
                        aria-label={`Remove ${collab.name ?? collab.email}`}
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-6 py-4">
            <p className="text-[13px] text-text-secondary">
              Anyone with the link can view the portal.
            </p>

            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button size="sm" variant="ghost">
                  Done
                </Button>
              </Dialog.Close>

              <Button size="sm" onClick={onCopyShareUrl}>
                {copied ? (
                  <>
                    <Check size={12} />
                    Copied
                  </>
                ) : (
                  "Copy"
                )}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
