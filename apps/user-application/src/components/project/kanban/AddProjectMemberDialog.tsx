import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAction } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";

export function AddProjectMemberDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addCollaborator = useAction(api.collaborators.add);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await addCollaborator({
        projectId: projectId as Id<"projects">,
        email: normalizedEmail,
      });
      if (!result.inviteSent && result.inviteError) {
        setErrorMessage(result.inviteError);
        return;
      }
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not add this team member."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          onOpenChange(nextOpen);
          if (!nextOpen) setErrorMessage(null);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/10 backdrop-blur-[5px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_16px_48px_rgba(10,10,10,0.18)] outline-none">
          <div className="flex flex-col gap-5 rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-[15px] font-medium leading-[1.25] text-[#171717]">
                Add team member
              </Dialog.Title>
              <Dialog.Description className="text-[12px] font-medium leading-[1.5] text-[#737373]">
                Invite an existing Stage user to collaborate on this project.
              </Dialog.Description>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium leading-none text-[#171717]">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoFocus
                  disabled={isSubmitting}
                  className="h-[34px] rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium text-[#262626] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3] focus:bg-white focus:ring-1 focus:ring-[#8782F5] disabled:opacity-60"
                />
              </label>

              {errorMessage ? (
                <p className="text-[12px] font-medium leading-[1.5] text-[#DC2626]">{errorMessage}</p>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-8 items-center justify-center rounded-[6px] px-3 text-[12px] font-medium text-[#525252] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!email.trim() || isSubmitting}
                  className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 text-[12px] font-medium text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
