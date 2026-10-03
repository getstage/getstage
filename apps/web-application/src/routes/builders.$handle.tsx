import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/marketing/ProfilePage";
export const Route=createFileRoute("/builders/$handle")({component:Page});
function Page(){const {handle}=Route.useParams();return <ProfilePage handle={handle}/>;}
