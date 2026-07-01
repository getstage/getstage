import { useState } from "react";
import { useQuery } from "convex/react";
import { useAssetsTab } from "@/hooks/project";
import { useFigmaWireframeExport } from "@/hooks/project/assets/useFigmaWireframeExport";
import { useWireframeDeliveryExport } from "@/hooks/project/assets/useWireframeDeliveryExport";
import { useProjectAssetUploads } from "@/hooks/project/useProjectAssetUploads";
import { api } from "@/lib/convexApi";
import type { Project } from "@/models/project/project";
import type { AssetView, WireframeAssetCard } from "@/types/project/assetsTab";
import type { WireframeKind } from "@/types/project/wireframesTab";
import { AssetCard } from "./AssetCard";
import { AssetCategoryTabs } from "./AssetCategoryTabs";
import { FidelityToggle } from "../wireframes/FidelityToggle";
import { DocumentsGrid } from "./DocumentsGrid";
import { ExportOptionsDialog } from "./ExportOptionsDialog";
import { UploadDropzone } from "./UploadDropzone";
import { UploadedGrid } from "./UploadedGrid";

export function AssetsTab({ project }: { project: Project }) {
  const [activeView, setActiveView] = useState<AssetView>("wireframes");
  const [exportAsset, setExportAsset] = useState<WireframeAssetCard | null>(null);
  const [fidelityView, setFidelityView] = useState<WireframeKind>("hifi");

  const uploads = useProjectAssetUploads(() => setActiveView("uploaded"), project.id);
  const assetsTab = useAssetsTab({ id: project.id, name: project.name }, uploads.uploadedAssets.length);
  const figmaExport = useFigmaWireframeExport(project.id);
  const deliveryExport = useWireframeDeliveryExport(project.id);
  const nativeConnections = useQuery(
    api.integrations.contentPlatforms.getNativeConnectionStatus,
    {},
  );
  const { wireframeAssets, documents } = assetsTab.tabData;

  const sectionTitle = assetsTab.categories.find((category) => category.id === activeView)?.label ?? "Documents";
  // A Hi-Fi artifact keeps each screen's Lo-Fi blocks, so the same view switch the
  // Wireframes tab uses works here to flip the asset previews between fidelities.
  const canToggleFidelity = wireframeAssets.some(
    (asset) => asset.type === "hifi" && asset.html?.trim(),
  );
  const effectiveFidelity: WireframeKind = canToggleFidelity ? fidelityView : "lofi";

  return (
    <section className="flex w-full flex-col gap-[18px]">
      <UploadDropzone
        accept={uploads.accept}
        isDragActive={uploads.isDragActive}
        onDragState={uploads.setIsDragActive}
        onDrop={uploads.handleDrop}
        onInputChange={uploads.handleInputChange}
      />

      <div className="overflow-hidden rounded-[12px] bg-[#F5F5F5] p-1 shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <h2 className="font-heading text-[15px] font-medium leading-[1.25] text-[#171717]">
                {sectionTitle}
              </h2>
              <AssetCategoryTabs
                categories={assetsTab.categories}
                activeView={activeView}
                onChange={setActiveView}
              />
            </div>
          </div>

          {activeView === "documents" ? <DocumentsGrid documents={documents} /> : null}
          {activeView === "uploaded" ? (
            <>
              {uploads.deleteError ? (
                <p className="mx-4 mb-1 rounded-[6px] bg-[#FEF2F2] p-2 text-[12px] font-medium leading-[1.25] text-[#991B1B]">
                  {uploads.deleteError}
                </p>
              ) : null}
              <UploadedGrid
                uploads={uploads.uploadedAssets}
                onDelete={(key) => {
                  if (window.confirm("Delete this file? This removes it from the project.")) {
                    void uploads.deleteAsset(key);
                  }
                }}
              />
            </>
          ) : null}

          {activeView === "wireframes" ? (
            <>
              {canToggleFidelity ? (
                <div className="px-4 pb-1">
                  <FidelityToggle value={effectiveFidelity} onChange={setFidelityView} />
                </div>
              ) : null}
              <div className="grid gap-1 lg:grid-cols-3">
                {wireframeAssets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    view={effectiveFidelity}
                    onExport={() => setExportAsset(asset)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ExportOptionsDialog
        asset={exportAsset}
        figmaConnected={nativeConnections?.figma?.status === "active"}
        exportRequest={figmaExport.request}
        exportJob={figmaExport.job}
        exportError={figmaExport.error}
        deliveryMessage={deliveryExport.message}
        deliveryError={deliveryExport.error}
        isExporting={figmaExport.isExporting || deliveryExport.isExporting}
        onExportFigma={async (asset) => {
          await figmaExport.startExport(asset);
        }}
        onExportDelivery={deliveryExport.startExport}
        open={exportAsset !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExportAsset(null);
            figmaExport.reset();
            deliveryExport.reset();
          }
        }}
      />
    </section>
  );
}
