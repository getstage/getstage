import { useEffect } from "react";

export function useBillingSuccessEvent({
  enabled,
  onSuccess,
}: {
  enabled: boolean;
  onSuccess: () => Promise<unknown>;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get("billing") !== "success") {
      return;
    }

    void onSuccess()
      .catch((error) => {
        console.error("Could not send first payment event", error);
      })
      .finally(() => {
        url.searchParams.delete("billing");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      });
  }, [enabled, onSuccess]);
}
