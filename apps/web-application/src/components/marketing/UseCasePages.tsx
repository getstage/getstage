import {
  USE_CASE_GROUP_LABELS,
  findUseCase,
  useCasePath,
  useCases,
  type UseCase,
  type UseCaseGroup,
} from "@/marketing/content";
import { USE_CASES_META } from "@/marketing/pageMeta";
import { Breadcrumbs, MarketingLayout, TrialCallout } from "./MarketingLayout";
import { NotFoundContent } from "./NotFoundContent";

const GROUPS: UseCaseGroup[] = ["audience", "workflow"];

export function UseCasesIndexPage() {
  return (
    <MarketingLayout {...USE_CASES_META}>
      <header className="content-hero">
        <p className="eyebrow">Use cases</p>
        <h1>How people use Stage before they build.</h1>
        <p className="content-lede">
          Research, direction and structure for websites, web apps and iOS apps, whether you design
          for clients, run a team or build with AI.
        </p>
      </header>
      {GROUPS.map((group) => (
        <section className="content-section" key={group} aria-labelledby={`use-cases-${group}`}>
          <h2 className="content-group-title" id={`use-cases-${group}`}>
            {USE_CASE_GROUP_LABELS[group]}
          </h2>
          <UseCaseCards items={useCases.filter((useCase) => useCase.group === group)} />
        </section>
      ))}
      <TrialCallout heading="Start with the thinking behind your next product." />
    </MarketingLayout>
  );
}

export function UseCasePage({ slug }: { slug: string }) {
  const useCase = findUseCase(slug);
  if (!useCase) {
    return <NotFoundContent backHref="/use-cases" backLabel="All use cases" />;
  }

  const others = useCases.filter((other) => other.slug !== useCase.slug).slice(0, 3);

  return (
    <MarketingLayout title={useCase.seo.metaTitle} description={useCase.seo.metaDescription}>
      <Breadcrumbs items={[{ label: "Use cases", href: "/use-cases" }, { label: useCase.label }]} />
      <header className="content-hero">
        <p className="eyebrow">{useCase.label}</p>
        <h1>{useCase.title}</h1>
        <p className="content-lede">{useCase.intro}</p>
      </header>

      <section className="content-section content-prose">
        <h2>{useCase.problem.heading}</h2>
        <p>{useCase.problem.body}</p>
      </section>

      <section className="content-section" aria-labelledby="how-it-works">
        <h2 id="how-it-works">How it works in Stage</h2>
        <ol className="content-steps">
          {useCase.steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="content-section content-prose" aria-labelledby="what-you-get">
        <h2 id="what-you-get">What you walk away with</h2>
        <ul className="content-checks">
          {useCase.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
      </section>

      <section className="content-section content-prose" aria-labelledby="faq">
        <h2 id="faq">Questions</h2>
        {useCase.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>

      <TrialCallout heading="Try Stage on your next project." />

      <section className="content-section" aria-labelledby="more-use-cases">
        <h2 className="content-group-title" id="more-use-cases">
          More use cases
        </h2>
        <UseCaseCards items={others} />
      </section>
    </MarketingLayout>
  );
}

export function UseCaseCards({ items }: { items: UseCase[] }) {
  return (
    <ul className="content-grid" role="list">
      {items.map((useCase) => (
        <li key={useCase.slug}>
          <a className="content-card" href={useCasePath(useCase.slug)}>
            <strong>{useCase.label}</strong>
            <span>{useCase.summary}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
