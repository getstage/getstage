import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles/globals.css";
import "./styles/desktop.css";

if (new URLSearchParams(window.location.search).get("stageWindow") === "companion") {
  document.documentElement.classList.add("stage-companion-document");
  document.body.classList.add("stage-companion-body");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Missing root element.");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
