import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProviderWithAuth } from "convex/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { DesktopAuthProvider, ElectronAuthProvider, useElectronAuthForConvex } from "./lib/auth";
import { convex } from "./lib/convex";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
import { useRecordAppOpened } from "./hooks/useRecordAppOpened";
import "./styles/globals.css";
import "./styles/desktop.css";

if (new URLSearchParams(window.location.search).get("stageWindow") === "companion") {
  document.documentElement.classList.add("stage-companion-document");
  document.body.classList.add("stage-companion-body");
}

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

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ElectronAuthProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useElectronAuthForConvex}>
        <QueryClientProvider client={queryClient}>
          <DesktopAuthProvider>
            <RecordAppOpenedOnAuth />
            <RouterProvider router={router} />
          </DesktopAuthProvider>
        </QueryClientProvider>
      </ConvexProviderWithAuth>
    </ElectronAuthProvider>
  </React.StrictMode>,
);
