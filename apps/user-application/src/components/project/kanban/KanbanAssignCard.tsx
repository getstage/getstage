import { Avatar } from "@/components/ui/Avatar";
import { useSettingsOverviewQuery, type ProjectMember } from "@/hooks/convex-data";

function memberLabel(member: ProjectMember) {
  return member.name?.trim() || member.email?.trim() || "Member";
}

export function KanbanAssignCard({
  members,
  search,
  onSearchChange,
  onAssign,
}: {
  members: ProjectMember[];
  search: string;
  onSearchChange: (value: string) => void;
  onAssign: (member: ProjectMember) => void;
}) {
  const settingsOverviewQuery = useSettingsOverviewQuery();
  const profile = settingsOverviewQuery.data?.profile;
  const query = search.trim().toLowerCase();
  const filteredMembers = members.filter((member) => {
    if (!query) return true;
    const label = memberLabel(member).toLowerCase();
    const email = member.email?.toLowerCase() ?? "";
    return label.includes(query) || email.includes(query);
  });

  return (
    <div
      className="absolute right-0 top-8 z-30 w-[266px] rounded-[8px] border-2 border-[rgba(0,0,0,0.05)] bg-gradient-to-b from-white to-[#FAFAFA] p-3 shadow-[0_8px_24px_rgba(10,10,10,0.12)]"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      draggable={false}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <img src="/logos/dashboard/assign.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
          <p className="min-w-0 flex-1 text-[12px] font-medium leading-[1.5] text-[#0A0A0A]">Assign Task</p>
        </div>
        <label className="flex h-[31px] w-full cursor-text items-center gap-2 rounded-[6px] bg-[#F5F5F5] px-2 py-[6px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
          <img src="/logos/dashboard/search.svg" alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name..."
            autoFocus
            className="min-w-0 flex-1 bg-transparent p-0 text-[13px] font-normal leading-[1.25] text-[#525252] outline-none placeholder:text-[#525252]"
          />
        </label>
        <div className="flex flex-col">
          {filteredMembers.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => onAssign(member)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 py-[6px] text-left transition-colors hover:bg-[#F5F5F5]"
            >
              <Avatar
                name={memberLabel(member)}
                src={getMemberAvatarUrl(member, profile)}
                className="h-5 w-5"
              />
              <span className="text-[12px] font-medium leading-[1.25] text-[#262626]">{memberLabel(member)}</span>
            </button>
          ))}
          {filteredMembers.length === 0 ? (
            <div className="px-2 py-[6px] text-[12px] font-medium leading-[1.25] text-[#737373]">No matches</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getMemberAvatarUrl(
  member: ProjectMember,
  profile: { id: string; email: string; avatarUrl: string | null } | undefined,
) {
  if (!profile?.avatarUrl) return undefined;

  if (member.userId === profile.id || member.email === profile.email) {
    return profile.avatarUrl;
  }

  return undefined;
}
