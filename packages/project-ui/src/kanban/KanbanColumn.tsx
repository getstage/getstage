import type { ReactNode } from "react";
import type { KanbanStatus } from "./columns";

// One board column: title, optional "+" to add a task, the cards, and "No tasks" when empty.
export function KanbanColumn({ columnKey, label, empty, highlighted = false, onAdd, children }: {
  columnKey: KanbanStatus;
  label: string;
  empty: boolean;
  highlighted?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <section data-kanban-column={columnKey} className={`flex min-w-0 flex-col gap-1 rounded-[8px] transition-colors ${highlighted ? "bg-white/35" : ""}`}>
      <div className={`flex items-center justify-between rounded-[8px] px-4 py-3 ${columnKey === "done" ? "opacity-50" : ""}`}>
        <h3 className="text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">{label}</h3>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-[4px] bg-gradient-to-b from-white to-[#FAFAFA] text-[#A3A3A3] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:text-[#525252]"
            aria-label={`Add ${label} task`}
          >
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-[14px] w-[14px]">
              <path d="M6 2v8M2 6h8" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {children}
        {empty ? <div className="rounded-[8px] bg-white/50 p-4 text-center text-[12px] text-[#737373]">No tasks</div> : null}
      </div>
    </section>
  );
}

export const KANBAN_GRID = "grid grid-cols-1 gap-1 overflow-visible rounded-[10px] bg-[#F5F5F5] p-1 md:grid-cols-2 xl:grid-cols-4";
