import { useState } from "react";

export function DeleteAccountDialog({
  onCancel,
  onOpenCancellationForm,
  onConfirm,
  error,
  isDeleting,
}: {
  onCancel: () => void;
  onOpenCancellationForm: () => void;
  onConfirm: (confirmation: string) => void;
  error: string | null;
  isDeleting: boolean;
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const canDelete = confirmationText === "DELETE" && !isDeleting;

  function confirmDelete() {
    if (!canDelete) return;
    onConfirm(confirmationText);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-[24px] backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[516px] rounded-[12px] bg-[#F5F5F5] p-[4px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-[8px] bg-white p-[20px] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          <h2 id="delete-account-title" className="text-[15px] font-semibold leading-none">
            Delete account
          </h2>
          <p className="mt-[8px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            This deletes your account, projects, uploads, billing state, Stripe connections,
            Google Sheets connections, and active sessions.
          </p>
          <p className="mt-[16px] text-[12px] font-normal leading-[1.5] text-[#404040]">
            We also opened a short cancellation form in a new tab. If it did not open,{" "}
            <button
              type="button"
              onClick={onOpenCancellationForm}
              className="text-[#8D87FF] underline underline-offset-[3px] transition-colors hover:text-[#7B76DF]"
            >
              open it here.
            </button>
          </p>
          <label className="mt-[16px] block">
            <span className="text-[12px] font-normal leading-[1.5] text-[#404040]">
              Type <span className="font-medium">DELETE</span> to confirm.
            </span>
            <input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoFocus
              placeholder="DELETE"
              className="mt-[8px] h-[38px] w-full rounded-[6px] border border-[#D4D4D4] bg-[#F5F5F5] px-[12px] text-[13px] font-medium leading-none text-[#171717] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none placeholder:text-[#A3A3A3] focus:border-[#D4D4D4] focus:bg-white"
            />
          </label>
          {error ? <p className="mt-[10px] text-[12px] font-medium text-[#b91c1c]">{error}</p> : null}

          <div className="mt-[24px] flex items-center gap-[8px]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[6px] bg-[#F5F5F5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={confirmDelete}
              className="rounded-[6px] border border-[#F87171] bg-gradient-to-b from-[#EF4444] to-[#DC2626] px-[12px] py-[8px] text-[13px] font-medium leading-none text-[#FAFAFA] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-opacity enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 [text-shadow:0_0.5px_1.5px_rgba(0,0,0,0.15)]"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
