import { MarketingLayout } from "./MarketingLayout";

export function NotFoundContent({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <MarketingLayout title="Page not found | Stage" description="This page does not exist.">
      <header className="content-hero">
        <p className="eyebrow">404</p>
        <h1>This page does not exist.</h1>
        <p className="content-lede">
          <a className="content-link" href={backHref}>
            {backLabel}
          </a>
        </p>
      </header>
    </MarketingLayout>
  );
}
