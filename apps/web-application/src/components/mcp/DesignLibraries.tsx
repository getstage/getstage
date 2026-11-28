import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import type { ProjectCategory } from "@stage/data-ops/contracts";
import { api } from "@/lib/convex";

// The user's own inspiration libraries (Mobbin, Refero, Details): connecting them, the Research empty state and
// the banner about the end of Stage's shared access (STA-78).

export type DesignLibrary = "mobbin" | "refero" | "details";

export const LIBRARY_LABEL: Record<DesignLibrary, string> = { mobbin: "Mobbin", refero: "Refero", details: "Details" };

/** Starts the library's sign-in straight away; it returns to Integrations when done. */
export function useConnectLibrary() {
  const startConnect = useAction(api.integrations.contentPlatforms.startOAuthConnect);
  const [error, setError] = useState<string>();
  const connect = async (library: DesignLibrary) => {
    setError(undefined);
    try {
      const { url } = await startConnect({ provider: library });
      if (url) window.location.assign(url);
    } catch {
      setError(`Could not start connecting ${LIBRARY_LABEL[library]}. Try again.`);
    }
  };
  return { connect, error };
}

const BUTTON = "rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-2.5 py-1 text-[12px] font-medium text-[#171717] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]";

/** Research without UI patterns: says which library the project type needs and connects it in one click. */
export function UiPatternsEmptyState({ category }: { category: ProjectCategory }) {
  const status = useQuery(api.integrations.contentPlatforms.getNativeConnectionStatus);
  const { connect, error } = useConnectLibrary();
  const libraries: DesignLibrary[] = category === "websites" ? ["details"] : ["mobbin", "refero"];
  const needed = category === "websites" ? "Details" : "Mobbin or Refero";
  const results = category === "websites" ? "website sections" : "screens";
  const connected = libraries.find((library) => status?.[library]?.status === "active");
  if (status === undefined) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[8px] border border-dashed border-[#D4D4D4] bg-[#FAFAFA] p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-medium text-[#171717]">UI Patterns</h2>
        <p className="text-[13px] text-[#525252]">
          {connected
            ? `${LIBRARY_LABEL[connected]} returned no ${results} for this Research, for example because your account is out of credits or over its limit. Run Research again later.`
            : `This Research has no UI patterns because no ${needed} account is connected. Connect yours, then run Research again to get real ${results} as UI patterns.`}
        </p>
      </div>
      <div className="flex gap-2">
        {connected ? null : libraries.map((library) => (
          <button key={library} type="button" className={BUTTON} onClick={() => void connect(library)}>
            Connect {LIBRARY_LABEL[library]}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
    </section>
  );
}

const DISMISSED_KEY = "stage.sharedAccessBanner.dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** For users who had Stage before own accounts: Stage's shared access ends on 31 December. */
export function SharedAccessBanner() {
  const status = useQuery(api.integrations.sharedRefero.status);
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!status?.showBanner || dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // The banner just comes back next time.
    }
  };
  return (
    <div role="status" className="flex items-start justify-between gap-3 rounded-[8px] border border-[#DBD9FC] bg-[#F5F4FF] px-4 py-3">
      <p className="text-[13px] text-[#221E6C]">
        Stage now uses your own Refero, Mobbin or Details account. Our shared access ends on December 31. Connect yours to keep
        references working.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link to="/app/integrations" className={BUTTON}>Connect</Link>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-[12px] font-medium text-[#525252] hover:text-[#171717]">
          Dismiss
        </button>
      </div>
    </div>
  );
}

const LIBRARY_DETAIL: Record<DesignLibrary, { icon: string; detail: string }> = {
  mobbin: { icon: "/logos/integrations/mobbin.svg", detail: "App and web screens for Research UI patterns and moodboards" },
  refero: { icon: "/logos/refero.svg", detail: "App and web screens for Research UI patterns and moodboards" },
  details: { icon: "/logos/integrations/details.png", detail: "Website sections for website Research" },
};

/** Onboarding, right after the AI tool: connect the user's own inspiration library (Stage's credits are never used). */
export function ConnectLibrariesCard() {
  const status = useQuery(api.integrations.contentPlatforms.getNativeConnectionStatus);
  const { connect, error } = useConnectLibrary();
  return (
    <section className="flex flex-col gap-3 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-white p-5 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[13px] font-medium text-[#171717]">Connect your inspiration library</h2>
        <p className="text-[12px] text-[#525252]">Research and moodboards use real screens from your own account. Apps: Mobbin or Refero. Websites: Details.</p>
      </div>
      {(["mobbin", "refero", "details"] as const).map((library) => {
        const connected = status?.[library]?.status === "active";
        return (
          <div key={library} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-4 shrink-0 items-center justify-center">
                <img src={LIBRARY_DETAIL[library].icon} alt="" className="max-h-4 max-w-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-medium text-[#171717]">{LIBRARY_LABEL[library]}</span>
                <span className="text-[12px] text-[#525252]">{LIBRARY_DETAIL[library].detail}</span>
              </span>
            </span>
            {status === undefined ? null : connected ? (
              <span className="text-[12px] font-medium text-[#047857]">Connected</span>
            ) : (
              <button type="button" className={BUTTON} onClick={() => void connect(library)}>Connect</button>
            )}
          </div>
        );
      })}
      {error ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
    </section>
  );
}
