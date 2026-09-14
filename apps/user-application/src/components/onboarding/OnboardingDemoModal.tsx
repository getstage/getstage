import * as Dialog from "@radix-ui/react-dialog";

const ONBOARDING_VIDEO_URL = "https://www.youtube-nocookie.com/embed/HAgYEVeA1jo?rel=0";

export function OnboardingDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[6px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-32px)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] bg-[#F5F5F5] p-1 shadow-[0_24px_80px_rgba(10,10,10,0.28)] outline-none">
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <Dialog.Title className="text-[15px] font-medium text-[#0A0A0A]">
                Welcome to Stage
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[12px] text-[#525252]">
                Watch this quick demo to see how to take your first project from idea to handoff.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close onboarding video"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-white text-[20px] leading-none text-[#737373] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:text-[#171717]"
              >
                ×
              </button>
            </Dialog.Close>
          </div>
          <div className="aspect-video overflow-hidden rounded-[10px] bg-black">
            <iframe
              className="h-full w-full border-0"
              src={ONBOARDING_VIDEO_URL}
              title="Stage onboarding demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
