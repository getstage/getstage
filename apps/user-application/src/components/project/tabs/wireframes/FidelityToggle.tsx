import type { WireframeKind } from "@/types/project/wireframesTab";

// Lo-Fi / Hi-Fi switch shared by the Wireframes results grid and the Assets tab.
// A Hi-Fi artifact keeps each screen's Lo-Fi blocks, so this only flips the view.
export function FidelityToggle({
  value,
  onChange,
}: {
  value: WireframeKind;
  onChange: (value: WireframeKind) => void;
}) {
  return (
    <div className="inline-flex rounded-[8px] bg-[#E5E5E5] p-[3px]">
      {(["lofi", "hifi"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-[6px] px-3 py-[6px] text-[13px] font-medium leading-[1.25] transition-colors ${
            value === option
              ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
              : "text-[#525252] hover:text-[#171717]"
          }`}
        >
          {option === "hifi" ? "Hi-Fi" : "Lo-Fi"}
        </button>
      ))}
    </div>
  );
}
