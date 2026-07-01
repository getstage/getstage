export function NeutralSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-[clamp(16px,7vw,100px)] py-[clamp(20px,4vw,44px)]">
      <p className="text-[13px] font-medium text-[#737373]">{label}</p>
    </div>
  );
}