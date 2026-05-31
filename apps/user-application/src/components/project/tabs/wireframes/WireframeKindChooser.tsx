import type { ReactNode } from "react";
import type { WireframeKind, WireframeKindChoice } from "@/types/project/wireframesTab";
import { ArrowRightIcon, HifiWireframeIcon, LofiWireframeIcon } from "./wireframesIcons";

export function WireframeKindChooser({
  selectedKind,
  onSelect,
  onContinue,
}: {
  selectedKind: WireframeKindChoice;
  onSelect: (kind: WireframeKind) => void;
  onContinue: () => void;
}) {
  const canContinue = selectedKind !== null;

  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <div>
        <div className="flex w-[357px] flex-col gap-1 px-3 pb-3 pt-2">
          <p className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
            Create Wireframe
          </p>
          <p className="text-[12px] font-medium leading-[1.5] text-[#525252]">
            Select how you want your wireframe to look like.
          </p>
        </div>
        <div className="rounded-[8px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="grid grid-cols-2 gap-1">
            <KindOption
              active={selectedKind === "lofi"}
              icon={<LofiWireframeIcon className="h-4 w-4" />}
              label="Lo-Fi Wireframe"
              onClick={() => onSelect("lofi")}
            />
            <KindOption
              active={selectedKind === "hifi"}
              icon={<HifiWireframeIcon className="h-4 w-4" />}
              label="Hi-Fi Wireframe"
              onClick={() => onSelect("hifi")}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7B76DF] to-[#463FBA] py-[10px] pl-[10px] pr-3 text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] ${
          canContinue ? "" : "cursor-not-allowed opacity-50"
        }`}
      >
        Continue
        <ArrowRightIcon />
      </button>
    </div>
  );
}

function KindOption({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[104px] items-center justify-center gap-2 overflow-hidden rounded-[6px] border px-3 py-11 text-[12px] font-medium leading-none transition-colors ${
        active
          ? "border-[#DBD9FC] bg-[#E7E6FD] text-[#16115A]"
          : "border-transparent bg-white text-[#525252] hover:bg-[#FAFAFA]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
