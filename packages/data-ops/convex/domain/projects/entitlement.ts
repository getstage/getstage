import { isPaidPlan } from "../billing/plans";

const FREE_PROJECT_LIMIT = 1;

export const PROJECT_UPGRADE_REQUIRED_MESSAGE =
  "Upgrade to Pro to create another project.";

type ProjectCreationEntitlementInput = {
  plan: string | null | undefined;
  projectCount: number;
};

export function isProjectUpgradeRequired({
  plan,
  projectCount,
}: ProjectCreationEntitlementInput) {
  if (isPaidPlan(plan)) {
    return false;
  }

  return projectCount >= FREE_PROJECT_LIMIT;
}

export function assertProjectCreationAllowed(
  input: ProjectCreationEntitlementInput,
) {
  if (isProjectUpgradeRequired(input)) {
    throw new Error(PROJECT_UPGRADE_REQUIRED_MESSAGE);
  }
}
