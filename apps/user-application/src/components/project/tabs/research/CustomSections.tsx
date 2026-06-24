import type { ResearchCustomSection } from "@/types/project/researchTab";
import { SectionTitle } from "./ResearchPrimitives";

type CustomSectionsProps = {
  sections: ResearchCustomSection[];
  isEditing: boolean;
  onSectionsChange?: (sections: ResearchCustomSection[]) => void;
};

export function CustomSections({ sections, isEditing, onSectionsChange }: CustomSectionsProps) {
  if (sections.length === 0 && !isEditing) {
    return null;
  }

  function updateSection(index: number, patch: Partial<ResearchCustomSection>) {
    onSectionsChange?.(
      sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section,
      ),
    );
  }

  function deleteSection(index: number) {
    onSectionsChange?.(sections.filter((_, sectionIndex) => sectionIndex !== index));
  }

  return (
    <section className="flex flex-col gap-2">
      <SectionTitle>Additional Sections</SectionTitle>
      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
          <article
            key={section.id}
            className="rounded-[8px] bg-[#FAFAFA] p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          >
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    value={section.title}
                    onChange={(event) => updateSection(index, { title: event.target.value })}
                    placeholder="Section title..."
                    aria-label={`${section.title || "Custom section"} title`}
                    className="h-[28px] min-w-0 flex-1 rounded-[5px] bg-white px-2 text-[13px] font-semibold leading-[1.25] text-[#171717] outline-none placeholder:text-[#A3A3A3]"
                  />
                  <button
                    type="button"
                    onClick={() => deleteSection(index)}
                    aria-label={`Delete ${section.title || "custom section"}`}
                    title="Delete section"
                    className="flex h-[28px] w-[28px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)] transition-colors hover:bg-[#FEF2F2]"
                  >
                    <img src="/logos/trash.svg" alt="" aria-hidden="true" className="h-[14px] w-[14px]" />
                  </button>
                </div>
                <textarea
                  value={section.body}
                  onChange={(event) => updateSection(index, { body: event.target.value })}
                  aria-label={`${section.title} body`}
                  className="min-h-[96px] resize-y rounded-[6px] bg-white px-2 py-2 text-[13px] font-medium leading-[1.5] text-[#525252]"
                />
              </div>
            ) : (
              <>
                <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{section.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-[1.5] text-[#525252]">
                  {section.body}
                </p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
