import { useState } from "react";
import { useAction as useConvexAction } from "convex/react";
import { Link, useMatches } from "@tanstack/react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import { UpgradePricingModal } from "@/components/billing/UpgradePricingModal";
import type { BillingCycle } from "@/components/onboarding/OnboardingPaywall";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { getDatafastCheckoutMetadata, trackDatafastGoal } from "@/lib/datafast";
import { toUserFacingErrorMessage } from "@/lib/errors";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileDropdown } from "@/components/shared/ProfileDropdown";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export function Navbar() {
  const { user } = useAuth();
  const matches = useMatches();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const createCheckoutSession = useConvexAction(api.billing.createCheckoutSession);

  // Determine breadcrumb context from current route
  const isProjectDetail = matches.some((m) => m.routeId.includes("project.$id"));
  const isTaskDetail = matches.some((m) => m.routeId.includes("task.$taskId"));
  const showBackLink = isProjectDetail || isTaskDetail;

  function handleOpenUpgrade() {
    setUpgradeError(null);
    setUpgradeOpen(true);
  }

  function handleCloseUpgrade() {
    if (isUpgradeLoading) {
      return;
    }

    setUpgradeOpen(false);
    setUpgradeError(null);
  }

  async function handleUpgrade(billingCycle: BillingCycle) {
    setIsUpgradeLoading(true);
    setUpgradeError(null);

    try {
      const result = await createCheckoutSession({
        billingCycle,
        source: "navbar_upgrade",
        ...getDatafastCheckoutMetadata(),
      });
      if (!result.url) {
        throw new Error("Stripe checkout URL is missing.");
      }
      trackDatafastGoal("checkout_started", {
        source: "navbar_upgrade",
        billing_cycle: billingCycle,
        plan: "pro",
      });
      window.location.assign(result.url);
    } catch (error) {
      setUpgradeError(
        toUserFacingErrorMessage(error, "Could not start checkout right now. Please try again."),
      );
      setIsUpgradeLoading(false);
    }
  }

  return (
    <>
      <header className="top-0 z-40 bg-white">
        <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center justify-between px-6 sm:px-10 lg:px-14">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="inline-flex items-center">
              <img src={stageLogo} alt="Stage" className="h-[22px] w-auto" />
            </Link>
            {showBackLink && (
              <Link
                to="/dashboard"
                className="flex items-center gap-[5px] text-[13px] text-text-secondary transition-colors hover:text-text-primary"
              >
                <ArrowLeft size={14} weight="regular" />
                Dashboard
              </Link>
            )}
          </div>

          <div />

          <div className="flex items-center gap-4">
            {user?.plan === "free" && (
              <button
                type="button"
                onClick={handleOpenUpgrade}
                className="cursor-pointer text-[14px] font-medium text-accent transition-colors hover:text-accent-hover"
              >
                Upgrade
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="cursor-pointer rounded-full transition-opacity hover:opacity-80"
              >
                <Avatar
                  name={user?.name ?? "User"}
                  src={user?.avatarUrl}
                  size="sm"
                />
              </button>

              {dropdownOpen && user && (
                <ProfileDropdown
                  user={user}
                  onClose={() => setDropdownOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <UpgradePricingModal
        open={upgradeOpen}
        onClose={handleCloseUpgrade}
        onUpgrade={(billingCycle) => {
          void handleUpgrade(billingCycle);
        }}
        isLoading={isUpgradeLoading}
        errorMessage={upgradeError}
      />
    </>
  );
}
