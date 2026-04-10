import {
  UploadSimple,
  MagnifyingGlass,
  FileText,
  Image,
} from "@phosphor-icons/react";

type AssetsTabProps = {
  projectName: string;
};

type BadgeVariant = "aiGenerated" | "complete" | "shared" | "uploaded";

const badgeStyles: Record<BadgeVariant, string> = {
  aiGenerated: "bg-[#EEEDFE] text-accent",
  complete: "bg-[#EDFCF2] text-[#22C55E]",
  shared: "bg-[#EFF6FF] text-[#3B82F6]",
  uploaded: "bg-bg-subtle text-text-secondary",
};

function AssetBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeStyles[variant]}`}
    >
      {label}
    </span>
  );
}

const wireframeAssets = [
  { name: "Homepage Wireframe", date: "Apr 6" },
  { name: "Product Page Wireframe", date: "Apr 6" },
  { name: "Pricing Page Wireframe", date: "Apr 6" },
  { name: "Demo Page Wireframe", date: "Apr 6" },
] as const;

const documentAssets = [
  {
    name: "Brand Research Report",
    icon: MagnifyingGlass,
    iconBg: "bg-accent/10 text-accent",
    description: "Company overview, 4 competitors, market insights",
    badge: "complete" as BadgeVariant,
    badgeLabel: "Complete",
    date: "Apr 2",
  },
  {
    name: "Website Strategy Document",
    icon: FileText,
    iconBg: "bg-[#EFF6FF] text-[#3B82F6]",
    description: "6 sections — Goals, User Journeys, Sitemap, Content, Conversion, Tech",
    badge: "shared" as BadgeVariant,
    badgeLabel: "Shared",
    date: "Apr 4",
  },
] as const;

const uploadAssets = [
  {
    name: "Client Brief.pdf",
    icon: FileText,
    date: "Mar 10",
  },
  {
    name: "Logo_Current.png",
    icon: Image,
    date: "Mar 10",
  },
] as const;

export function AssetsTab({ projectName: _projectName }: AssetsTabProps) {
  return (
    <div className="space-y-8">
      {/* File count */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-bg-subtle px-3 py-1 text-[13px] font-medium text-text-secondary">
          8 files
        </span>
      </div>

      {/* Upload zone */}
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-border px-6 py-10 transition-colors hover:border-accent/40 hover:bg-accent/[0.02]"
      >
        <UploadSimple size={24} className="text-text-tertiary" />
        <p className="text-[13px] text-text-secondary">
          Upload files or drag and drop — images, PDFs, fonts, design files
        </p>
      </button>

      {/* Wireframes section */}
      <section>
        <h3 className="mb-4 font-heading text-[15px] font-semibold text-text-primary">
          Wireframes{" "}
          <span className="font-normal text-text-secondary">(4 files)</span>
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wireframeAssets.map((asset) => (
            <div
              key={asset.name}
              className="overflow-hidden rounded-[12px] border border-border-subtle"
            >
              {/* Preview placeholder */}
              <div className="flex aspect-[16/10] items-center justify-center bg-bg-subtle">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="text-text-tertiary"
                >
                  <rect
                    x="4"
                    y="6"
                    width="24"
                    height="20"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <line
                    x1="4"
                    y1="12"
                    x2="28"
                    y2="12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect x="7" y="15" width="8" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
                  <rect x="7" y="20" width="12" height="1.5" rx="0.5" fill="currentColor" opacity="0.2" />
                </svg>
              </div>
              {/* Card info */}
              <div className="p-3">
                <p className="text-[13px] font-medium text-text-primary">
                  {asset.name}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <AssetBadge variant="aiGenerated" label="AI Generated" />
                  <span className="text-[11px] text-text-tertiary">{asset.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Documents section */}
      <section>
        <h3 className="mb-4 font-heading text-[15px] font-semibold text-text-primary">
          Documents{" "}
          <span className="font-normal text-text-secondary">(2 files)</span>
        </h3>
        <div className="space-y-3">
          {documentAssets.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center gap-4 rounded-[12px] border border-border-subtle p-4"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${doc.iconBg}`}
              >
                <doc.icon size={20} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-text-primary">
                  {doc.name}
                </p>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  {doc.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <AssetBadge variant={doc.badge} label={doc.badgeLabel} />
                <span className="text-[11px] text-text-tertiary">{doc.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Uploads section */}
      <section>
        <h3 className="mb-4 font-heading text-[15px] font-semibold text-text-primary">
          Uploads{" "}
          <span className="font-normal text-text-secondary">(2 files)</span>
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {uploadAssets.map((asset) => (
            <div
              key={asset.name}
              className="flex items-center gap-3 rounded-[12px] border border-border-subtle p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-bg-subtle text-text-secondary">
                <asset.icon size={20} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-text-primary">
                  {asset.name}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <AssetBadge variant="uploaded" label="Uploaded" />
                  <span className="text-[11px] text-text-tertiary">{asset.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
