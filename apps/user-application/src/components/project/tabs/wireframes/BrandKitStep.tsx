import { PanelTitle, PrimaryButton, SecondaryButton } from "./WireframePrimitives";
import { ArrowLeftIcon, ArrowRightIcon, TrashIcon, UploadFromDeviceIcon } from "./wireframesIcons";

export function BrandKitStep({
  hasBrandKit,
  onUpload,
  onRemove,
  onBack,
  onContinue,
}: {
  hasBrandKit: boolean;
  onUpload: () => void;
  onRemove: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-[357px] flex-col gap-[6px]">
      <PanelTitle
        title="Upload Your Brand Kit"
        description="Select how you want your wireframe to look like."
      />
      <div className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <button
          type="button"
          onClick={onUpload}
          className="flex h-[172px] w-full flex-col items-center justify-center gap-3 rounded-[8px] bg-white p-11 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#FAFAFA]"
        >
          <UploadFromDeviceIcon className="h-5 w-5" />
          <span className="flex flex-col gap-[6px]">
            <span className="text-[13px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </span>
            <span className="text-[12px] font-medium leading-[1.25] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </span>
          </span>
        </button>
      </div>
      {hasBrandKit ? (
        <div className="w-[348px] max-w-full rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <div className="flex min-h-9 items-center justify-between rounded-[8px] bg-white p-2 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            <div className="flex min-w-0 items-center gap-2">
              <UploadFromDeviceIcon className="h-5 w-5" />
              <span className="truncate pb-px text-[13px] font-medium leading-[1.2] text-[#171717]">
                Brand_guideline.pdf
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="pb-px text-[12px] font-medium leading-[1.2] text-[#737373]">2.3MB</span>
              <button
                type="button"
                onClick={onRemove}
                className="text-[#EF4444] transition-opacity hover:opacity-70"
                aria-label="Remove brand kit"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex gap-[6px]">
        <SecondaryButton size="action" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </SecondaryButton>
        <PrimaryButton disabled={!hasBrandKit} onClick={onContinue} className="flex-1">
          Continue
          <ArrowRightIcon />
        </PrimaryButton>
      </div>
    </div>
  );
}
