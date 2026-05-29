export function ScreenElementList({
  elements,
  editing = false,
  onDraftElementChange,
}: {
  elements: string[];
  editing?: boolean;
  onDraftElementChange?: (elementIndex: number, value: string) => void;
}) {
  return (
    <ul className="m-0 flex list-disc flex-col gap-0 pl-[28px] text-[12px] font-medium leading-[1.25] text-[#262626]">
      {elements.map((element, elementIndex) => (
        <li key={`${elementIndex}-${element}`} className="py-[6px] pr-3 marker:text-[#262626]">
          {editing ? (
            <input
              value={element}
              onChange={(event) => onDraftElementChange?.(elementIndex, event.target.value)}
              className="block h-[12px] w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-[12px] font-medium leading-[1.25] text-[#262626] outline-none placeholder:text-[#737373] focus:text-[#171717]"
            />
          ) : (
            <span className="leading-[1.25]">{element}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
