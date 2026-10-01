import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketing/MarketplacePages";
export const Route=createFileRoute("/skills/")({ component: () => <MarketplacePage category="Skills" /> });
