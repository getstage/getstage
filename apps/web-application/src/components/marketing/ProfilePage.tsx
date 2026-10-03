import { closeOnDialogBackdrop } from "./dialogBackdrop";
import { PageLoading } from "@/components/shared/PageLoading";
import { readLocalProfile } from "./localProfile";
import { technologyGroups } from "@/marketing/marketplace/technologies";
import { ProfileShareDialog } from "./ProfileShareDialogs";
import { blank, countryName, countryOptions, fields, contacts, suggestedHandle, techId } from "./profileModel";
import { RolePicker, ContactFields, TechnologyLabel, PhotoField } from "./ProfileFields";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  MapPin,
  LockSimple,
  UserCircle,
  BookmarkSimple,
  Gift,
  SignOut,
} from "@phosphor-icons/react";
import { useAuth, useSignOut } from "@/lib/auth";
import { MarketingLayout } from "./MarketingLayout";
import {
  ProfileBoundary,
  catalog,
  profileApi,
  profileLoginUrl,
  type Profile,
  type ProfileInput,
} from "./MarketplaceState";
import banners from "@/marketing/marketplace/banners.json";

function safeContact(key: string, value: string) {
  if (!value) return undefined;
  if (key === "email") return `mailto:${encodeURIComponent(value)}`;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      className={`resource-modal profile-dialog profile-edit-dialog ${title==="Remove from your profile?"?"profile-delete-dialog":""}`}
      id={title==="Remove from your profile?"?"remove-dialog":undefined}
      ref={ref}
      onCancel={close}
      onClick={event => closeOnDialogBackdrop(event, close)}
      aria-label={title}
    >
      <button
        className="resource-modal-close"
        onClick={close}
        aria-label="Close"
      >
        ×
      </button>
      <header className="resource-modal-heading">
        <h2>{title}</h2>
        {({"Edit your profile":"A little about you and what you build.","Choose your banner":"Make your profile your own.","Add from marketplace":"Curate your tools, skills and components.","Share profile":"Share your tools, skills and components with friends and fellow builders."} as Record<string,string>)[title]&&<p>{({"Edit your profile":"A little about you and what you build.","Choose your banner":"Make your profile your own.","Add from marketplace":"Curate your tools, skills and components.","Share profile":"Share your tools, skills and components with friends and fellow builders."} as Record<string,string>)[title]}</p>}
      </header>
      {children}
    </dialog>
  );
}
function ProfileConfirmationDialog({id,icon,title,description,label,busyLabel,busy,error,close,confirm}:{id:string;icon:ReactNode;title:string;description:string;label:string;busyLabel:string;busy:boolean;error?:string;close:()=>void;confirm:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return ()=>dialog?.close()},[]);
  return <dialog ref={ref} id={id} className="resource-modal profile-dialog profile-delete-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={busy} onClick={event=>{if(!busy)closeOnDialogBackdrop(event,close)}} onCancel={event=>{if(busy)event.preventDefault();else close()}}>
    <div className="profile-delete-content">
      {icon}
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
    </div>
    <div className="profile-delete-actions"><button type="button" className="button button-neutral" disabled={busy} onClick={close} autoFocus>Cancel</button><button type="button" className="button profile-delete-confirm" disabled={busy} onClick={confirm}>{busy?busyLabel:label}</button></div>
    {error && <p role="alert">{error}</p>}
  </dialog>;
}
function RemoveProfileItemDialog({item,busy,close,confirm}:{item:typeof catalog[number];busy:boolean;close:()=>void;confirm:()=>void}) {
  return <ProfileConfirmationDialog id="remove-dialog" icon={<img src={item.icon} width={32} height={32} alt=""/>} title={`Remove ${item.name} from your profile?`} description={`This removes ${item.name} from your collection. You can add it again from the marketplace at any time.`} label="Remove" busyLabel="Removing…" busy={busy} close={close} confirm={confirm}/>;
}
export function ProfilePage({ handle }: { handle?: string }) {
  return (
    <MarketingLayout
      bodyClass="profile-page"
      title="Builder profile — Stage"
      description="The tools, skills and components behind your builds, curated on Stage."
    >
      <ProfileBoundary>
        {handle ? <PublicProfile handle={handle} /> : import.meta.env.DEV && (new URLSearchParams(window.location.search).get("preview")==="1" || readLocalProfile()) ? <LocalProfile /> : <OwnProfile />}
      </ProfileBoundary>
    </MarketingLayout>
  );
}
function LocalProfile() {
 const [profile,setProfile]=useState<Profile>(()=>{
  try {const saved=JSON.parse(localStorage.getItem("stage-profile-preview")||'null');const draft=JSON.parse(localStorage.getItem("stage-profile-setup-v1:local-preview")||'null')?.profile;return {...blank(''),...(saved||draft||{})};}catch{return blank('')}
 });
 function update(next:Profile){setProfile(next);localStorage.setItem("stage-profile-preview",JSON.stringify(next));}
 return <ProfileView profile={profile} owner localUpdate={update}/>;
}
function PublicProfile({ handle }: { handle: string }) {
  const profile = useQuery(profileApi.public, { handle });
  if (profile === undefined) return <PageLoading />;
  if (!profile)
    return <ProfileStatus text="This profile is private or doesn't exist." />;
  return <ProfileView profile={profile} owner={false} />;
}
function ProfileStatus({ text }: { text: string }) {
  return (
    <section className="profile-service-error">
      <h1>{text}</h1>
      <a href="/marketplace" className="button button-neutral">
        Browse marketplace
      </a>
    </section>
  );
}
function OwnProfile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const profile = useQuery(profileApi.mine, isAuthenticated ? {} : "skip");
  if (isLoading) return <PageLoading />;
  if (!user)
    return (
      <section className="profile-service-error">
        <h1>Your tools. Your own collection.</h1>
        <p>
          Log in to create your profile and save resources across your devices.
        </p>
        <a
          className="button button-primary"
          href={profileLoginUrl(
            typeof window === "undefined"
              ? "/profile"
              : window.location.pathname + window.location.search,
          )}
        >
          Log in to Stage
        </a>
      </section>
    );
  if (profile === undefined)
    return <PageLoading />;
  return (
    <ProfileView
      profile={profile ?? { ...blank(user.name), handle: suggestedHandle(user.name) }}
      owner
      avatar={user.avatarUrl}
      accountEmail={user.email}
      setup={!profile}
    />
  );
}
export function ProfileView({
  profile,
  owner,
  avatar,
  accountEmail,
  setup = false,
  localUpdate,
}: {
  profile: Profile;
  owner: boolean;
  avatar?: string;
  accountEmail?: string;
  setup?: boolean;
  localUpdate?: (profile:Profile)=>void;
}) {
  const signOut=useSignOut();
  const {isAuthenticated}=useAuth();
  const [loggingOut,setLoggingOut]=useState(false);
  const [logoutOpen,setLogoutOpen]=useState(false);
  const [logoutError,setLogoutError]=useState("");
  async function logOut(){
    if(loggingOut)return;
    setLogoutError("");
    setLoggingOut(true);
    try {
      if(isAuthenticated)await signOut();
      if(import.meta.env.DEV)localStorage.setItem('stage-profile-preview-signed-out','1');
      window.location.assign('/');
    } catch {setLogoutError('Could not log out. Please try again.');setLoggingOut(false);}
  }
  const saveProfile = useMutation(profileApi.save);
  const setSaved = useMutation(profileApi.setSaved);
  const [tab, setTab] = useState(() => {
    const requested=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('collection');
    return requested&&['All','Tools','Toolstack','Skills','Components'].includes(requested)?requested:'All';
  });
  const collectionRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(window.location.hash==='#my-collection')collectionRef.current?.scrollIntoView({block:'start'});},[]);
  const [preview, setPreview] = useState(() => Boolean(localUpdate) && new URLSearchParams(window.location.search).get("view") === "public");
  const [editor, setEditor] = useState(
    setup ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("edit")),
  );
  const [bannerOpen, setBannerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [stackOpen, setStackOpen] = useState<boolean|null>(null);
  const [technologyDraft,setTechnologyDraft]=useState(profile.technologies);
  const [technologyQuery,setTechnologyQuery]=useState("");
  const [rewardOpen,setRewardOpen]=useState(false);
  const [draft, setDraft] = useState<ProfileInput>(fields(profile));
  // First-time setup: check the suggested username and switch to a free one
  // until the user types their own (same behaviour as /setup-profile).
  const [handleTouched, setHandleTouched] = useState(false);
  const [checkedHandle, setCheckedHandle] = useState(draft.handle);
  useEffect(() => {
    const timer = setTimeout(() => setCheckedHandle(draft.handle), 250);
    return () => clearTimeout(timer);
  }, [draft.handle]);
  const availability = useQuery(
    profileApi.username,
    setup && !localUpdate && /^[a-z0-9_]{2,24}$/.test(checkedHandle) ? { handle: checkedHandle } : "skip",
  );
  useEffect(() => {
    if (!handleTouched && availability && !availability.available && availability.suggestion && checkedHandle === draft.handle)
      setDraft((current) => ({ ...current, handle: availability.suggestion }));
  }, [availability, handleTouched, checkedHandle, draft.handle]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(()=>{if(message!=="Technology stack saved")return;const timer=setTimeout(()=>setMessage(""),4000);return ()=>clearTimeout(timer)},[message]);
  const [remove, setRemove] = useState<string | null>(null);
  const publicMode = !owner || preview;
  const [pending, setPending] = useState(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("save"),
  );
  const pendingItem = catalog.find((i) => i.id === pending);
  const banner = banners.find((b) => b.id === profile.banner) ?? banners[3];
  const selected = catalog.filter((i) => profile.items.includes(i.id));
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : localUpdate ? `${window.location.origin}/profile?preview=1&view=public` : `${window.location.origin}/builders/${profile.handle}`;
  function edit() {
    setDraft(fields(profile));
    setError("");
    setEditor(true);
  }
  async function persist() {
    setBusy(true);
    setError("");
    try {
      if(localUpdate)localUpdate({...profile,...draft});else await saveProfile(draft);
      setEditor(false);
      setBannerOpen(false);
      setStackOpen(false);
      setMessage("Profile saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your profile. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function changeItem(id: string, saved: boolean) {
    setBusy(true);
    setError("");
    try {
      if(localUpdate)localUpdate({...profile,items:saved?Array.from(new Set([...profile.items,id])):profile.items.filter(item=>item!==id)});else await setSaved({ itemId: id, saved });
      setRemove(null);
      setMessage(
        saved ? "Saved to your profile." : "",
      );
      if (saved) setPending(null);
    } catch {
      setError("Could not update your collection. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadBanner(file: File | undefined) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Choose a PNG, JPG or WebP under 2 MB.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / bitmap.width, 900 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const image = canvas.toDataURL("image/webp", 0.8);
      if (image.length > 700000) throw new Error();
      setDraft((current) => ({ ...current, customBanner: image }));
    } catch {
      setError("This image could not be used. Choose a smaller image.");
    } finally {
      setBusy(false);
    }
  }
  const stackExpanded=!publicMode&&(stackOpen??tab==='Toolstack');
  const stackTechnologies=Object.values(technologyGroups).flat().map(techId).filter(id=>(publicMode?profile.technologies:technologyDraft).includes(id));
  function toggleTechnology(id:string) {
    setTechnologyDraft(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
    setStackOpen(true);
  }
  async function saveTechnologyStack() {
    setBusy(true);setError('');
    try {
      if(localUpdate)localUpdate({...profile,technologies:technologyDraft});
      else await saveProfile({...fields(profile),technologies:technologyDraft});
      setStackOpen(false);setMessage('Technology stack saved');
    } catch {setError('Could not save your technology stack. Please try again.');}
    finally {setBusy(false);}
  }
  const stack = <section className="profile-collection-panel market-panel technology-panel">
    <div className="section-title"><h3>My technology stack</h3><span>{stackTechnologies.length} {stackTechnologies.length===1?'technology':'technologies'}</span></div>
    <div className="technology-body market-card">
      <div className="technology-selected">{stackTechnologies.length?stackTechnologies.map(id=>publicMode?<span className="technology-chip market-add" key={id}><TechnologyLabel id={id}/></span>:<button type="button" className="technology-chip market-add" key={id} aria-label={`Remove ${Object.values(technologyGroups).flat().find(name=>techId(name)===id)??id} from toolstack`} onClick={()=>toggleTechnology(id)}><TechnologyLabel id={id}/><span aria-hidden="true">×</span></button>):<p className="technology-empty">{publicMode?'No technologies added yet.':'Add the technologies you use to build your projects.'}</p>}</div>
      {!publicMode&&<><button type="button" className="market-add technology-edit" aria-expanded={stackExpanded} aria-controls="technology-picker" onClick={()=>setStackOpen(!stackExpanded)}>{stackExpanded?'− Hide selector':'+ Select technologies'}</button>
      {stackExpanded&&<div id="technology-picker">
        <label className="technology-search" htmlFor="profile-technology-search">Search technologies<input id="profile-technology-search" type="search" value={technologyQuery} onChange={event=>setTechnologyQuery(event.target.value)} placeholder="Search TypeScript, React, Python…" autoComplete="off"/></label>
        {<div id="technology-results">{Object.entries(technologyGroups).map(([group,names])=>{const matches=names.filter(name=>(name+' '+group).toLowerCase().includes(technologyQuery.trim().toLowerCase()));return matches.length?<div className="technology-group" key={group}><h4>{group}</h4><div>{matches.map(name=><button type="button" className="technology-option market-add" key={name} aria-pressed={technologyDraft.includes(techId(name))} onClick={()=>toggleTechnology(techId(name))}><TechnologyLabel id={techId(name)}/><span aria-hidden="true">{technologyDraft.includes(techId(name))?'✓':'+'}</span></button>)}</div></div>:null})}{!Object.entries(technologyGroups).some(([group,names])=>names.some(name=>(name+' '+group).toLowerCase().includes(technologyQuery.trim().toLowerCase())))&&<p className="technology-empty">No technologies found. Try a language or framework name.</p>}</div>}
        <div className="technology-actions"><p className="technology-status" role="status">{technologyDraft.length} selected</p><button type="button" className="button button-primary" data-tech-save disabled={busy} onClick={()=>void saveTechnologyStack()}>{busy?'Saving…':'Save'}</button></div>
      </div>}</>}
    </div>
  </section>;
  return (
    <div className="profile-shell integrated-profile">
      {owner && (
        <div className="profile-toolbar">
          {!profile.published && (
            <span className="profile-visibility"><LockSimple size={14} weight="regular" aria-hidden="true" />Private profile</span>
          )}
          <button type="button" className="text-button" onClick={() => preview ? setPreview(false) : setShareOpen(true)} aria-haspopup={preview ? undefined : "dialog"}>
            {preview ? "Back to editor" : "Public preview ↗"}
          </button>
        </div>
      )}
      {pendingItem && owner && !setup && !publicMode && (
        <div className="profile-pending">
          <span>Save {pendingItem.name} to your collection?</span>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => void changeItem(pendingItem.id, true)}
          >
            Save resource
          </button>
          <button className="text-button" onClick={() => setPending(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="cover">
        <img
          id="selected-banner"
          src={profile.customBanner || banner?.src}
          alt=""
        />
        {!publicMode && (
          <button
            className="button button-neutral change-banner"
            onClick={() => {
              setDraft(fields(profile));
              setBannerOpen(true);
            }}
          >
            Change banner
          </button>
        )}
      </div>
      <section className="identity">
        <div className="avatar">
          {(profile.customAvatar || avatar) ? (
            <img src={profile.customAvatar || avatar} alt="" />
          ) : (
            <UserCircle size={88} weight="duotone" />
          )}
        </div>
        <div className="identity-actions">
          {!publicMode && <button type="button" className="profile-logout" disabled={loggingOut} onClick={()=>{setLogoutError("");setLogoutOpen(true);}}><SignOut size={16}/>{loggingOut?'Logging out…':'Log out'}</button>}
          {!publicMode && (
            <button className="button button-neutral" onClick={edit}>
              Edit profile
            </button>
          )}
          <button
            className="button button-primary"
            onClick={() => setShareOpen(true)}
          >
            Share profile ↗
          </button>
        </div>
        <div className="identity-copy">
          <div className="name-line">
            <h1>{profile.name || "Your profile"}</h1>
            <div id="profile-roles">
              {profile.roles.map((role) => (
                <span className="badge" key={role}>
                  {role}
                </span>
              ))}
            </div>
          </div>
          {profile.handle && <p className="handle">@{profile.handle}</p>}
          <p className="bio">{profile.bio}</p>
          <div className="details">
            {countryName(profile.location) && (
              <span className="profile-location">
                <MapPin size={18} weight="duotone" />
                {countryName(profile.location)}
              </span>
            )}
            <nav id="social-links" aria-label="Contact links">
              {contacts.map(
                ({ key, label, Icon }) =>
                  safeContact(key, profile[key]) && (
                    <a
                      className="profile-social-link"
                      key={key}
                      href={safeContact(key, profile[key])}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <Icon size={16} weight={key==='x'?'fill':'regular'} />
                    </a>
                  ),
              )}
            </nav>
          </div>
        </div>
      </section>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="body-grid">
        <div className="collection" id="my-collection" ref={collectionRef} style={{scrollMarginTop:100}}>
          <div className="collection-heading">
            <h2>My collection</h2>
            {!publicMode && (
              <a className="button button-neutral" href="/marketplace">
                ＋ Add from marketplace
              </a>
            )}
          </div>
          <div className="tabs" role="tablist" aria-label="Profile collections">
            {["All", "Tools", "Toolstack", "Skills", "Components"].map(
              (name, index, names) => (
                <button
                  className="tab"
                  role="tab"
                  id={`collection-${name}`}
                  aria-controls="collection-content"
                  aria-selected={tab === name}
                  tabIndex={tab === name ? 0 : -1}
                  key={name}
                  onClick={() => setTab(name)}
                  onKeyDown={(event) => {
                    let next: number | undefined;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % names.length;
                    if (event.key === "ArrowLeft")
                      next = (index + names.length - 1) % names.length;
                    if (event.key === "Home") next = 0;
                    if (event.key === "End") next = names.length - 1;
                    if (next !== undefined) {
                      event.preventDefault();
                      setTab(names[next]!);
                      document
                        .getElementById(`collection-${names[next]}`)
                        ?.focus();
                    }
                  }}
                >
                  {name}
                </button>
              ),
            )}
          </div>
          <div
            id="collection-content"
            role="tabpanel"
            aria-labelledby={`collection-${tab}`}
            tabIndex={0}
          >
            {(tab === "All" || tab === "Toolstack") && stack}
            {(tab === "All"
              ? ["Tools", "Skills", "Components"]
              : tab === "Toolstack"
                ? []
                : [tab]
            ).map((group) => {
              const items = selected.filter((i) => i.type === group);
              return (
                <section
                  className="profile-collection-panel market-panel"
                  key={group}
                >
                  <div className="section-title">
                    <h3>
                      My{" "}
                      {group === "Components"
                        ? "component libraries"
                        : group.toLowerCase()}
                    </h3>
                    <span>
                      {items.length}{" "}
                      {group === "Components"
                        ? items.length === 1
                          ? "component library"
                          : "component libraries"
                        : items.length === 1
                          ? group.toLowerCase().slice(0, -1)
                          : group.toLowerCase()}
                    </span>
                  </div>
                  {items.length ? (
                    <div
                      className={
                        group === "Tools" ? "market-tools-list profile-tools-list" : "item-grid market-grid"
                      }
                    >
                      {items.map(item=>group==='Tools'?<article className="market-card market-tool-row" key={item.id}><img className="market-tool-icon" src={item.icon} alt="" width={24} height={24}/><div className="market-tool-copy"><div className="market-card-title"><h3>{item.name}</h3></div><p className="market-description">{item.description}</p></div>{!publicMode&&<button className="profile-tool-remove" aria-label={`Remove ${item.name}`} onClick={()=>setRemove(item.id)}><img src="/marketplace-assets/resources/trash.svg" width={14} height={14} alt=""/></button>}</article>:<article className="item market-card" key={item.id}>{item.banner&&<a className="market-banner" href={item.url??undefined}><img src={item.banner} alt=""/></a>}<div className="market-card-body"><div className="item-top">{!item.banner&&<img className={`item-icon ${item.type==='Skills'?'photo':''}`} src={item.icon} alt=""/>}<div><h4><a href={item.url??undefined}>{item.name}</a></h4></div></div><p className="market-description">{item.description}</p><div className="market-card-meta"><img src="/marketplace-assets/marketplace/category.svg" width={13} height={13} alt=""/><span>{item.category}</span></div>{!publicMode&&<button className="profile-remove" aria-label={`Remove ${item.name}`} onClick={()=>setRemove(item.id)}><img src="/marketplace-assets/resources/trash.svg" width={14} height={14} alt=""/></button>}</div></article>)}
                    </div>
                  ) : (
                    <div className="profile-collection-empty">
                      <p>{publicMode ? "No resources added yet." : group === "Skills" ? "No skills saved yet." : group === "Components" ? "No component libraries saved yet." : "No tools saved yet."}</p>
                      {!publicMode&&<a className="button button-neutral" href={group === "Skills" ? "/skills" : group === "Components" ? "/component-libraries" : "/tools"}>＋ Add from marketplace</a>}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
        <aside>
          {!publicMode&&localUpdate?<section className="reward"><span className="reward-icon"><Gift size={28} weight="duotone"/></span><h3>Share your stack.<br/>Get a month free.</h3><p>Share your profile on X.<br/>Get a month of Stage on us.</p><button id="reward" className="button button-primary" onClick={()=>setRewardOpen(true)}>Get a free month ↗</button></section>:<section className="visitor-cta">
            <BookmarkSimple size={28} weight="duotone" />
            <h3>
              {publicMode
                ? "Your stack. Your own page."
                : "Build your collection."}
            </h3>
            <p>
              Keep the tools, skills and components you build with in one place.
            </p>
            <a
              className="button button-primary"
              href={publicMode ? "/profile" : "/marketplace"}
            >
              {publicMode ? "Create your profile" : "Explore marketplace"} ↗
            </a>
          </section>}
        </aside>
      </div>
      {message && (
        <p className={message==="Technology stack saved"?"profile-toast toast":"profile-feedback"} role="status">
          {message}
        </p>
      )}

      {rewardOpen && <ProfileShareDialog reward url={shareUrl} local={Boolean(localUpdate)} published={profile.published} close={() => setRewardOpen(false)} edit={edit} />}
      {editor && (
        <Modal
          title={setup ? "Set up your public profile" : "Edit your profile"}
          close={() => !busy && setEditor(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void persist();
            }}
          >
            <div className="resource-modal-body">
              {setup && accountEmail && (
                <p className="form-note">
                  This is the public profile for your Stage account ({accountEmail}). It stays private until you publish it.
                </p>
              )}
              <PhotoField compact value={draft.customAvatar || avatar} onChange={customAvatar => setDraft({ ...draft, customAvatar })} />
              {(["name", "handle", "bio", "location"] as const).map((key) => (
                <div key={key}>
                <div className="form-field">
                  <label htmlFor={`profile-${key}`}>
                    {
                      {
                        name: "Display name",
                        handle: "Username",
                        bio: "Bio",
                        location: "Country",
                      }[key]
                    }
                  </label>
                  {key === "bio" ? (
                    <textarea
                      id={`profile-${key}`}
                      value={draft[key]}
                      maxLength={220}
                      rows={3}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  ) : key === "location" ? (
                    <select
                      id="profile-location"
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    >
                      <option value="">Not shown</option>
                      {countryOptions.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`profile-${key}`}
                      value={draft[key]}
                      required={key === "name" || key === "handle"}
                      maxLength={key === "handle" ? 24 : 60}
                      pattern={
                        key === "handle" ? "[a-zA-Z0-9_]{2,24}" : undefined
                      }
                      onChange={(e) => {
                        if (key === "handle") setHandleTouched(true);
                        setDraft({ ...draft, [key]: e.target.value });
                      }}
                    />
                  )}
                  {key === "handle" && <small className="field-help">2–24 letters, numbers or underscores.</small>}
                  {key === "handle" && setup && availability && checkedHandle === draft.handle && (
                    <small className="field-help" role="status">
                      {availability.available ? "Username available." : "This username is already taken."}
                    </small>
                  )}
                </div>
                {key === "name" && <RolePicker profileStyle initiallyOpen={false} value={draft.roles} onChange={roles => setDraft({ ...draft, roles })} />}
                </div>
              ))}
              <ContactFields profileStyle draft={draft} onChange={setDraft} />
              {!localUpdate && <>
              <label className="profile-publish-toggle">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) =>
                    setDraft({ ...draft, published: e.target.checked })
                  }
                />
                <span>Publish my profile and collection</span>
              </label>
              <p className="form-note">
                Published profiles show these details and contact links to
                anyone with your link. Your login email remains private unless
                you add it above.
              </p>
              </>}
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </div>
            <div className="resource-modal-actions">
              <button className="resource-modal-primary" disabled={busy}>
                {busy ? "Saving…" : "Save profile"}
              </button>
              <button
                type="button"
                className="resource-modal-secondary"
                disabled={busy}
                onClick={() => setEditor(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
      {bannerOpen && (
        <Modal
          title="Choose your banner"
          close={() => !busy && setBannerOpen(false)}
        >
          <div className="resource-modal-body">
            <div className="banner-options">
              {banners.map((b) => (
                <button
                  key={b.id}
                  className="banner-option"
                  aria-pressed={!draft.customBanner && draft.banner === b.id}
                  onClick={() =>
                    setDraft({ ...draft, banner: b.id, customBanner: "" })
                  }
                >
                  <span className="banner-thumb"><img src={b.src} alt="" /></span><span>{b.name}</span>
                </button>
              ))}
            </div>
            <label className="banner-upload" htmlFor="custom-banner">
              Upload a banner
            </label>
            <input
              id="custom-banner"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => void uploadBanner(e.target.files?.[0])}
            />
            <p className="form-note">PNG, JPG or WebP · up to 2 MB.</p>
            {draft.customBanner && (
              <img
                src={draft.customBanner}
                alt="Selected banner preview"
                style={{ width: "100%", borderRadius: 8 }}
              />
            )}
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="resource-modal-actions">
            <button
              className="resource-modal-primary"
              disabled={busy || setup}
              onClick={() => void persist()}
            >
              Save banner
            </button>
            <button
              className="resource-modal-secondary"
              onClick={() => setBannerOpen(false)}
            >
              Cancel
            </button>
          </div>
          {setup && <p>Create your profile first to save a banner.</p>}
        </Modal>
      )}
      {logoutOpen && <ProfileConfirmationDialog id="logout-dialog" icon={<SignOut size={32} aria-hidden="true"/>} title="Are you sure you want to log out?" description="You can log back in anytime to access your profile and saved collection." label="Log out" busyLabel="Logging out…" busy={loggingOut} error={logoutError} close={()=>setLogoutOpen(false)} confirm={()=>void logOut()}/>}
      {shareOpen && <ProfileShareDialog url={shareUrl} local={Boolean(localUpdate)} published={profile.published} close={() => setShareOpen(false)} edit={() => { setShareOpen(false); edit(); }} />}
      {remove && catalog.find(item=>item.id===remove) && <RemoveProfileItemDialog item={catalog.find(item=>item.id===remove)!} busy={busy} close={()=>setRemove(null)} confirm={()=>void changeItem(remove,false)}/>}

    </div>
  );
}