import { useState } from "react";
import type { Project, ProjectAsset } from "../../models/project";

const FIGMA_SYMBOL_URL = "https://www.figma.com/api/mcp/asset/8e10264d-f4f3-4742-8b43-3438d237e192";

const ASSET_CARD_COUNT = 6;

type AssetCategory = {
  id: AssetView;
  label: string;
  count: number;
  icon: React.ReactNode;
};

type AssetView = "wireframes" | "documents" | "uploaded";

export function AssetsTab({ project }: { project: Project }) {
  const [activeView, setActiveView] = useState<AssetView>("documents");
  const assetCards = buildAssetCards(project.assets);
  const uploadedCount = Math.max(project.assets.length, 3);
  const categories: AssetCategory[] = [
    { id: "wireframes", label: "Wireframes", count: 5, icon: <AssetMenuIcon src="/logos/dashboard/wireframes.svg" /> },
    { id: "documents", label: "Documents", count: 2, icon: <AssetMenuIcon src="/logos/dashboard/documents.svg" /> },
    { id: "uploaded", label: "Uploaded", count: uploadedCount, icon: <AssetMenuIcon src="/logos/dashboard/upload-from-device.svg" /> },
  ];
  const sectionTitle = categories.find((category) => category.id === activeView)?.label ?? "Documents";

  return (
    <section className="flex w-full flex-col gap-[18px]">
      <UploadDropzone />

      <div className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <h2 className="font-heading text-[15px] font-medium leading-[1.25] text-[#171717]">
                {sectionTitle}
              </h2>
              <AssetCategoryTabs
                categories={categories}
                activeView={activeView}
                onChange={setActiveView}
              />
            </div>
          </div>

          {activeView === "documents" ? <DocumentsGrid /> : null}
          {activeView === "uploaded" ? <UploadedGrid /> : null}

          {activeView === "wireframes" ? (
            <div className="grid gap-1 lg:grid-cols-3">
              {assetCards.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AssetCategoryTabs({
  categories,
  activeView,
  onChange,
}: {
  categories: AssetCategory[];
  activeView: AssetView;
  onChange: (view: AssetView) => void;
}) {
  return (
    <div className="flex w-fit flex-wrap items-start gap-1 rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      {categories.map((category) => {
        const isActive = category.id === activeView;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`inline-flex h-[32px] cursor-pointer items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-[1.25] transition-colors ${
              isActive
                ? "bg-[#E5E5E5] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                : "text-[#737373] hover:bg-[#F5F5F5]"
            }`}
          >
            {category.icon}
            <span>{category.label}</span>
            <span className={isActive ? "opacity-50" : ""}>({category.count})</span>
          </button>
        );
      })}
    </div>
  );
}

function UploadDropzone() {
  return (
    <button
      type="button"
      className="group w-full rounded-[12px] bg-[#F5F5F5] p-1 text-center shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#EDEDED]"
    >
      <div className="flex min-h-[132px] items-center justify-center rounded-[8px] bg-white px-6 py-11 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex w-[160px] flex-col items-center gap-3">
          <UploadFolderIcon />
          <div className="flex flex-col items-center gap-[6px]">
            <p className="w-[127px] text-[15px] font-medium leading-[1.25] text-[#171717]">
              Upload files or drag and drop
            </p>
            <p className="whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
              Images, PDFs, Fonts, Files etc.
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

function DocumentsGrid() {
  const documents = [
    {
      id: "research-complete",
      title: "Brand Research Report",
      description: "Company overview, 4 competitors, market insights",
      status: "Complete",
      statusClass: "bg-[#F0FDF4] text-[#022C22]",
      date: "April 2",
    },
    {
      id: "research-shared",
      title: "Brand Research Report",
      description: "Company overview, 4 competitors, market insights",
      status: "Shared",
      statusClass: "bg-[rgba(0,125,252,0.15)] text-[#007DFC]",
      date: "April 2",
    },
  ];

  return (
    <div className="grid gap-1 lg:grid-cols-2">
      {documents.map((document) => (
        <article
          key={document.id}
          className="flex min-h-[70px] items-start justify-between rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#DBEAFE] p-1 text-[#1D4ED8]">
              <ResearchReportIcon />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                <h3 className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                  {document.title}
                </h3>
                <span className={`rounded-[2px] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] ${document.statusClass}`}>
                  {document.status}
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] font-normal leading-[1.25] text-[#525252]">
                {document.description}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[12px] font-medium leading-[1.25] text-[#737373]">
                <CalendarIcon />
                <span>{document.date}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function UploadedGrid() {
  const uploads = [
    { id: "client-brief-1", title: "Client Brief.pdf", date: "Mar 10" },
    { id: "client-brief-2", title: "Client Brief.pdf", date: "Mar 10" },
  ];

  return (
    <div className="grid gap-1 lg:grid-cols-2">
      {uploads.map((upload) => (
        <article
          key={upload.id}
          className="flex min-h-[54px] items-start justify-between rounded-[8px] bg-white p-4 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#E5E5E5] p-1 text-[#525252]">
              <PdfIcon />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-[13px] font-medium leading-[1.25] text-[#171717]">
                  {upload.title}
                </h3>
                <span className="shrink-0 rounded-[2px] bg-[rgba(163,163,163,0.25)] px-[6px] py-[2px] text-[12px] font-normal leading-[1.25] text-[#525252]">
                  Uploaded
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[12px] font-medium leading-[1.25] text-[#737373]">
                <CalendarIcon />
                <span>{upload.date}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function AssetCard({ asset }: { asset: ProjectAsset & { date: string; source: string; priority: string } }) {
  return (
    <article className="flex h-[240px] flex-col overflow-hidden rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] sm:h-[336px]">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] p-2 shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <ImagePlaceholderIcon />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-[15px] font-medium leading-[1.25] text-[#171717]">
                {asset.title}
              </h3>
              <span className="shrink-0 rounded-[2px] bg-[#F3E8FF] px-1 py-[2px] text-[12px] font-normal leading-[1.25] text-[#3B0764]">
                {asset.priority}
              </span>
            </div>
            <div className="mt-[6px] flex items-center gap-2 text-[12px] font-medium leading-[1.5] text-[#737373]">
              <SparkleIcon />
              <span>{asset.source}</span>
            </div>
            <p className="mt-[2px] text-[12px] font-medium leading-[1.5] text-[#737373]">
              {asset.date}
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-[27px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-[#F5F5F5] px-3 text-[12px] font-medium leading-[1.25] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] transition-colors hover:bg-[#ECECEC]"
          >
            <img src={FIGMA_SYMBOL_URL} alt="" className="h-[15px] w-[10px]" />
            Open in Figma
          </button>
        </div>
      </div>
    </article>
  );
}

function buildAssetCards(assets: ProjectAsset[]) {
  const defaults: ProjectAsset[] = Array.from({ length: ASSET_CARD_COUNT }, (_, index) => ({
    id: `wireframe-${index + 1}`,
    title: "Homepage Wireframe",
    type: "Wireframe",
  }));

  return defaults.map((fallback, index) => ({
    ...fallback,
    ...(assets[index] ? { title: assets[index].title, type: assets[index].type } : {}),
    date: "6th April, 2025",
    source: "AI Generated",
    priority: "P0",
  }));
}

function UploadFolderIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-6 w-6 shrink-0 bg-[#525252]"
      style={{
        WebkitMask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/upload-from-device.svg") center / contain no-repeat',
      }}
    />
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6 text-[#525252]">
      <rect x="6" y="7" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9.5" cy="10.5" r="1" fill="currentColor" />
      <path d="m7.5 15 3.25-3.25 2.25 2.25 1.5-1.5L17 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AssetMenuIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="h-[15px] w-[15px] shrink-0 bg-current"
      style={{
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

function ResearchReportIcon() {
  return (
    <img src="/logos/dashboard/research-report.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
  );
}

function CalendarIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-[13px] w-[13px] shrink-0 bg-current"
      style={{
        WebkitMask: 'url("/logos/dashboard/calendar-2.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/calendar-2.svg") center / contain no-repeat',
      }}
    />
  );
}

function PdfIcon() {
  return (
    <img src="/logos/dashboard/pdf.svg" alt="" aria-hidden="true" className="h-4 w-4 shrink-0" />
  );
}

function SparkleIcon() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 bg-[#737373]"
      style={{
        WebkitMask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
        mask: 'url("/logos/dashboard/ai-generated.svg") center / contain no-repeat',
      }}
    />
  );
}
