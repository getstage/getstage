import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketing/MarketplacePages";
export const Route=createFileRoute("/tools/")({ component: () => <MarketplacePage category="Tools" /> });
