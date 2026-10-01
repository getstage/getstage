import { useState, useEffect, useRef, type MouseEvent } from "react";
import { BookmarkSimple, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { MarketingLayout } from "./MarketingLayout";
import { NotFoundContent } from "./NotFoundContent";
import {
  catalog,
  type CatalogItem,
  SavedProvider,
  ProfileBoundary,
  useSaved,
} from "./MarketplaceState";
import details from "@/marketing/marketplace/details.json";

export function SaveResource({ item }: { item: CatalogItem }) {
  const { profile, busy, save } = useSaved();
  const saved = profile?.items.includes(item.id);
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
  if (item.type === "Tools")
    return (
      <article className="market-card market-tool-row">
        <img
          className="market-tool-icon"
          src={item.icon}
          alt=""
          width={24}
          height={24}
        />
        <div className="market-tool-copy">
          <div className="market-card-title">
            <h3>{item.name}</h3>
          </div>
          <p className="market-description">{item.description}</p>
        </div>
        {action ?? <SaveResource item={item} />}
      </article>
    );
  return (
    <article className="market-card">
      {item.banner && (
        <a
          className="market-banner"
          href={item.url!}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img src={item.banner} alt="" loading="lazy" />
          <span className="market-banner-title">{item.name}</span>
        </a>
      )}
      <div className="market-card-body">
        {!item.banner && (
          <img
            className="market-library-logo"
            src={item.icon}
            alt=""
            width={28}
            height={28}
            loading="lazy"
          />
        )}
        <a className="market-card-title" href={item.url!}>
          <h3>{item.name}</h3>
        </a>
        <p className="market-description">{item.description}</p>
        <div className="market-card-meta">{item.category}</div>
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
              {name}
            </a>
          ))}
        </nav>
        <label className="market-search">
          <MagnifyingGlass size={16} />
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
        <h2>{category === "Components" ? "Component libraries" : category}</h2>
        <div
          className={
            category === "Tools"
              ? "market-tools-list"
              : `market-grid ${category === "Components" ? "market-libraries" : ""}`
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
  const saved = profile?.items.includes(item.id);
  const markup = html.replace(
    "Save to profile</span>",
    `${busy === item.id ? "Saving…" : saved ? "Remove from profile" : "Save to profile"}</span>`,
  );
  async function action(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".profile-save")) {
      event.preventDefault();
      await save(item);
    }
    if (target.closest(".resource-use")) window.location.assign("/download");
    if (target.closest(".resource-share")) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setMessage("Link copied.");
      } catch {
        setMessage(`Copy this link: ${window.location.href}`);
      }
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
      {message && (
        <p className="market-feedback" role="status">
          {message}
        </p>
      )}
    </>
  );
}
