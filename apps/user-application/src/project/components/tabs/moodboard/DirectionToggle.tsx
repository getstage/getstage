export function DirectionToggle({
  activeView,
  onAll,
  onDirectionHub,
}: {
  activeView: "all" | "hub";
  onAll: () => void;
  onDirectionHub: () => void;
}) {
  return (
    <div className="inline-flex rounded-[8px] bg-[#F5F5F5] p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center rounded-[6px] px-4 text-[13px] font-medium leading-[1.25] ${
          activeView === "all"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#525252]"
        }`}
        onClick={onAll}
      >
        All
      </button>
      <button
        type="button"
        className={`inline-flex h-[27px] cursor-pointer items-center rounded-[6px] py-[6px] pl-[10px] pr-3 text-[13px] font-medium leading-[1.25] ${
          activeView === "hub"
            ? "bg-white text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
            : "text-[#525252]"
        }`}
        onClick={onDirectionHub}
      >
        Direction Hub
      </button>
    </div>
  );
}
