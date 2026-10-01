import { createFileRoute } from "@tanstack/react-router";
import { ResourceDetailPage } from "@/components/marketing/MarketplacePages";
export const Route=createFileRoute("/skills/$slug")({ component: Page });
function Page(){const {slug}=Route.useParams();return <ResourceDetailPage id={"skills/"+slug}/>;}
