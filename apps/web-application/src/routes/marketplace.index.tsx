import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketing/MarketplacePages";
export const Route=createFileRoute("/marketplace/")({ component: () => <MarketplacePage category="Components" overview /> });
