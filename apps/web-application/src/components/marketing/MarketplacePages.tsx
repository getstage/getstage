import { useState, useEffect, useRef, type MouseEvent } from "react";
import { BookmarkSimple, Check } from "@phosphor-icons/react";
import { MarketingLayout } from "./MarketingLayout";
import { NotFoundContent } from "./NotFoundContent";
import {
  catalog,
  type CatalogItem,
  SavedProvider,
  ProfileBoundary,
  useSaved,
} from "./MarketplaceState";
import { ResourceShareDialog } from "./ResourceDialogs";
import details from "@/marketing/marketplace/details.json";

export function SaveResource({ item }: { item: CatalogItem }) {
  const { profile, busy, save } = useSaved();
  const saved = profile?.items.includes(item.id);
  if (saved) return <a className="market-add" href="/profile"><Check size={14} />View my profile ↗</a>;
  return (
    <button
      className="market-add"
      disabled={busy !== null}
      aria-pressed={!!saved}
      aria-label={`${saved ? "Remove" : "Save"} ${item.name}${saved ? " from" : " to"} your profile`}
      onClick={() => void save(item)}
    >
      {saved ? <Check size={14} /> : <BookmarkSimple size={14} />}
      {busy === item.id ? "Saving…" : saved ? "Saved" : "Save"}
    </button>
  );
}
export function ResourceCard({
  item,
  action,
}: {
  item: CatalogItem;
  action?: React.ReactNode;
}) {
  return (
    <article className={`market-card ${item.type === "Components" ? "market-library-card" : ""}`}>
      {item.banner && (
        <a
          className="market-banner"
          href={item.url!}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img src={item.banner} width={item.bannerWidth ?? undefined} height={item.bannerHeight ?? undefined} alt="" loading="lazy" />
          <span className="market-banner-title">{`<${item.bannerTitle || item.name}>`}</span>
        </a>
      )}
      <div className="market-card-body">
        {!item.banner && (
          <img
            className="market-library-logo"
            src={item.icon}
            alt=""
            width={24}
            height={24}
            loading="lazy"
          />
        )}
        {item.url ? <a className="market-card-title" href={item.url}><h3>{item.name}</h3></a> : <div className="market-card-title"><h3>{item.name}</h3></div>}
        <p className="market-description">{item.description}</p>
        <div className="market-card-meta"><img src="/marketplace-assets/marketplace/category.svg" width={13} height={13} alt="" aria-hidden="true" />{item.category}</div>
        {action ?? <SaveResource item={item} />}
      </div>
    </article>
  );
}
function CategoryFilter({
  items,
  value,
  onChange,
}: {
  items: CatalogItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const categories = ["", ...[...new Set(items.map((i) => i.category))].sort()];
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div
      className="market-filter"
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => {
            const options = Array.from(
              ref.current?.querySelectorAll<HTMLButtonElement>(
                ".market-filter-option",
              ) ?? [],
            );
            const index = options.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      options.length) %
                    options.length;
            options[next]?.focus();
          });
        }
      }}
    >
      <button
        id="market-category-toggle"
        ref={toggle}
        aria-expanded={open}
        aria-controls="market-category-options"
        onClick={() => setOpen(!open)}
      >
        {value || "All categories"} <span aria-hidden="true">⌄</span>
      </button>
      <div
        id="market-category-options"
        className="market-filter-options"
        hidden={!open}
        role="group"
        aria-label="Filter by category"
      >
        <span className="market-filter-heading">Categories</span>
        {categories.map((category) => (
          <button
            key={category}
            className="market-filter-option"
            aria-pressed={value === category}
            onClick={() => {
              onChange(category);
              setOpen(false);
              toggle.current?.focus();
            }}
          >
            <span>{category || "All categories"}</span>
            <span className="market-filter-count">
              {category
                ? items.filter((i) => i.category === category).length
                : items.length}
            </span>
            <span className="market-filter-check" aria-hidden="true">
              ✓
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MarketplacePage({
  category = "Components",
}: {
  category?: string;
}) {
  return (
    <MarketingLayout
      bodyClass="marketplace-page resource-page"
      title={`${category} — Stage Marketplace`}
      description="Discover tools, skills and component libraries for your next project."
    >
      <ProfileBoundary>
        <SavedProvider>
          <MarketplaceContent category={category} />
        </SavedProvider>
      </ProfileBoundary>
    </MarketingLayout>
  );
}
function MarketplaceContent({ category }: { category: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const items = catalog.filter((item) => item.type === category);
  const shown = items.filter(
    (item) =>
      (!filter || item.category === filter) &&
      `${item.name} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="marketplace integrated-marketplace">
      <header className="market-heading">
        <h1>Marketplace</h1>
        <p>
          Discover tools, skills and component libraries for your next project.
        </p>
      </header>
      <div className="market-toolbar">
        <nav className="market-tabs" aria-label="Marketplace categories">
          {[
            ["Components", "/component-libraries"],
            ["Skills", "/skills"],
            ["Tools", "/tools"],
          ].map(([name, path]) => (
            <a
              key={path}
              href={path}
              aria-current={category === name ? "page" : undefined}
            >
              {name === "Components" ? "Component Libraries" : name}
            </a>
          ))}
        </nav>
        <label className="market-search">
          <img src="/marketplace-assets/marketplace/search.svg" width={15} height={15} alt="" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${category.toLowerCase()}`}
            aria-label={`Search ${category.toLowerCase()}`}
          />
        </label>
        <CategoryFilter items={items} value={filter} onChange={setFilter} />
      </div>
      <section className="market-panel">
        <h2>{category === "Components" ? "Discover Components" : category === "Skills" ? "Discover Skills" : "Available tools"}</h2>
        <div
          className={
            `market-grid ${category !== "Skills" ? "market-libraries" : ""}`
          }
        >
          {shown.map((item) => (
            <ResourceCard key={item.id} item={item} />
          ))}
        </div>
        {shown.length === 0 && (
          <p className="market-empty">
            No matches. Try a different name or category.
          </p>
        )}
      </section>
      <p className="market-search-status" role="status">
        {shown.length} results
      </p>
    </div>
  );
}
export function ResourceDetailPage({ id }: { id: string }) {
  const item = catalog.find((item) => item.id === id);
  const html = details[id as keyof typeof details];
  if (!item || !html)
    return <NotFoundContent backHref="/marketplace" backLabel="Marketplace" />;
  return (
    <MarketingLayout
      bodyClass="resource-page"
      title={`${item.name} — Stage`}
      description={item.description}
    >
      <ProfileBoundary>
        <SavedProvider>
          <DetailContent item={item} html={html} />
        </SavedProvider>
      </ProfileBoundary>
    </MarketingLayout>
  );
}
function DetailContent({ item, html }: { item: CatalogItem; html: string }) {
  const { save, profile, busy } = useSaved();
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const saved = profile?.items.includes(item.id);
  const markup = html.replace(
    "Save to profile</span>",
    `${busy === item.id ? "Saving…" : saved ? "View my profile ↗" : "Save to profile"}</span>`,
  );
  async function action(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".profile-save")) {
      event.preventDefault();
      if (saved) window.location.assign("/profile");
      else if (!busy) await save(item);
    }
    if (target.closest(".resource-use")) window.location.assign("/download");
    if (target.closest(".resource-share")) {
      event.preventDefault();
      setSharing(true);
    }
    if (target.closest(".resource-copy-code")) {
      const code = target.closest("pre")?.textContent;
      if (code) {
        try {
          await navigator.clipboard.writeText(code);
          setMessage("Code copied.");
        } catch {
          setMessage("Select and copy the code.");
        }
      }
    }
  }
  return (
    <>
      <div
        className="resource-layout integrated-resource"
        onClick={(event) => void action(event)}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      {sharing && <ResourceShareDialog item={item} onClose={() => setSharing(false)} />}
      {message && (
        <p className="market-feedback" role="status">
          {message}
        </p>
      )}
    </>
  );
}
