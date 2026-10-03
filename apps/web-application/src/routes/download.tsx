import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { StageDownloadPage } from "@/components/stage-landing/StageDownloadPage";

export const Route = createFileRoute("/download")({
  component: DownloadRoute,
});

function DownloadRoute() {
  const pathname = useLocation({ select: location => location.pathname });
  return pathname.replace(/\/$/, "") === "/download" ? <StageDownloadPage /> : <Outlet />;
}
