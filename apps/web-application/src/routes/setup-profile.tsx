import { createFileRoute } from "@tanstack/react-router";
import { ProfileSetupPage } from "@/components/marketing/ProfileSetupPage";
export const Route = createFileRoute("/setup-profile")({ component: ProfileSetupPage });
