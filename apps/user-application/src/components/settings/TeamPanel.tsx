import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAction, useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { openExternalLink } from "@/lib/settings/openExternalLink";
import { inviteTeamMemberSchema } from "@/lib/validation";
import {
  useSettingsOverviewQuery,
  useWorkspaceInvitesQuery,
  useWorkspaceMembersQuery,
} from "@/hooks/convex-data";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";
import { useActiveSpace } from "@/hooks/workspace/useActiveSpace";
import { WorkspaceSpaceSelect } from "@/components/dashboard/sidebar/SidebarSpaceSelect";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isOwner: boolean;
};

export function TeamPanel() {
  const overview = useSettingsOverviewQuery();
  const { spaces, activeId } = useActiveSpace();
  const activeSpace = spaces.find((space) => space.ownerUserId === activeId) ?? spaces[0];
  const profile = overview.data?.profile;
  const members = useWorkspaceMembersQuery(activeSpace?.ownerUserId);
  const invites = useWorkspaceInvitesQuery(activeSpace?.ownerUserId);
  const addMember = useAction(api.workspaceMembers.add);
  const createCustomerPortalSession = useAction(api.billing.createCustomerPortalSession);
  const resendInvite = useAction(api.workspaceMembers.resend);
  const removeMember = useMutation(api.workspaceMembers.remove);
  const revokeInvite = useMutation(api.workspaceMembers.revoke);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const rows = useMemo<TeamMember[] | undefined>(() => {
    if (members.data === undefined) {
      return undefined;
    }

    const isMember = activeSpace?.role === "member";
    const owner: TeamMember = {
      id: activeSpace?.ownerUserId ?? "current-user",
      name: isMember
        ? (activeSpace?.name || "Workspace owner")
        : (profile?.name ?? activeSpace?.name ?? "You"),
      email: isMember ? (activeSpace?.email ?? "") : (profile?.email ?? activeSpace?.email ?? ""),
      avatarUrl: isMember ? activeSpace?.avatarUrl : (profile?.avatarUrl ?? activeSpace?.avatarUrl),
      isOwner: true,
    };
    const invited = members.data.map<TeamMember>((member) => ({
      id: member._id,
      name: member.name ?? member.email ?? "Team member",
      email: member.email ?? "",
      avatarUrl: member.avatarUrl ?? undefined,
      isOwner: false,
    }));
    return [owner, ...invited];
  }, [activeSpace, members.data, profile?.avatarUrl, profile?.email, profile?.name]);

  const seatLimit = overview.data?.workspace?.seats ?? overview.data?.subscription?.seats ?? 1;
  const isSolo = overview.data?.subscription?.plan === "start";
  const signedInEmail = profile?.email?.trim().toLowerCase() ?? "";
  const isWorkspaceOwner =
    activeSpace?.role === "owner" ||
    (signedInEmail.length > 0 && activeSpace?.email.trim().toLowerCase() === signedInEmail);
  const seatsLeft =
    rows && invites.data
      ? Math.max(0, seatLimit - rows.length - (isWorkspaceOwner ? invites.data.length : 0))
      : 0;

  const emailInput = inviteEmail.trim();
  const emailValidation = inviteTeamMemberSchema.safeParse({ email: emailInput });
  const isEmailValid = emailInput.length > 0 && emailValidation.success;
  const isEmailInvalid = emailInput.length > 0 && !emailValidation.success;
  const emailErrorMessage = isEmailInvalid
    ? emailValidation.error.issues[0]?.message ?? "Please enter a valid email address."
    : null;
  const canInvite =
    isWorkspaceOwner && rows !== undefined && seatsLeft > 0 && isEmailValid && !isSubmitting;

  async function inviteMember() {
    if (!canInvite || isSolo) return;
    const email = emailInput;
    setIsSubmitting(true);
    setNotice(null);
    setErrorMessage(null);
    try {
      const result = await addMember({ email });
      setInviteEmail("");
      setInviteOpen(false);
      setNotice(
        result.inviteSent
          ? `Invitation sent to ${email}. They can create an account from the link.`
          : result.inviteError ?? "Invitation created, but the email could not be sent.",
      );
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not add this team member."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openUpgradePortal() {
    if (upgradeLoading) return;
    setUpgradeLoading(true);
    setUpgradeError(null);
    try {
      const { url } = await createCustomerPortalSession({ platform: "desktop" });
      if (!url) throw new Error("Subscription portal URL missing.");
      await openExternalLink(url);
      setUpgradeOpen(false);
    } catch (error) {
      setUpgradeError(toUserFacingErrorMessage(error, "Could not open subscription management."));
    } finally {
      setUpgradeLoading(false);
    }
  }

  async function resendPendingInvite(inviteId: string, email: string) {
    setNotice(null);
    setErrorMessage(null);
    setPendingActionId(inviteId);
    try {
      const result = await resendInvite({ inviteId: inviteId as Id<"workspaceInvites"> });
      if (!result.inviteSent) {
        setErrorMessage(result.inviteError ?? "The invitation email could not be sent.");
        return;
      }
      setNotice(`Invitation resent to ${email}.`);
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not resend this invitation."));
    } finally {
      setPendingActionId(null);
    }
  }

  async function revokePendingInvite(inviteId: string) {
    setNotice(null);
    setErrorMessage(null);
    setPendingActionId(inviteId);
    try {
      await revokeInvite({ inviteId: inviteId as Id<"workspaceInvites"> });
      setNotice("Invitation revoked.");
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not revoke this invitation."));
    } finally {
      setPendingActionId(null);
    }
  }

  async function removeTeamMember(memberId: string) {
    setNotice(null);
    setErrorMessage(null);
    setRemovingId(memberId);
    try {
      await removeMember({ memberId: memberId as Id<"projectCollaborators"> });
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not remove this team member."));
    } finally {
      setRemovingId(null);
    }
  }


  return (
    <SettingsCard>
      <div className="flex items-start justify-between gap-[16px] px-[12px] pb-[12px] pt-[8px]">
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium leading-none text-[#171717]">Team Members</h2>
          <p className="mt-[6px] text-[12px] font-normal leading-[1.5] text-[#737373]">
            Manage members in your workspace
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[8px]">
          <WorkspaceSpaceSelect hideWhenSingle={false} className="w-[220px]" />
          {isWorkspaceOwner ? (
            <button
              type="button"
              onClick={() => {
                if (overview.data === undefined) return;
                if (isSolo) {
                  setInviteOpen(false);
                  setUpgradeError(null);
                  setUpgradeOpen(true);
                } else {
                  setInviteOpen((open) => !open);
                }
              }}
              disabled={overview.data === undefined}
              className="inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] bg-[#171717] px-[12px] text-[12px] font-medium leading-none text-white"
            >
              + Invite Member
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-[4px]">
        {inviteOpen && isWorkspaceOwner && !isSolo ? (
          <SettingsRow>
            <div className="flex min-w-0 flex-col gap-[8px] sm:flex-row sm:items-center">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                  setNotice(null);
                  setErrorMessage(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canInvite) void inviteMember();
                }}
                disabled={seatsLeft <= 0 || isSubmitting}
                placeholder="name@company.com"
                aria-label="Invite member email"
                aria-invalid={isEmailInvalid}
                autoFocus
                className="h-[30px] min-w-0 flex-1 rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void inviteMember()}
                disabled={!canInvite}
                className="inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] bg-[#171717] px-[12px] text-[12px] font-medium leading-none text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Sending…" : "Send invite"}
              </button>
            </div>
            {seatsLeft <= 0 ? (
              <p className="mt-[10px] text-[12px] font-medium leading-[1.5] text-[#525252]">
                All team seats are used.
              </p>
            ) : null}
            {emailErrorMessage ? <p className="mt-[10px] text-[12px] font-medium leading-[1.5] text-[#b91c1c]">{emailErrorMessage}</p> : null}
          </SettingsRow>
        ) : null}
        {notice ? <p className="px-[12px] text-[12px] font-medium leading-[1.5] text-[#166534]">{notice}</p> : null}
        {errorMessage ? <p className="px-[12px] text-[12px] font-medium leading-[1.5] text-[#b91c1c]">{errorMessage}</p> : null}

        {members.isLoading || invites.isLoading ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">Loading team members…</p>
          </SettingsRow>
        ) : (
          <>
            {rows?.map((member) => {
              const isSelf =
                Boolean(signedInEmail) && member.email.trim().toLowerCase() === signedInEmail;
              const canRemove = isWorkspaceOwner && !member.isOwner && !isSelf;
              return (
                <SettingsRow key={member.id}>
                  <div className="flex items-center justify-between gap-[16px]">
                    <div className="flex min-w-0 items-center gap-[12px]">
                      <Avatar name={member.name} src={member.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <h3 className="truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{member.name}</h3>
                        <p className="truncate text-[12px] font-normal leading-[1.5] text-[#737373]">{member.email}</p>
                      </div>
                    </div>
                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => void removeTeamMember(member.id)}
                        disabled={removingId === member.id}
                        className="inline-flex h-[26px] shrink-0 items-center rounded-[6px] bg-[#FFF1F2] px-[10px] text-[12px] font-medium leading-none text-[#E11D48] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === member.id ? "Removing…" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </SettingsRow>
              );
            })}
            {invites.data?.map((invite) => (
              <SettingsRow key={invite._id}>
                <div className="flex items-center justify-between gap-[16px]">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">
                      {invite.email}
                    </h3>
                    <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">Pending</p>
                  </div>
                  {isWorkspaceOwner ? (
                    <div className="flex shrink-0 items-center gap-[12px]">
                      <button
                        type="button"
                        onClick={() => void resendPendingInvite(invite._id, invite.email)}
                        disabled={pendingActionId === invite._id}
                        className="text-[13px] font-medium leading-none text-[#525252] disabled:opacity-50"
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => void revokePendingInvite(invite._id)}
                        disabled={pendingActionId === invite._id}
                        className="text-[13px] font-medium leading-none text-[#E11D48] disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : null}
                </div>
              </SettingsRow>
            ))}
          </>
        )}
      </div>
      <Dialog.Root open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] bg-white p-[20px] shadow-xl outline-none">
            <Dialog.Title className="text-[18px] font-semibold text-[#171717]">Invite your team</Dialog.Title>
            <Dialog.Description className="mt-[6px] text-[13px] text-[#525252]">
              Solo includes one seat. Choose a team plan to invite members to your workspace.
            </Dialog.Description>
            <div className="mt-[20px] grid gap-[10px] sm:grid-cols-2">
              <div className="rounded-[8px] border border-[#E5E5E5] p-[14px]">
                <h3 className="text-[15px] font-semibold">Studio</h3>
                <p className="mt-[6px] text-[13px] text-[#525252]">5 seats · 10,000 pooled AI credits/month</p>
                <p className="mt-[12px] text-[13px] font-medium">$99/month</p>
              </div>
              <div className="rounded-[8px] border border-[#E5E5E5] p-[14px]">
                <h3 className="text-[15px] font-semibold">Agency</h3>
                <p className="mt-[6px] text-[13px] text-[#525252]">15 seats · 30,000 pooled AI credits/month</p>
                <p className="mt-[12px] text-[13px] font-medium">$249/month</p>
              </div>
            </div>
            <p className="mt-[14px] text-[12px] text-[#737373]">Choose your new plan in the Stripe subscription portal. Your existing subscription is managed there.</p>
            {upgradeError ? <p role="alert" className="mt-[10px] text-[12px] text-[#B91C1C]">{upgradeError}</p> : null}
            <div className="mt-[20px] flex justify-end gap-[8px]">
              <Dialog.Close className="rounded-[6px] px-[12px] py-[8px] text-[13px]">Not now</Dialog.Close>
              <button
                type="button"
                onClick={() => void openUpgradePortal()}
                disabled={upgradeLoading}
                className="rounded-[6px] bg-[#463FBA] px-[12px] py-[8px] text-[13px] text-white disabled:opacity-50"
              >
                {upgradeLoading ? "Opening…" : "Manage subscription"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </SettingsCard>
  );
}
