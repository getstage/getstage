import { FigmaLogo, FileText, ImageSquare, Sparkle, UploadSimple } from "@phosphor-icons/react";
import {
  AiGeneratedMeta,
  ModulePanel,
  PrimaryButton,
  StatusPill,
  WhiteCard,
} from "@/components/project/ProjectAiModulePrimitives";

type AssetsTabProps = {
  projectName: string;
};

const wireframeAssets = [
  { name: "Homepage Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Research Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Strategy Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Moodboard Wireframe", date: "6th April, 2025", priority: "P0" },
  { name: "Flows Wireframe", date: "6th April, 2025", priority: "P1" },
  { name: "Assets Wireframe", date: "6th April, 2025", priority: "P1" },
] as const;

const documentAssets = [
  { name: "Research Summary", date: "6th April, 2025" },
  { name: "Strategy Notes", date: "6th April, 2025" },
] as const;

const uploadedAssets = [
  { name: "Brand Logo", date: "6th April, 2025" },
  { name: "Client Brief", date: "6th April, 2025" },
] as const;

export function AssetsTab({ projectName: _projectName }: AssetsTabProps) {
  return (
    <div className="space-y-[18px] pb-20">
      <button
        type="button"
        className="w-full rounded-[12px] border-2 border-dashed border-[#D4D4D4] bg-[#FAFAFA] text-left transition-colors hover:border-[#7B76DF] hover:bg-[#F5F5FF]"
      >
        <div className="flex min-h-[164px] items-center justify-center px-6 py-11">
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

      <ModulePanel
        title="Wireframes"
        action={<span className="text-[12px] font-medium leading-[1.5] text-[#737373]">({wireframeAssets.length} Files)</span>}
        bodyClassName="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 lg:grid-cols-3"
      >
        {wireframeAssets.map((asset) => (
          <WireframeAssetCard key={asset.name} asset={asset} />
        ))}
      </ModulePanel>

      <ModulePanel
        title="Documents"
        action={<span className="text-[12px] font-medium leading-[1.5] text-[#737373]">({documentAssets.length} Files)</span>}
        bodyClassName="grid gap-3 p-3 md:grid-cols-2"
      >
        {documentAssets.map((asset) => (
          <SimpleAssetCard key={asset.name} icon="document" name={asset.name} date={asset.date} />
        ))}
      </ModulePanel>

      <ModulePanel
        title="Uploads"
        action={<span className="text-[12px] font-medium leading-[1.5] text-[#737373]">({uploadedAssets.length} Files)</span>}
        bodyClassName="grid gap-3 p-3 md:grid-cols-2"
      >
        {uploadedAssets.map((asset) => (
          <SimpleAssetCard key={asset.name} icon="upload" name={asset.name} date={asset.date} />
        ))}
      </ModulePanel>
    </div>
  );
}

function WireframeAssetCard({
  asset,
}: {
  asset: (typeof wireframeAssets)[number];
}) {
  return (
    <WhiteCard className="flex h-[336px] min-w-0 flex-col rounded-[8px] border-0 p-0.5">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[6px] bg-[#E5E5E5] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]">
        <ImageSquare size={24} className="text-[#525252]" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-[15px] font-medium leading-none text-[#171717]">
              {asset.name}
            </p>
            <AiGeneratedMeta />
          </div>
          <span className="shrink-0 whitespace-nowrap text-[12px] font-medium leading-[1.5] text-[#737373]">
            {asset.date}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <StatusPill tone="purple" className="h-7 text-[12px]">{asset.priority}</StatusPill>
          <PrimaryButton className="h-8">
            <FigmaLogo size={14} />
            Open in Figma
          </PrimaryButton>
        </div>
      </div>
    </WhiteCard>
  );
}

function SimpleAssetCard({
  icon,
  name,
  date,
}: {
  icon: "document" | "upload";
  name: string;
  date: string;
}) {
  const Icon = icon === "document" ? FileText : Sparkle;
  return (
    <WhiteCard className="flex items-center justify-between gap-4 border-0 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#F5F5F5]">
          <Icon size={20} className="text-[#525252]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium leading-none text-[#171717]">{name}</p>
          <p className="mt-2 text-[12px] font-medium text-[#737373]">{date}</p>
        </div>
      </div>
      <StatusPill tone="neutral" className="h-7 text-[12px]">
        Saved
      </StatusPill>
    </WhiteCard>
  );
}
