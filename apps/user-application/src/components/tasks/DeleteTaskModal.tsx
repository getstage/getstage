export function DeleteTaskModal({ onCancel, onDelete }: { onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/10 px-[16px] py-[20px] backdrop-blur-[2px]">
      <button type="button" aria-label="Cancel delete task" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <section role="dialog" aria-modal="true" aria-labelledby="delete-task-title" className="relative z-[91] flex w-full max-w-[510px] flex-col gap-[24px] rounded-[8px] bg-white p-[20px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-[24px]">
          <WarningIcon />
          <div className="flex flex-col gap-[4px] text-[#171717]">
            <h2 id="delete-task-title" className="text-[15px] font-semibold leading-none">
              Are you sure you want to delete the task?
            </h2>
            <p className="text-[12px] font-normal leading-[1.5]">
              You are about to delete this task. Once deleted, it cannot be recovered. Please confirm that you have saved all necessary information before proceeding.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <button type="button" onClick={onCancel} className="rounded-[6px] bg-[#f5f5f5] px-[16px] py-[8px] text-[12px] font-medium leading-none text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
            Cancel
          </button>
          <button type="button" onClick={onDelete} className="rounded-[6px] border border-[#f87171] bg-gradient-to-b from-[#ef4444] to-[#dc2626] py-[8px] pl-[10px] pr-[12px] text-[13px] font-medium leading-none text-[#fafafa] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" style={{ textShadow: "0px 0.5px 1.5px rgba(0,0,0,0.15)" }}>
            Delete Task
          </button>
        </div>
      </section>
    </div>
  );
}

function WarningIcon() {
  return <MaskedIcon src="/logos/dashboard/warning.svg" className="h-[32px] w-[32px] bg-[#ef4444]" />;
}

function MaskedIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        mask: `url(${src}) center / contain no-repeat`,
        WebkitMask: `url(${src}) center / contain no-repeat`,
      }}
    />
  );
}
