import { createFileRoute, redirect } from "@tanstack/react-router";
import GuideImportTransactionsViaGoogleSheetsDocs from "@/components/help/guide-import-transactions-via-google-sheets";

export const Route = createFileRoute("/help/import-transactions-via-google-sheets")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: GuideImportTransactionsViaGoogleSheetsDocs,
});

