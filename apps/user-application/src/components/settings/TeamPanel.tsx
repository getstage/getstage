import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "Owner" | "Member";
};

type TeamInviteInput = {
  email: string;
};

const TEAM_LIMIT = 3;

const SAMPLE_MEMBERS: TeamMember[] = [
  {
    id: "sample-1",
    name: "Nina Palmer",
    email: "nina@stage.test",
    role: "Member",
  },
  {
    id: "sample-2",
    name: "Maria Chen",
    email: "maria@stage.test",
    role: "Member",
  },
];

export function TeamPanel() {
  const overview = useSettingsOverviewQuery();
  const profile = overview.data?.profile;
  const currentUser = useMemo<TeamMember>(() => ({
    id: "current-user",
    name: profile?.name ?? "You",
    email: profile?.email ?? "Signed in user",
    avatarUrl: profile?.avatarUrl ?? undefined,
    role: "Owner",
  }), [profile?.avatarUrl, profile?.email, profile?.name]);
  const teamSettings = useMockTeamSettings(currentUser);
  const [inviteEmail, setInviteEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const seatsLeft = TEAM_LIMIT - teamSettings.members.length;
  const canInvite = seatsLeft > 0 && inviteEmail.trim().includes("@");

  function inviteMember() {
    if (!canInvite) return;
    teamSettings.invite({ email: inviteEmail.trim() });
    setInviteEmail("");
    setNotice("Team member added.");
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
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") inviteMember();
                }}
                disabled={seatsLeft <= 0}
                placeholder="teammate@company.com"
                className="h-[30px] min-w-0 flex-1 rounded-[6px] bg-[#F5F5F5] px-[10px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#737373] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={inviteMember}
                disabled={!canInvite}
                className="inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] bg-gradient-to-b from-[#8D87FF] to-[#4B3DCB] px-[12px] text-[12px] font-medium leading-none text-white shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-opacity enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
          {notice ? <p className="mt-[10px] text-[12px] font-medium leading-[1.5] text-[#166534]">{notice}</p> : null}
        </SettingsRow>

        {teamSettings.members.map((member) => (
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
                    onClick={() => {
                      teamSettings.remove(member.id);
                      setNotice(null);
                    }}
                    className="rounded-[6px] bg-[#F5F5F5] px-[12px] py-[6px] text-[12px] font-medium leading-none text-[#b91c1c] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FEF2F2]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </SettingsRow>
        ))}
      </div>
    </SettingsCard>
  );
}

function useMockTeamSettings(currentUser: TeamMember) {
  const [members, setMembers] = useState<TeamMember[]>(SAMPLE_MEMBERS);

  return {
    members: useMemo(() => [currentUser, ...members], [currentUser, members]),
    invite(input: TeamInviteInput) {
      const name = input.email.split("@")[0]?.replace(/[._-]+/g, " ") || input.email;
      setMembers((current) => [
        ...current,
        {
          id: `invited-${Date.now()}`,
          name: titleCase(name),
          email: input.email,
          role: "Member",
        },
      ]);
    },
    remove(memberId: string) {
      setMembers((current) => current.filter((member) => member.id !== memberId));
    },
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
