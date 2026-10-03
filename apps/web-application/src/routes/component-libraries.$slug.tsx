import { createFileRoute } from "@tanstack/react-router";
import { ResourceDetailPage } from "@/components/marketing/MarketplacePages";
export const Route=createFileRoute("/component-libraries/$slug")({ component: Page });
function Page(){const {slug}=Route.useParams();return <ResourceDetailPage id={"component-libraries/"+slug}/>;}
