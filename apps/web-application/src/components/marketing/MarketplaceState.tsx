import { readLocalProfile, writeLocalProfile } from "./localProfile";
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
import { ResourceSaveDialog } from "./ResourceDialogs";
import catalog from "@/marketing/marketplace/catalog.json";

export type Profile = {
  onboardingStep?: number;
  customAvatar?: string;
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
export type ProfileInput = Omit<Profile, "items" | "onboardingStep">;
export const profileApi = {
  username: makeFunctionReference<"query", { handle: string }, { available: boolean; suggestion: string }>("builderProfiles:username"),
  saveSetupStep: makeFunctionReference<"mutation", { profile: ProfileInput; step: 1 | 2 | 3; items: string[] }, string>("builderProfiles:saveSetupStep"),
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
      <SavedMode>{children}</SavedMode>
    </SavedServiceBoundary>
  );
}
function SavedMode({children}:{children:ReactNode}) {
 const {isAuthenticated}=useAuth();
 return !isAuthenticated&&readLocalProfile()?<LocalSavedProvider>{children}</LocalSavedProvider>:<ConnectedSavedProvider>{children}</ConnectedSavedProvider>;
}
function SavedNotification({item,close}:{item:CatalogItem;close:()=>void}) {
 const category=item.type==='Components'?'component libraries':item.type==='Skills'?'skills':'tools';
 const collection=item.type==='Components'?'Components':item.type==='Skills'?'Skills':'Tools';
 const href=`/profile?collection=${collection}#my-collection`;
 return <aside className="saved-profile-notification" role="status" aria-live="polite"><div className="saved-profile-notification-row"><img src="/marketplace-assets/notifications/success.svg" width={16} height={16} alt=""/><span>{item.name} added successfully.</span><button type="button" aria-label="Dismiss notification" onClick={close}><img src="/marketplace-assets/notifications/close.svg" width={15} height={15} alt=""/></button></div><a href={href}>View all {category}</a></aside>;
}
function LocalSavedProvider({children}:{children:ReactNode}) {
 const [profile,setProfile]=useState(readLocalProfile);
 const [added,setAdded]=useState<CatalogItem|null>(null);
 const [message,setMessage]=useState('');
 async function save(item:CatalogItem){
  const current=readLocalProfile();if(!current)return;
  try{const next={...current,items:Array.from(new Set([...current.items,item.id]))};writeLocalProfile(next);setProfile(next);setMessage('');setAdded(item);}catch{setMessage("Couldn't save your change. Please try again.");}
 }
 return <SavedContext.Provider value={{profile,busy:null,message,save}}>{children}{added&&<SavedNotification item={added} close={()=>setAdded(null)}/ >}{message&&<p className="market-feedback" role="status">{message} <a href="/profile?preview=1">My Profile</a></p>}</SavedContext.Provider>;
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
  const [pending, setPending] = useState<CatalogItem | null>(null);
  const [added,setAdded]=useState<CatalogItem|null>(null);
  async function save(item: CatalogItem) {
    if (isLoading || busy) return;
    if (!isAuthenticated) {
      setPending(item);
      return;
    }
    if (profile === undefined) {
      setMessage("Your profile is loading. Try again in a moment.");
      return;
    }
    setAdded(null);
    setBusy(item.id);
    setMessage("");
    try {
      const saved = true;
      await update({ itemId: item.id, saved });
      setAdded(item);
    } catch {
      setMessage("Couldn't save your change. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <SavedContext.Provider value={{ profile, busy, save, message }}>
      {children}
      {added && <SavedNotification item={added} close={()=>setAdded(null)} />}
      {pending && <ResourceSaveDialog item={pending} href={profileLoginUrl(`/profile?save=${encodeURIComponent(pending.id)}`)} onClose={() => setPending(null)} />}
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
