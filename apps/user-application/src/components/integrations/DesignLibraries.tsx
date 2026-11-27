import { useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { Link } from "@tanstack/react-router";
import type { Id } from "@stage/data-ops/convex/data-model";
import type { ProjectCategory } from "@stage/data-ops/contracts";
import { api } from "@/lib/convexApi";
import { openExternalLink } from "@/lib/settings/openExternalLink";

// The user's own inspiration libraries (Mobbin, Refero, Details) in Stage for Mac: connecting them from where
// they're missing, the Research form's pick between Mobbin and Refero, and the end-of-shared-access banner (STA-78).

type DesignLibrary = "mobbin" | "refero" | "details";

const LABEL: Record<DesignLibrary, string> = { mobbin: "Mobbin", refero: "Refero", details: "Details" };

const BUTTON =
  "rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-white px-2.5 py-1 text-[12px] font-medium text-[#171717] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)] disabled:opacity-60";

/** Opens the library's sign-in in the browser; it comes back to Stage through the stage:// link. */
function useConnectLibrary() {
  const startConnect = useAction(api.integrations.contentPlatforms.startOAuthConnect);
  const [error, setError] = useState<string>();
  const connect = async (library: DesignLibrary) => {
    setError(undefined);
    try {
      const returnUrl = await window.stageDesktop.integrations.getOAuthReturnUrl(library);
      const { url } = await startConnect({ provider: library, returnUrl });
      await openExternalLink(url);
    } catch {
      setError(`Could not start connecting ${LABEL[library]}. Try again.`);
    }
  };
  return { connect, error };
}

/** Research without UI patterns: what's missing for this project type, and Connect buttons that start right away. */
export function UiPatternsEmptyState({ projectCategory }: { projectCategory: ProjectCategory }) {
  const { connect, error } = useConnectLibrary();
  const website = projectCategory === "websites";
  const libraries: DesignLibrary[] = website ? ["details"] : ["mobbin", "refero"];
  return (
    <section className="flex flex-col gap-3 rounded-[8px] border border-dashed border-[#D4D4D4] bg-[#FAFAFA] p-5">
      <p className="text-[13px] text-[#525252]">
        No UI patterns yet: Research needs your {website ? "Details" : "Mobbin or Refero"} account for real{" "}
        {website ? "website sections" : "screens"}. Connect it, then run Research again.
      </p>
      <div className="flex gap-2">
        {libraries.map((library) => (
          <button key={library} type="button" className={BUTTON} onClick={() => void connect(library)}>
            Connect {LABEL[library]}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
    </section>
  );
}

/** The Research form's choice between the user's Mobbin and Refero; only shown when both are connected. */
export function ScreenLibraryPicker({ projectId, label }: { projectId: string; label: string }) {
  const library = useQuery(api.projectAi.getScreenLibrary, { projectId: projectId as Id<"projects"> });
  const setScreenLibrary = useMutation(api.projectAi.setScreenLibrary);
  if (!library?.choices) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-[#171717]">{label}</p>
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {library.choices.map((choice) => (
        <button
          key={choice}
          type="button"
          role="radio"
          aria-checked={library.screens === choice}
          onClick={() => void setScreenLibrary({ projectId: projectId as Id<"projects">, screenLibrary: choice })}
          className={library.screens === choice ? `${BUTTON} border-[#7B76DF] bg-[#F5F4FF] text-[#221E6C]` : BUTTON}
        >
          {LABEL[choice]}
        </button>
      ))}
    </div>
    </div>
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
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.integrations.sharedRefero.status, isAuthenticated ? {} : "skip");
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
    <div role="status" className="fixed bottom-4 left-1/2 z-50 flex w-[min(640px,calc(100%-32px))] -translate-x-1/2 items-start justify-between gap-3 rounded-[8px] border border-[#DBD9FC] bg-[#F5F4FF] px-4 py-3 shadow-[0_4px_16px_-6px_rgba(10,10,10,0.25)]">
      <p className="text-[13px] text-[#221E6C]">
        Stage now uses your own Refero, Mobbin or Details account. Our shared access ends on December 31. Connect yours to keep
        references working.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link to="/integrations" className={BUTTON}>Connect</Link>
        <button type="button" onClick={dismiss} className="text-[12px] font-medium text-[#525252] hover:text-[#171717]">
          Dismiss
        </button>
      </div>
    </div>
  );
}
