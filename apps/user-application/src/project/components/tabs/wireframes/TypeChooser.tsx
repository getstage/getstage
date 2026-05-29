import type { ReactNode } from "react";
import { BookOpenIcon, UploadFromDeviceIcon } from "./wireframesIcons";

export type BrandSource = "style-guide" | "brand-kit";

export function TypeChooser({
  selectedSource,
  onSelect,
  onContinue,
}: {
  selectedSource: BrandSource;
  onSelect: (source: BrandSource) => void;
  onContinue: (source: BrandSource) => void;
}) {
  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <div className="rounded-[8px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="grid grid-cols-2 gap-[4px]">
          <TypeOption
            active={selectedSource === "style-guide"}
            icon={<BookOpenIcon className="h-4 w-4" />}
            label="Use Style Guide"
            onClick={() => {
              onSelect("style-guide");
              onContinue("style-guide");
            }}
          />
          <TypeOption
            active={selectedSource === "brand-kit"}
            icon={<UploadFromDeviceIcon className="h-4 w-4" />}
            label="Upload Brand Kit"
            onClick={() => {
              onSelect("brand-kit");
              onContinue("brand-kit");
            }}
          />
        </div>
      </div>
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
