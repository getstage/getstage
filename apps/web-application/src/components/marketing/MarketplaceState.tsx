import {
  Component,
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useAuth } from "@/lib/auth";
import catalog from "@/marketing/marketplace/catalog.json";

export type Profile = {
  customBanner?: string;
  name: string;
  handle: string;
  bio: string;
  location: string;
  roles: string[];
  technologies: string[];
  banner: string;
  github: string;
  x: string;
  instagram: string;
  linkedin: string;
  website: string;
  email: string;
  published: boolean;
  items: string[];
};
export type ProfileInput = Omit<Profile, "items">;
export const profileApi = {
  mine: makeFunctionReference<"query", Record<string, never>, Profile | null>(
    "builderProfiles:mine",
  ),
  public: makeFunctionReference<"query", { handle: string }, Profile | null>(
    "builderProfiles:byHandle",
  ),
  save: makeFunctionReference<"mutation", ProfileInput, string>(
    "builderProfiles:save",
  ),
  setSaved: makeFunctionReference<
    "mutation",
    { itemId: string; saved: boolean },
    { saved: boolean }
  >("builderProfiles:setSaved"),
};
export { catalog };
export type CatalogItem = (typeof catalog)[number];
export function profileLoginUrl(path: string) {
  return `/auth?redirect=${encodeURIComponent(path)}`;
}

export class ProfileBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="profile-service-error" role="alert">
        <h2>Profiles are temporarily unavailable</h2>
        <p>Please try again later. You can still browse the marketplace.</p>
        <a className="button button-neutral" href="/marketplace">
          Browse marketplace
        </a>
      </div>
    ) : (
      this.props.children
    );
  }
}

type SavedState = {
  profile: Profile | null | undefined;
  busy: string | null;
  save: (item: CatalogItem) => Promise<void>;
  message: string;
};
const SavedContext = createContext<SavedState | null>(null);
export function SavedProvider({ children }: { children: ReactNode }) {
  if (typeof window === "undefined")
    return (
      <SavedContext.Provider
        value={{ profile: null, busy: null, message: "", save: async () => {} }}
      >
        {children}
      </SavedContext.Provider>
    );
  return (
    <SavedServiceBoundary>
      <ConnectedSavedProvider>{children}</ConnectedSavedProvider>
    </SavedServiceBoundary>
  );
}
class SavedServiceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <UnavailableSavedProvider>{this.props.children}</UnavailableSavedProvider>
    ) : (
      this.props.children
    );
  }
}
function UnavailableSavedProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  return (
    <SavedContext.Provider
      value={{
        profile: null,
        busy: null,
        message,
        save: async () =>
          setMessage(
            "Saving is temporarily unavailable. Please try again later.",
          ),
      }}
    >
      {children}
      {message && (
        <p className="market-feedback" role="alert">
          {message}
        </p>
      )}
    </SavedContext.Provider>
  );
}
function ConnectedSavedProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const profile = useQuery(profileApi.mine, isAuthenticated ? {} : "skip");
  const update = useMutation(profileApi.setSaved);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function save(item: CatalogItem) {
    if (isLoading || busy) return;
    if (!isAuthenticated) {
      window.location.assign(
        profileLoginUrl(`/profile?save=${encodeURIComponent(item.id)}`),
      );
      return;
    }
    if (profile === undefined) {
      setMessage("Your profile is loading. Try again in a moment.");
      return;
    }
    if (!profile) {
      window.location.assign(`/profile?save=${encodeURIComponent(item.id)}`);
      return;
    }
    setBusy(item.id);
    setMessage("");
    try {
      const saved = !profile.items.includes(item.id);
      await update({ itemId: item.id, saved });
      setMessage(
        `${item.name} ${saved ? "saved to" : "removed from"} your profile.`,
      );
    } catch {
      setMessage("Couldn't save your change. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <SavedContext.Provider value={{ profile, busy, save, message }}>
      {children}
      {message && (
        <p className="market-feedback" role="status">
          {message} <a href="/profile">My profile</a>
        </p>
      )}
    </SavedContext.Provider>
  );
}
export function useSaved() {
  const value = useContext(SavedContext);
  if (!value) throw new Error("SavedProvider is required");
  return value;
}
