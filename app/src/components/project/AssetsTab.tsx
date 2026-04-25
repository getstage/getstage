import { ImageSquare, Sparkle, UploadSimple } from "@phosphor-icons/react";

type AssetsTabProps = {
  projectName: string;
};

const wireframeAssets = [
  { name: "Homepage Wireframe", date: "6th April, 2025" },
  { name: "Homepage Wireframe", date: "6th April, 2025" },
  { name: "Homepage Wireframe", date: "6th April, 2025" },
] as const;

export function AssetsTab({ projectName: _projectName }: AssetsTabProps) {
  return (
    <div className="space-y-[18px] pb-20">
      <button
        type="button"
        className="w-full rounded-[12px] bg-[#F5F5F5] p-1 text-left shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EFEFEF]"
      >
        <div className="flex min-h-[164px] items-center justify-center rounded-[8px] bg-white px-6 py-11 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
          <div className="flex max-w-[180px] flex-col items-center gap-3 text-center">
            <UploadSimple size={24} weight="fill" className="text-[#525252]" />
            <div className="space-y-1.5">
              <p className="text-[15px] font-medium leading-none text-[#171717]">
                Upload files or drag and drop
              </p>
              <p className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
                Images, PDFs, Fonts, Files etc.
              </p>
            </div>
          </div>
        </div>
      </button>

      <section className="rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <div className="flex items-center gap-2 px-4 py-4">
          <h3 className="text-[15px] font-medium leading-none text-[#171717]">Wireframes</h3>
          <span className="text-[12px] font-medium leading-[1.5] text-[#737373]">(4 Files)</span>
        </div>

        <div className="grid grid-cols-1 gap-1 lg:grid-cols-3">
          {wireframeAssets.map((asset, index) => (
            <article
              key={`${asset.name}-${index}`}
              className="flex h-[336px] min-w-0 flex-col rounded-[8px] bg-white p-0.5 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
            >
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
                <ImageSquare size={24} weight="regular" className="text-[#525252]" />
              </div>
              <div className="p-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-[15px] font-medium leading-none text-[#171717]">
                      {asset.name}
                    </p>
                    <div className="flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
                      <Sparkle size={16} weight="fill" className="shrink-0 text-[#525252]" />
                      <span>AI Generated</span>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
                    {asset.date}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
