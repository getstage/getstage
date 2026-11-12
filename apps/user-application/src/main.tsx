import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ConvexProviderWithAuth, useQuery } from "convex/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { DesktopAuthProvider, ElectronAuthProvider, useElectronAuthForConvex } from "./lib/auth";
import { api, convex } from "./lib/convex";
import { identifyUser } from "./lib/analytics";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
import { useRecordAppOpened } from "./hooks/useRecordAppOpened";
import "./styles/globals.css";
import "./styles/desktop.css";
import { BrandLogoProvider, brandfetchLogoUrl } from "@stage/project-ui";
import { MacPlatformProvider } from "@/lib/platform";
import { setUploadTransport } from "@stage/project-ui/r2Uploads";

if (new URLSearchParams(window.location.search).get("stageWindow") === "companion") {
  document.documentElement.classList.add("stage-companion-document");
  document.body.classList.add("stage-companion-body");
}

const brandLogoUrl = brandfetchLogoUrl(import.meta.env.VITE_BRANDFETCH_CLIENT_ID);
const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Missing root element.");
}

// Fires the app_downloaded email event once the desktop user is signed in.
// Rendered inside DesktopAuthProvider + ConvexProviderWithAuth so both the auth
// state and the mutation client are available.
function RecordAppOpenedOnAuth() {
  useRecordAppOpened();
  return null;
}

// Links PostHog events to the signed-in Stage account; signing out starts a new anonymous profile.
function IdentifyAnalyticsUser() {
  const viewer = useQuery(api.viewer.getIdentity);
  useEffect(() => {
    if (viewer !== undefined) identifyUser(viewer ? { id: viewer.id, email: viewer.email } : null);
  }, [viewer?.id, viewer?.email]);
  return null;
}

// R2 uploads go through the desktop bridge when it's there (the renderer can't PUT to R2 directly).
const putR2Upload = window.stageDesktop?.storage?.putR2Upload;
if (putR2Upload) {
  setUploadTransport(async ({ uploadUrl, mimeType, file }) => {
    await putR2Upload({ uploadUrl, mimeType, bytes: new Uint8Array(await file.arrayBuffer()) });
  });
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ElectronAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useElectronAuthForConvex}>
        <QueryClientProvider client={queryClient}>
          <DesktopAuthProvider>
            <RecordAppOpenedOnAuth />
            <IdentifyAnalyticsUser />
            <MacPlatformProvider>
              <BrandLogoProvider logoUrl={brandLogoUrl}>
                <RouterProvider router={router} />
              </BrandLogoProvider>
            </MacPlatformProvider>
          </DesktopAuthProvider>
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </ElectronAuthProvider>
  </React.StrictMode>,
);
