import { referoProviderMark } from "@/mock/project/research";
import type { UiPatternGroupWithPatterns } from "@/types/project/researchTab";
import {
  ArrowLeftMiniIcon,
  ArrowRightMiniIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PatternIcon,
  RegenerateIcon,
} from "./researchIcons";

type UiPatternsProps = {
  groups: UiPatternGroupWithPatterns[];
  isEditing: boolean;
  openGroupId: string | null;
  onToggleGroup: (groupId: string) => void;
  onOpenPhoto: (src: string) => void;
};

export function UiPatterns({ groups, isEditing, openGroupId, onToggleGroup, onOpenPhoto }: UiPatternsProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-medium leading-[1.25] text-[#171717]">UI Patterns</h2>
          <div className="h-1 w-1 rounded-full bg-[#A3A3A3]" />
          <div className="flex items-center gap-2">
            <img src={referoProviderMark} alt="" className="h-[10px] w-[22px]" />
            <p className="text-[12px] font-medium leading-[1.25] text-[#525252]">Analysed with Refero</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <UiPatternGroup
            key={group.id}
            group={group}
            isEditing={isEditing}
            isOpen={openGroupId === group.id}
            onToggle={() => onToggleGroup(group.id)}
            onOpenPhoto={onOpenPhoto}
          />
        ))}
      </div>
    </section>
  );
}

function UiPatternGroup({
  group,
  isEditing,
  isOpen,
  onToggle,
  onOpenPhoto,
}: {
  group: UiPatternGroupWithPatterns;
  isEditing: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onOpenPhoto: (src: string) => void;
}) {
  return (
    <article className="rounded-[10px] bg-[#FAFAFA] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-[13px] font-medium leading-[1.25] text-[#171717]">{group.title}</h3>
        <div className="flex h-[22px] items-start gap-[2px] rounded-[6px] bg-[#F4F4F5] p-[2px]">
          <button type="button" className="flex h-full items-center justify-center rounded-[4px] px-2 text-[#71717A] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.07)]" aria-label={`Previous ${group.title} patterns`}>
            <ArrowLeftMiniIcon />
          </button>
          <button type="button" className="flex h-full items-center justify-center rounded-[4px] bg-white px-2 text-[#18181B] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.07)]" aria-label={`Next ${group.title} patterns`}>
            <ArrowRightMiniIcon />
          </button>
        </div>
      </div>

      {group.images.length > 0 ? (
        <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
          {group.images.map((src, index) => (
            <button
              key={`${group.id}-${src}-${index}`}
              type="button"
              onClick={() => onOpenPhoto(src)}
              className="group rounded-[8px] bg-white p-2 text-left shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-transform hover:-translate-y-px"
              aria-label={`Open ${group.title} reference ${index + 1}`}
            >
              <div className="aspect-[1920/1325] overflow-hidden rounded-[4px]">
                <img src={src} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.01]" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-1 overflow-hidden rounded-[8px] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between p-4 text-left"
          aria-expanded={isOpen}
        >
          <span className="text-[13px] font-semibold leading-[1.25] text-[#171717]">Patterns Recognised</span>
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>

        {isOpen ? (
          <div className="flex flex-col gap-4 border-t border-[#F5F5F5] px-4 pb-4">
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {group.recognizedPatterns.map(([title, body]) => (
                <PatternCard key={title} title={title} body={body} isEditing={isEditing} />
              ))}
            </div>

            {isEditing ? (
              <button type="button" className="inline-flex h-[27px] w-fit cursor-pointer items-center gap-2 rounded-[4px] bg-white px-3 py-[6px] text-[12px] font-medium leading-[1.25] text-[#7C3AED] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#F5F3FF]">
                <RegenerateIcon />
                Regenerate with AI
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PatternCard({ title, body, isEditing }: { title: string; body: string; isEditing: boolean }) {
  return (
    <article className="rounded-[8px] bg-[#FAFAFA] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <div className="flex min-h-[70px] gap-3 rounded-[6px] p-4">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#E7E6FD] p-1 text-[#16115A]">
          <PatternIcon />
        </div>
        {isEditing ? (
          <div className="grid min-w-0 flex-1 gap-[6px]">
            <input defaultValue={title} aria-label={`${title} title`} className="h-[25px] rounded-[5px] bg-[#F5F5F5] px-2 text-[13px] font-semibold leading-[1.25] text-[#171717]" />
            <textarea defaultValue={body} aria-label={`${title} body`} className="min-h-[54px] resize-y rounded-[6px] bg-[#F5F5F5] px-2 py-[7px] text-[12px] font-medium leading-[1.5] text-[#737373]" />
          </div>
        ) : (
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold leading-[1.25] text-[#171717]">{title}</h3>
            {body ? <p className="mt-1 text-[12px] font-medium leading-[1.5] text-[#737373]">{body}</p> : null}
          </div>
        )}
      </div>
    </article>
  );
}
