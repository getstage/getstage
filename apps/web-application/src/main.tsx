import { PageLoading } from "@/components/shared/PageLoading";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrandLogoProvider, brandfetchLogoUrl } from "@stage/project-ui";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "@/lib/auth";
import { convex } from "@/lib/convex";
import "@/styles/globals.css";

// Same setup as Stage for Mac, so the shared screens' Convex queries (convexQuery) work here too.
// Competitor logos in Research, same Brandfetch client id as Stage for Mac (VITE_BRANDFETCH_CLIENT_ID).
const brandLogoUrl = brandfetchLogoUrl(import.meta.env.VITE_BRANDFETCH_CLIENT_ID);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: PageLoading,
  defaultPendingMs: 150,
  defaultPendingMinMs: 200,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootEl = document.getElementById("root")!;

createRoot(rootEl).render(
  <StrictMode>
    <HelmetProvider>
      <ConvexAuthProvider client={convex}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrandLogoProvider logoUrl={brandLogoUrl}>
              <RouterProvider router={router} />
            </BrandLogoProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ConvexAuthProvider>
    </HelmetProvider>
  </StrictMode>,
);
