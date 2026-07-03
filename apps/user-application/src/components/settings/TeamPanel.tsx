import { useMemo, useState } from "react";
import { useAction, useMutation } from "convex/react";
import type { Id } from "@stage/data-ops/convex/data-model";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/convexApi";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { inviteTeamMemberSchema } from "@/lib/validation";
import { useSettingsOverviewQuery, useWorkspaceMembersQuery } from "@/hooks/convex-data";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "Owner" | "Member";
};

// Seats are display-only until Phase 3 enforces them server-side.
const TEAM_LIMIT = 3;

export function TeamPanel() {
  const overview = useSettingsOverviewQuery();
  const profile = overview.data?.profile;
  const members = useWorkspaceMembersQuery();
  const addMember = useAction(api.workspaceMembers.add);
  const removeMember = useMutation(api.workspaceMembers.remove);

  const [inviteEmail, setInviteEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const rows = useMemo<TeamMember[] | undefined>(() => {
    if (members.data === undefined) {
      return undefined;
    }

    const owner: TeamMember = {
      id: "current-user",
      name: profile?.name ?? "You",
      email: profile?.email ?? "Signed in user",
      avatarUrl: profile?.avatarUrl ?? undefined,
      role: "Owner",
    };
    const invited = members.data.map<TeamMember>((member) => ({
      id: member._id,
      name: member.name ?? member.email ?? "Team member",
      email: member.email ?? "",
      role: "Member",
    }));
    return [owner, ...invited];
  }, [members.data, profile?.avatarUrl, profile?.email, profile?.name]);

  const seatsLeft = rows ? TEAM_LIMIT - rows.length : 0;

  const emailInput = inviteEmail.trim();
  const emailValidation = inviteTeamMemberSchema.safeParse({ email: emailInput });
  const isEmailValid = emailInput.length > 0 && emailValidation.success;
  const isEmailInvalid = emailInput.length > 0 && !emailValidation.success;
  const emailErrorMessage = isEmailInvalid
    ? emailValidation.error.issues[0]?.message ?? "Please enter a valid email address."
    : null;
  const canInvite = rows !== undefined && seatsLeft > 0 && isEmailValid && !isSubmitting;

  async function inviteMember() {
    if (!canInvite) return;
    const email = emailInput;
    setIsSubmitting(true);
    setNotice(null);
    setErrorMessage(null);
    try {
      const result = await addMember({ email });
      setInviteEmail("");
      setNotice(
        result.inviteSent
          ? "Team member added."
          : result.inviteError ?? "Team member added, but the invite email could not be sent.",
      );
    } catch (error) {
      setErrorMessage(toUserFacingErrorMessage(error, "Could not add this team member."));
    } finally {
      setIsSubmitting(false);
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
    <SettingsCard title="Team">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage who can access this workspace. Your plan includes {TEAM_LIMIT} team seats.
      </p>

      <div className="flex flex-col gap-[4px]">
        <SettingsRow>
          <div className="flex flex-col gap-[14px] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-[13px] font-medium leading-none text-[#171717]">Invite teammate</h3>
              <p className="mt-[4px] text-[12px] font-normal leading-[1.5] text-[#525252]">
                {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} available.` : "All team seats are used."}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 gap-[8px] sm:max-w-[360px]">
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
                placeholder="teammate@company.com"
                aria-invalid={isEmailInvalid}
                className="h-[30px] min-w-0 flex-1 rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void inviteMember()}
                disabled={!canInvite}
                className="inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-b from-[#8D87FF] to-[#4B3DCB] px-[12px] text-[12px] font-medium leading-none text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
          {emailErrorMessage ? <p className="mt-[10px] text-[12px] font-medium leading-[1.5] text-[#b91c1c]">{emailErrorMessage}</p> : null}
          {notice ? <p className="mt-[10px] text-[12px] font-medium leading-[1.5] text-[#166534]">{notice}</p> : null}
          {errorMessage ? <p className="mt-[10px] text-[12px] font-medium leading-[1.5] text-[#b91c1c]">{errorMessage}</p> : null}
        </SettingsRow>

        {members.isLoading ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">Loading team members…</p>
          </SettingsRow>
        ) : (
          rows?.map((member) => (
          <SettingsRow key={member.id}>
            <div className="flex items-center justify-between gap-[16px]">
              <div className="flex min-w-0 items-center gap-[12px]">
                <Avatar name={member.name} src={member.avatarUrl} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-[8px]">
                    <h3 className="truncate text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{member.name}</h3>
                    {member.id === "current-user" ? (
                      <span className="rounded-[4px] bg-[#F5F5F5] px-[6px] py-[3px] text-[11px] font-medium leading-none text-[#525252]">
                        You
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[12px] font-normal leading-[1.5] text-[#404040]">{member.email}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-[8px]">
                <span className="rounded-[4px] bg-[#E7E6FD] px-[6px] py-[4px] text-[12px] font-normal leading-none text-[#221E6C]">
                  {member.role}
                </span>
                {member.id !== "current-user" ? (
                  <button
                    type="button"
                    onClick={() => void removeTeamMember(member.id)}
                    disabled={removingId === member.id}
                    className="rounded-[6px] bg-[#F5F5F5] px-[12px] py-[6px] text-[12px] font-medium leading-none text-[#b91c1c] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {removingId === member.id ? "Removing…" : "Remove"}
                  </button>
                ) : null}
              </div>
            </div>
          </SettingsRow>
          ))
        )}
      </div>
    </SettingsCard>
  );
}
