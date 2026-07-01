import type { ReactNode } from "react";
import { ArrowRightIcon, BookOpenIcon, UploadFromDeviceIcon } from "./wireframesIcons";

export type BrandSource = "style-guide" | "brand-kit";
export type BrandSourceChoice = BrandSource | null;

export function TypeChooser({
  selectedSource,
  onSelect,
  onContinue,
  variant = "full",
}: {
  selectedSource: BrandSourceChoice;
  onSelect: (source: BrandSource) => void;
  onContinue: (source: BrandSource) => void;
  // "slim" reuses the same toggle in a row, without the centered panel chrome
  // and the big Continue button. Used by the regenerate flow so a user can
  // re-pick the brand source inline above the results grid; the confirm is
  // owned there by ResultsGrid's own action bar.
  variant?: "full" | "slim";
}) {
  if (variant === "slim") {
    return (
      <div className="inline-flex rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="grid grid-cols-2 gap-[4px]">
          <TypeOption
            active={selectedSource === "style-guide"}
            icon={<BookOpenIcon className="h-4 w-4" />}
            label="Style Guide"
            onClick={() => onSelect("style-guide")}
          />
          <TypeOption
            active={selectedSource === "brand-kit"}
            icon={<UploadFromDeviceIcon className="h-4 w-4" />}
            label="Brand Kit"
            onClick={() => onSelect("brand-kit")}
          />
        </div>
      </div>
    );
  }

  const canContinue = selectedSource !== null;

  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <div>
        <div className="flex w-[357px] flex-col gap-1 px-3 pb-3 pt-2">
          <p className="text-[13px] font-semibold leading-[1.5] text-[#0A0A0A]">
            Brand Source
          </p>
          <p className="text-[12px] font-medium leading-[1.5] text-[#525252]">
            Choose the brand source to proceed
          </p>
        </div>
        <div className="rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="grid grid-cols-2 gap-[4px]">
            <TypeOption
              active={selectedSource === "style-guide"}
              icon={<BookOpenIcon className="h-4 w-4" />}
              label="Use Style Guide"
              onClick={() => onSelect("style-guide")}
            />
            <TypeOption
              active={selectedSource === "brand-kit"}
              icon={<UploadFromDeviceIcon className="h-4 w-4" />}
              label="Upload Brand Kit"
              onClick={() => onSelect("brand-kit")}
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (selectedSource) onContinue(selectedSource);
        }}
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

export function TypeOption({
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
      className={`flex min-h-[104px] items-center justify-center gap-[8px] overflow-hidden rounded-[6px] border px-[12px] py-[44px] text-[12px] font-medium leading-[1.25] transition-colors ${
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
