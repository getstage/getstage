import { createFileRoute } from "@tanstack/react-router";
import { StageDownloadPage } from "@/components/stage-landing/StageDownloadPage";

export const Route = createFileRoute("/download")({
  component: StageDownloadPage,
});
