import { SectionTitle } from "./ResearchPrimitives";

type CompanySnapshotProps = {
  rows: ReadonlyArray<readonly [string, string]>;
  isEditing: boolean;
  onRowsChange?: (rows: ReadonlyArray<readonly [string, string]>) => void;
};

export function CompanySnapshot({ rows, isEditing, onRowsChange }: CompanySnapshotProps) {
  function updateValue(index: number, value: string) {
    onRowsChange?.(
      rows.map((row, rowIndex) => (rowIndex === index ? ([row[0], value] as const) : row)),
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Company Snapshot</SectionTitle>
      <div className="w-full overflow-x-auto pb-1">
        <div className="w-[600px] overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
          {rows.map(([label, value], index) => (
            <div key={label} className={`grid grid-cols-2 ${index < rows.length - 1 ? "border-b border-[#E8E8E8]" : ""}`}>
              <div className="border-r border-[#E8E8E8] bg-[#FBFBFB] px-4 py-3 text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                {label}
              </div>
              {isEditing ? (
                <div className="p-2">
                  <input
                    value={value}
                    onChange={(event) => updateValue(index, event.target.value)}
                    aria-label={label}
                    className="h-[25px] w-full rounded-[5px] bg-[#F5F5F5] px-2 text-[14px] font-medium leading-[1.25] text-[#0A0A0A] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.18)]"
                  />
                </div>
              ) : (
                <div className="px-4 py-3 text-[14px] font-medium leading-[1.2] text-[#0A0A0A]">
                  {value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
