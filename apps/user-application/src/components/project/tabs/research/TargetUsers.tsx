import { targetUsers } from "@/data/fixtures/project/researchTabFixtures";
import { SectionTitle } from "./ResearchPrimitives";

export function TargetUsers({ isEditing }: { isEditing: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Target Users</SectionTitle>
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {targetUsers.map((user) => (
          <article key={user.name} className="rounded-[10px] bg-[#FAFAFA] p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E5E5E5] text-[13px] font-semibold text-[#525252]">
                {user.name.charAt(0)}
              </div>
              <div>
                {isEditing ? (
                  <div className="grid gap-[6px]">
                    <input defaultValue={user.name} aria-label={`${user.name} name`} className="h-[25px] rounded-[5px] bg-white px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
                    <input defaultValue={user.role} aria-label={`${user.name} role`} className="h-[25px] rounded-[5px] bg-white px-2 text-[12px] font-medium leading-[1.25] text-[#737373]" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{user.name}</h3>
                    <p className="mt-[2px] text-[12px] font-medium leading-[1.5] text-[#737373]">{user.role}</p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-[12px] font-medium leading-[1.35]">
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
    <div>
      <p className="text-[#171717]">{label}:</p>
      {isEditing ? (
        <input defaultValue={value} aria-label={label} className="mt-1 h-[27px] w-full rounded-[5px] bg-white px-2 text-[#525252]" />
      ) : (
        <p className="mt-1 text-[#525252]">{value}</p>
      )}
    </div>
  );
}
