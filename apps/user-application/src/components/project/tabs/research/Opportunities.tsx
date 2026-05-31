import { opportunities } from "@/data/fixtures/project/researchTabFixtures";
import { SectionTitle } from "./ResearchPrimitives";
import { RegenerateIcon } from "./researchIcons";

export function Opportunities({ isEditing }: { isEditing: boolean }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Opportunities</SectionTitle>
      {isEditing ? (
        <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FAFAFA] p-3 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.15)]">
          <textarea
            defaultValue={opportunities.join(" ")}
            aria-label="Opportunities"
            className="min-h-[80px] w-full resize-y bg-transparent text-[13px] font-medium leading-[1.5] text-[#525252]"
          />
          <button type="button" className="mt-4 inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]">
            <RegenerateIcon />
            Regenerate with AI
          </button>
        </div>
      ) : (
        <p className="text-[13px] font-medium leading-[1.5] text-[#525252]">
          {opportunities.join(" ")}
        </p>
      )}
    </section>
  );
}
