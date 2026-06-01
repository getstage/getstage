import type { ResearchTargetUser } from "@/types/project/researchTab";
import { SectionTitle } from "./ResearchPrimitives";

type TargetUsersProps = {
  users: ResearchTargetUser[];
  isEditing: boolean;
};

export function TargetUsers({ users, isEditing }: TargetUsersProps) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Target Users</SectionTitle>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {users.map((user) => (
          <article key={user.name} className="flex flex-col items-start gap-2 rounded-[8px] bg-[#FAFAFA] p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex w-full items-center justify-center gap-3">
              <img
                src="/images/project-modals/avatar.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="grid gap-[6px]">
                    <input defaultValue={user.name} aria-label={`${user.name} name`} className="h-[25px] rounded-[5px] bg-white px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
                    <input defaultValue={user.role} aria-label={`${user.name} role`} className="h-[25px] rounded-[5px] bg-white px-2 text-[12px] font-medium leading-[1.25] text-[#737373]" />
                  </div>
                ) : (
                  <>
                    <h3 className="truncate text-[13px] font-semibold leading-none text-[#171717]">{user.name}</h3>
                    <p className="mt-[2px] truncate text-[12px] font-medium leading-[1.5] text-[#737373]">{user.role}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex w-full flex-col gap-2">
              <UserDetail label="Goals" value={user.goals} isEditing={isEditing} />
              <UserDetail label="Frustration" value={user.frustration} isEditing={isEditing} />
              <UserDetail label="Context" value={user.context} isEditing={isEditing} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserDetail({ label, value, isEditing }: { label: string; value: string; isEditing: boolean }) {
  return (
    <div className="flex w-full flex-col items-start">
      <p className="rounded-[6px] pl-[10px] pr-3 pt-[6px] text-[11px] font-semibold uppercase leading-none text-[#171717]">{label}:</p>
      {isEditing ? (
        <input
          defaultValue={value}
          aria-label={label}
          className="mt-[6px] h-[27px] w-full rounded-[5px] bg-white px-2 text-[12px] font-medium leading-none text-[#262626]"
        />
      ) : (
        <ul className="list-disc pl-[28px] pr-3 pt-[6px] text-[12px] font-medium leading-none text-[#262626]">
          <li>{value}</li>
        </ul>
      )}
    </div>
  );
}
