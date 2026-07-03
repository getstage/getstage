import { STAGE_PROTOCOL } from "./auth";

// Billing return deep link. After checkout in the external browser, the public
// web return page (getBillingUrls, platform "desktop") redirects to
// `stage://billing/<status>` so the OS refocuses Stage. Credits already update
// reactively via Convex, so we only need to bring the window forward.
export const DESKTOP_BILLING_HOST = "billing";

export function isStageBillingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === `${STAGE_PROTOCOL}:` && url.hostname === DESKTOP_BILLING_HOST;
  } catch {
    return false;
  }
}
