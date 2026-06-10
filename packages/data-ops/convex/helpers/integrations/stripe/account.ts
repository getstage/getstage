import Stripe from "stripe";

export function getAccountDisplayName(account: Stripe.Account) {
  const dashboardSettings = account.settings?.dashboard as { display_name?: string } | undefined;
  return (
    account.business_profile?.name ||
    account.business_type ||
    dashboardSettings?.display_name ||
    undefined
  );
}

export function getAccountConnectionStatus(account: Stripe.Account) {
  return Boolean(account.details_submitted && account.charges_enabled) ? "active" : "pending";
}
