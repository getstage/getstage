import type { MoodboardMode } from "@/data/fixtures/project/moodboardTabFixtures";
import { FigmaIcon, UploadFromDeviceIcon } from "./moodboardIcons";

export function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: MoodboardMode;
  onModeChange: (mode: MoodboardMode) => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] transition-colors ${
          mode === "figma"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
        onClick={() => onModeChange("figma")}
      >
        <FigmaIcon />
        Figma Link
      </button>
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center gap-2 rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] transition-colors ${
          mode === "upload"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#737373] hover:bg-white"
        }`}
        onClick={() => onModeChange("upload")}
      >
        <UploadFromDeviceIcon className="h-[15px] w-[15px]" />
        Upload from Device
      </button>
    </div>
  );
}
