import type { WireframeKind } from "@/project/types/wireframesTab";
import { PanelTitle, PrimaryButton } from "./WireframePrimitives";
import { ArrowRightIcon } from "./wireframesIcons";

export function TypeChooser({
  selectedKind,
  onSelect,
  onContinue,
}: {
  selectedKind: WireframeKind | null;
  onSelect: (kind: WireframeKind) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <PanelTitle
        title="Create Wireframe"
        description="Select how you want your wireframe to look like."
      />
      <div className="rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="grid grid-cols-2 gap-[4px]">
          <TypeOption
            active={selectedKind === "lofi"}
            iconSrc="/logos/dashboard/lofi-wireframe.svg"
            label="Lo-Fi Wireframe"
            onClick={() => onSelect("lofi")}
          />
          <TypeOption
            active={selectedKind === "hifi"}
            iconSrc="/logos/dashboard/hifi-wireframe.svg"
            label="Hi-Fi Wireframe"
            onClick={() => onSelect("hifi")}
          />
        </div>
      </div>
      <PrimaryButton disabled={!selectedKind} onClick={onContinue}>
        Continue
        <ArrowRightIcon />
      </PrimaryButton>
    </div>
  );
}

export function TypeOption({
  active,
  iconSrc,
  label,
  onClick,
}: {
  active: boolean;
  iconSrc: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[104px] items-center justify-center gap-[8px] overflow-hidden rounded-[6px] px-[12px] py-[44px] text-[12px] font-medium leading-none transition-colors ${
        active
          ? "bg-[#E7E6FD] text-[#16115A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
          : "bg-white text-[#525252] hover:bg-[#FAFAFA]"
      }`}
    >
      <img src={iconSrc} alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
