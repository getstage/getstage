import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

type NotionParentPageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (parentPageUrl: string) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function NotionParentPageDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: NotionParentPageDialogProps) {
  const [parentPageUrl, setParentPageUrl] = useState("");

  function handleSubmit() {
    const trimmed = parentPageUrl.trim();
    if (!trimmed) {
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setParentPageUrl("");
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,10,10,0.22)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[518px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25),0_18px_55px_rgba(10,10,10,0.22)] outline-none">
          <div className="rounded-[8px] bg-white p-5">
            <Dialog.Title className="text-[15px] font-medium text-[#0A0A0A]">
              Choose Notion parent page
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-[13px] font-medium text-[#525252]">
              Paste the URL of the Notion page where Stage should create the export. We reuse this
              parent for future exports.
            </Dialog.Description>
            <input
              value={parentPageUrl}
              onChange={(event) => setParentPageUrl(event.target.value)}
              placeholder="https://www.notion.so/..."
              className="mt-4 h-[36px] w-full rounded-[6px] border border-[#E5E5E5] px-3 text-[13px] font-medium text-[#171717] outline-none"
            />
            {errorMessage ? (
              <p className="mt-2 text-[13px] font-medium text-[#DC2626]">{errorMessage}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[6px] bg-[#F5F5F5] px-3 text-[13px] font-medium text-[#525252]"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !parentPageUrl.trim()}
                className="inline-flex h-8 items-center rounded-[6px] bg-[#171717] px-3 text-[13px] font-medium text-white disabled:opacity-50"
              >
                {isSubmitting ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
