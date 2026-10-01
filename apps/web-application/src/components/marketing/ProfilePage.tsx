import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  MapPin,
  UserCircle,
  BookmarkSimple,
  Trash,
  GithubLogo,
  XLogo,
  InstagramLogo,
  LinkedinLogo,
  Globe,
  Envelope,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { MarketingLayout } from "./MarketingLayout";
import { ResourceCard } from "./MarketplacePages";
import {
  ProfileBoundary,
  catalog,
  profileApi,
  profileLoginUrl,
  type Profile,
  type ProfileInput,
} from "./MarketplaceState";
import banners from "@/marketing/marketplace/banners.json";
import { technologyGroups } from "@/marketing/marketplace/technologies";

const roleOptions = [
  "Vibe coder",
  "Coder",
  "Web designer",
  "Figma designer",
  "UI designer",
  "UX designer",
  "Product designer",
  "Frontend developer",
  "Backend developer",
  "Full-stack developer",
  "AI builder",
  "Founder",
];
const contacts = [
  { key: "github", label: "GitHub", Icon: GithubLogo },
  { key: "x", label: "X", Icon: XLogo },
  { key: "instagram", label: "Instagram", Icon: InstagramLogo },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { key: "website", label: "Website", Icon: Globe },
  { key: "email", label: "Email", Icon: Envelope },
] as const;
function blank(name: string): Profile {
  return {
    name,
    handle: "",
    bio: "",
    location: "",
    roles: [],
    technologies: [],
    banner: "banner-4",
    github: "",
    x: "",
    instagram: "",
    linkedin: "",
    website: "",
    email: "",
    published: false,
    items: [],
  };
}
function fields(profile: Profile): ProfileInput {
  const {
    customBanner,
    name,
    handle,
    bio,
    location,
    roles,
    technologies,
    banner,
    github,
    x,
    instagram,
    linkedin,
    website,
    email,
    published,
  } = profile;
  return {
    ...(customBanner !== undefined ? { customBanner } : {}),
    name,
    handle,
    bio,
    location,
    roles,
    technologies,
    banner,
    github,
    x,
    instagram,
    linkedin,
    website,
    email,
    published,
  };
}
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
      className="resource-modal profile-dialog profile-edit-dialog"
      ref={ref}
      onCancel={close}
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
      </header>
      {children}
    </dialog>
  );
}
export function ProfilePage({ handle }: { handle?: string }) {
  return (
    <MarketingLayout
      bodyClass="profile-page"
      title="Builder profile — Stage"
      description="The tools, skills and components behind your builds, curated on Stage."
    >
      <ProfileBoundary>
        {handle ? <PublicProfile handle={handle} /> : <OwnProfile />}
      </ProfileBoundary>
    </MarketingLayout>
  );
}
function PublicProfile({ handle }: { handle: string }) {
  const profile = useQuery(profileApi.public, { handle });
  if (profile === undefined) return <ProfileStatus text="Loading profile…" />;
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
  if (isLoading) return <ProfileStatus text="Loading your account…" />;
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
    return <ProfileStatus text="Loading your profile…" />;
  return (
    <ProfileView
      profile={profile ?? blank(user.name)}
      owner
      avatar={user.avatarUrl}
      setup={!profile}
    />
  );
}
export function ProfileView({
  profile,
  owner,
  avatar,
  setup = false,
}: {
  profile: Profile;
  owner: boolean;
  avatar?: string;
  setup?: boolean;
}) {
  const saveProfile = useMutation(profileApi.save);
  const setSaved = useMutation(profileApi.setSaved);
  const [tab, setTab] = useState("All");
  const [preview, setPreview] = useState(false);
  const [editor, setEditor] = useState(
    setup ||
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("edit")),
  );
  const [bannerOpen, setBannerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [stackOpen, setStackOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileInput>(fields(profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const [techQuery, setTechQuery] = useState("");
  const [rolesOpen, setRolesOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState<string | null>(null);
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
      : `${window.location.origin}/builders/${profile.handle}`;
  function edit() {
    setDraft(fields(profile));
    setError("");
    setEditor(true);
  }
  async function persist() {
    setBusy(true);
    setError("");
    try {
      await saveProfile(draft);
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
      await setSaved({ itemId: id, saved });
      setRemove(null);
      setMessage(
        saved ? "Saved to your profile." : "Removed from your profile.",
      );
      if (saved) setPending(null);
    } catch {
      setError("Could not update your collection. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Profile link copied.");
    } catch {
      setMessage("Select and copy the link above.");
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
  function technologyLabel(id: string) {
    return (
      Object.values(technologyGroups)
        .flat()
        .find((name) => techId(name) === id) ?? id
    );
  }
  const stack = (
    <section className="market-panel profile-collection-panel">
      <div className="section-title">
        <h3>My toolstack</h3>
        {!publicMode && (
          <button
            className="market-add"
            onClick={() => {
              setDraft(fields(profile));
              setTechQuery("");
              setStackOpen(true);
            }}
          >
            Edit technologies
          </button>
        )}
      </div>
      <div className="profile-technology-tags">
        {profile.technologies.length ? (
          profile.technologies.map((id) => (
            <span className="badge" key={id}>
              <img
                src={`/marketplace-assets/technologies/${id}.svg`}
                alt=""
                width={16}
                height={16}
              />
              {technologyLabel(id)}
            </span>
          ))
        ) : (
          <p>No technologies selected yet.</p>
        )}
      </div>
    </section>
  );
  return (
    <div className="profile-shell integrated-profile">
      {owner && (
        <div className="profile-toolbar">
          <button className="text-button" onClick={() => setPreview(!preview)}>
            {preview ? "Back to editor" : "Public preview ↗"}
          </button>
          {!profile.published && (
            <span className="profile-visibility">Private profile</span>
          )}
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
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            <UserCircle size={88} weight="duotone" />
          )}
        </div>
        <div className="identity-actions">
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
            {profile.location && (
              <span className="profile-location">
                <MapPin size={18} weight="duotone" />
                {profile.location}
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
                      <Icon size={18} />
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
        <div className="collection">
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
                        group === "Tools" ? "market-tools-list" : "market-grid"
                      }
                    >
                      {items.map((item) => (
                        <ResourceCard
                          key={item.id}
                          item={item}
                          action={
                            publicMode ? (
                              <span />
                            ) : (
                              <button
                                className="market-add"
                                aria-label={`Remove ${item.name}`}
                                onClick={() => setRemove(item.id)}
                              >
                                <Trash size={14} />
                                Remove
                              </button>
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="market-empty">
                      {publicMode
                        ? "No resources added yet."
                        : "Make this collection yours. Add a favorite from the marketplace."}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
        <aside>
          <section className="visitor-cta">
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
          </section>
        </aside>
      </div>
      {message && (
        <p className="profile-feedback" role="status">
          {message}
        </p>
      )}
      {editor && (
        <Modal
          title={setup ? "Create your profile" : "Edit your profile"}
          close={() => !busy && setEditor(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void persist();
            }}
          >
            <div className="resource-modal-body">
              {(["name", "handle", "bio", "location"] as const).map((key) => (
                <div className="form-field" key={key}>
                  <label htmlFor={`profile-${key}`}>
                    {
                      {
                        name: "Display name",
                        handle: "Username",
                        bio: "Bio",
                        location: "Location",
                      }[key]
                    }
                  </label>
                  {key === "bio" ? (
                    <textarea
                      id={`profile-${key}`}
                      value={draft[key]}
                      maxLength={220}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <input
                      id={`profile-${key}`}
                      value={draft[key]}
                      required={key === "name" || key === "handle"}
                      maxLength={key === "handle" ? 24 : 60}
                      pattern={
                        key === "handle" ? "[a-zA-Z0-9_]{2,24}" : undefined
                      }
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
              <fieldset>
                <legend>Role tags</legend>
                <div className="role-summary-row">
                  <span>{draft.roles.join(" · ") || "Choose your roles"}</span>
                  <button
                    type="button"
                    className="market-add"
                    aria-expanded={rolesOpen}
                    aria-controls="profile-role-options"
                    onClick={() => setRolesOpen(!rolesOpen)}
                  >
                    Edit tags
                  </button>
                </div>
                <div
                  id="profile-role-options"
                  hidden={!rolesOpen}
                  className="profile-choice-grid"
                >
                  {roleOptions.map((role) => (
                    <label key={role}>
                      <input
                        type="checkbox"
                        checked={draft.roles.includes(role)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            roles: e.target.checked
                              ? [...draft.roles, role]
                              : draft.roles.filter((r) => r !== role),
                          })
                        }
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Contact links</legend>
                <div className="profile-contact-toggles">
                  {contacts.map(({ key, label, Icon }) => (
                    <button
                      type="button"
                      key={key}
                      aria-label={label}
                      aria-expanded={contactOpen === key}
                      aria-controls={`contact-field-${key}`}
                      className="market-add"
                      onClick={() =>
                        setContactOpen(contactOpen === key ? null : key)
                      }
                    >
                      <Icon size={16} />
                      {draft[key] && <span aria-label="Link added">•</span>}
                    </button>
                  ))}
                </div>
                {contacts.map(({ key, label }) => (
                  <div
                    className="form-field"
                    id={`contact-field-${key}`}
                    hidden={contactOpen !== key}
                    key={key}
                  >
                    <label htmlFor={`contact-${key}`}>{label}</label>
                    <input
                      id={`contact-${key}`}
                      type={key === "email" ? "email" : "url"}
                      placeholder={
                        key === "email" ? "Public contact email" : "https://"
                      }
                      value={draft[key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </fieldset>
              <label className="profile-publish-toggle">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) =>
                    setDraft({ ...draft, published: e.target.checked })
                  }
                />
                Publish my profile and collection
              </label>
              <p className="form-note">
                Published profiles show these details and contact links to
                anyone with your link. Your login email remains private unless
                you add it above.
              </p>
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
                  <img src={b.src} alt={b.name} />
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
      {stackOpen && (
        <Modal
          title="Your technology stack"
          close={() => !busy && setStackOpen(false)}
        >
          <div className="resource-modal-body">
            <input
              aria-label="Search technologies"
              type="search"
              placeholder="Search technologies"
              value={techQuery}
              onChange={(e) => setTechQuery(e.target.value)}
            />
            {Object.entries(technologyGroups).map(([group, names]) => {
              const shown = names.filter((name) =>
                name.toLowerCase().includes(techQuery.toLowerCase()),
              );
              return (
                shown.length > 0 && (
                  <fieldset key={group}>
                    <legend>{group}</legend>
                    <div className="profile-choice-grid">
                      {shown.map((name) => (
                        <label key={name}>
                          <input
                            type="checkbox"
                            checked={draft.technologies.includes(techId(name))}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                technologies: e.target.checked
                                  ? [...draft.technologies, techId(name)]
                                  : draft.technologies.filter(
                                      (id) => id !== techId(name),
                                    ),
                              })
                            }
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )
              );
            })}
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="resource-modal-actions">
            <button
              className="resource-modal-primary"
              disabled={busy || setup}
              onClick={() => void persist()}
            >
              Save technologies
            </button>
            <button
              className="resource-modal-secondary"
              onClick={() => setStackOpen(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {shareOpen && (
        <Modal title="Share profile" close={() => setShareOpen(false)}>
          <div className="resource-modal-body">
            {profile.published ? (
              <>
                <label htmlFor="profile-share-link">Profile link</label>
                <input id="profile-share-link" value={shareUrl} readOnly />
                <p>Anyone with this link can see your published profile.</p>
              </>
            ) : (
              <p>Publish your profile in Edit profile before sharing it.</p>
            )}
          </div>
          <div className="resource-modal-actions">
            {profile.published ? (
              <>
                <button
                  className="resource-modal-primary"
                  onClick={() => void copyLink()}
                >
                  Copy link
                </button>
                <a
                  className="resource-modal-secondary"
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent("My builder toolkit on Stage")}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share on X ↗
                </a>
              </>
            ) : (
              owner && (
                <button
                  className="resource-modal-primary"
                  onClick={() => {
                    setShareOpen(false);
                    edit();
                  }}
                >
                  Edit profile
                </button>
              )
            )}
            <button
              className="resource-modal-secondary"
              onClick={() => setShareOpen(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {remove && (
        <Modal
          title="Remove from your profile?"
          close={() => !busy && setRemove(null)}
        >
          <div className="resource-modal-body">
            <p>
              {catalog.find((i) => i.id === remove)?.name} will be removed from
              your collection. You can add it again later.
            </p>
          </div>
          <div className="resource-modal-actions">
            <button
              className="resource-modal-primary"
              disabled={busy}
              onClick={() => void changeItem(remove, false)}
            >
              Remove
            </button>
            <button
              className="resource-modal-secondary"
              disabled={busy}
              onClick={() => setRemove(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function techId(name: string) {
  return name
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-");
}
