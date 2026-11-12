import { buildKanbanColumns, KANBAN_COLUMNS } from "./columns";
import { KANBAN_GRID, KanbanColumn } from "./KanbanColumn";
import { KanbanTaskCard } from "./KanbanTaskCard";
import type { Phase } from "./model";

// The project's task board without drag, assign or add: same columns and cards as the Mac board.
export function KanbanBoardView({ phases }: { phases: Phase[] }) {
  const columns = buildKanbanColumns(phases);
  return (
    <div className={KANBAN_GRID}>
      {KANBAN_COLUMNS.map((column) => (
        <KanbanColumn key={column.key} columnKey={column.key} label={column.label} empty={columns[column.key].length === 0}>
          {columns[column.key].map(({ task, phaseName }) => (
            <KanbanTaskCard key={task.id} task={task} phaseName={phaseName} dimmed={column.key === "done"} />
          ))}
        </KanbanColumn>
      ))}
    </div>
  );
}
