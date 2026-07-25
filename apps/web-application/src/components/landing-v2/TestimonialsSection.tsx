import { useEffect, useRef, useState } from "react";

const ASSET = "/stage-v2-lp/assets/testimonials";
const DURATION_MS = 6000;

type Testimonial = {
  name: string;
  role: string;
  quote: string;
  photo: string;
  logo: string;
  logoAlt: string;
  logoClassName?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Pratik Singh",
    role: "Design Lead",
    quote:
      "I work in 4-week sprints, so speed is everything. Stage runs the research, strategy, and direction in one place - I get to Figma in a fraction of the time.",
    photo: `${ASSET}/pratik.jpg`,
    logo: `${ASSET}/logo-baseframe.png`,
    logoAlt: "Baseframe",
    logoClassName: "tst-logo-sm",
  },
  {
    name: "Dudu",
    role: "Founder",
    quote:
      "Other AI tools race you to generic. I'd rather get the details right - Stage actually respects that and keeps up with me.",
    photo: `${ASSET}/dudu.jpg`,
    logo: `${ASSET}/logo-toolfolio.png`,
    logoAlt: "Toolfolio",
    logoClassName: "tst-logo-sm",
  },
  {
    name: "Wessel Dieben",
    role: "Full-Stack Dev",
    quote:
      "Most designs fall apart when you build them. What comes out of Stage actually holds up in code - and that's rare.",
    photo: `${ASSET}/wessel.jpg`,
    logo: "/stage-v2-lp/assets/logo-mark.svg",
    logoAlt: "Stage",
  },
  {
    name: "Adrien Ninet",
    role: "Founder & Creator",
    quote:
      "I ship MVPs fast to test ideas, but I won't launch something ugly. Stage lets me move quick and still ship real, polished design.",
    photo: `${ASSET}/adrien.jpg`,
    logo: `${ASSET}/logo-logiaweb.png`,
    logoAlt: "Logiaweb",
  },
];

function testimonialAt(index: number): Testimonial {
  const person = TESTIMONIALS[index];
  if (!person) {
    throw new Error(`Missing testimonial at index ${index}`);
  }
  return person;
}

export function TestimonialsSection() {
  const peopleRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [quote, setQuote] = useState(() => testimonialAt(0).quote);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isMobileLoop, setIsMobileLoop] = useState(false);
  const [started, setStarted] = useState(false);
  const [progWidths, setProgWidths] = useState<number[]>(() =>
    TESTIMONIALS.map((_, i) => (i === 0 ? 0 : 0)),
  );
  const [progTransitionMs, setProgTransitionMs] = useState(0);

  const currentRef = useRef(0);
  const remainingRef = useRef(DURATION_MS);
  const cycleStartRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const swapTimerRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const reduceMotionRef = useRef(false);

  currentRef.current = current;

  function clearTimer() {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function goTo(index: number, opts?: { instant?: boolean }) {
    const next = ((index % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length;
    setCurrent(next);
    currentRef.current = next;

    if (swapTimerRef.current != null) window.clearTimeout(swapTimerRef.current);
    setIsSwapping(true);
    swapTimerRef.current = window.setTimeout(() => {
      setQuote(testimonialAt(next).quote);
      setIsSwapping(false);
    }, opts?.instant ? 0 : 200);

    remainingRef.current = DURATION_MS;
    startCycle(DURATION_MS);
    centerActive(opts?.instant);
  }

  function startCycle(ms: number) {
    clearTimer();
    remainingRef.current = ms;
    cycleStartRef.current = performance.now();
    pausedRef.current = false;

    const idx = currentRef.current;
    setProgWidths((prev) => prev.map((_, i) => (i === idx ? 0 : 0)));
    setProgTransitionMs(0);

    if (!reduceMotionRef.current) {
      // Next frame: animate active bar from current frozen width → 100%
      requestAnimationFrame(() => {
        setProgWidths((prev) =>
          prev.map((_, i) => {
            if (i !== currentRef.current) return 0;
            // Keep mid-resume width if we stored it as fraction via remaining
            const progressed = 1 - remainingRef.current / DURATION_MS;
            return progressed * 100;
          }),
        );
        requestAnimationFrame(() => {
          setProgTransitionMs(ms);
          setProgWidths((prev) => prev.map((_, i) => (i === currentRef.current ? 100 : 0)));
        });
      });
    }

    timerRef.current = window.setTimeout(() => {
      goTo(currentRef.current + 1);
    }, ms);
  }

  function pauseBar() {
    if (pausedRef.current) return;
    pausedRef.current = true;
    clearTimer();
    const elapsed = performance.now() - cycleStartRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    const progressed = 1 - remainingRef.current / DURATION_MS;
    setProgTransitionMs(0);
    setProgWidths((prev) =>
      prev.map((_, i) => (i === currentRef.current ? progressed * 100 : 0)),
    );
  }

  function resumeBar() {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startCycle(remainingRef.current > 0 ? remainingRef.current : DURATION_MS);
  }

  function centerActive(instant?: boolean) {
    const root = peopleRef.current;
    if (!root) return;
    if (root.scrollWidth - root.clientWidth <= 4) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>(".tst-person"));
    const n = TESTIMONIALS.length;
    // Prefer the middle copy when looping so both sides have neighbours.
    const preferred =
      isMobileLoop && cards[currentRef.current + n]
        ? cards[currentRef.current + n]
        : null;
    let pick = preferred;
    if (!pick) {
      const viewCenter = root.scrollLeft + root.clientWidth / 2;
      let best = Infinity;
      cards.forEach((card) => {
        if (Number(card.dataset.idx) !== currentRef.current) return;
        const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - viewCenter);
        if (d < best) {
          best = d;
          pick = card;
        }
      });
    }
    if (!pick) return;

    const left = pick.offsetLeft - (root.clientWidth - pick.clientWidth) / 2;
    root.scrollTo({
      left,
      behavior: instant || reduceMotionRef.current ? "auto" : "smooth",
    });
  }

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 600px)");
    const sync = () => setIsMobileLoop(mobile.matches);
    sync();
    mobile.addEventListener("change", sync);
    return () => mobile.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = peopleRef.current;
    if (!root || !("IntersectionObserver" in window)) {
      setStarted(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    goTo(currentRef.current, { instant: true });
    return () => {
      clearTimer();
      if (swapTimerRef.current != null) window.clearTimeout(swapTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kick once when section enters view
  }, [started]);

  useEffect(() => {
    if (!started) return;
    centerActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileLoop, started]);

  useEffect(() => {
    const root = peopleRef.current;
    if (!root) return;
    let swipeTimer: number | null = null;
    const onScroll = () => {
      if (root.scrollWidth - root.clientWidth <= 4) return;
      if (swipeTimer != null) window.clearTimeout(swipeTimer);
      swipeTimer = window.setTimeout(() => {
        const cards = Array.from(root.querySelectorAll<HTMLElement>(".tst-person"));
        const viewCenter = root.scrollLeft + root.clientWidth / 2;
        let nearest = -1;
        let best = Infinity;
        cards.forEach((card) => {
          const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - viewCenter);
          if (d < best) {
            best = d;
            nearest = Number(card.dataset.idx);
          }
        });
        if (nearest >= 0 && nearest !== currentRef.current) goTo(nearest);
        else centerActive();
      }, 140);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (swipeTimer != null) window.clearTimeout(swipeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileLoop]);

  const renderCards = isMobileLoop
    ? [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS]
    : TESTIMONIALS;

  return (
    <>
      <section className="testimonials" aria-label="Customer testimonials">
        <div className="container">
          <div className="tst-quote-block reveal">
            <img
              className="tst-deco tst-deco-tl"
              src={`${ASSET}/quote.svg`}
              alt=""
              aria-hidden="true"
            />
            <blockquote className={`tst-quote ${isSwapping ? "is-swapping" : ""}`}>
              <p>{quote}</p>
            </blockquote>
            <img
              className="tst-deco tst-deco-br"
              src={`${ASSET}/quote.svg`}
              alt=""
              aria-hidden="true"
            />
          </div>

          <div
            ref={peopleRef}
            className="tst-people reveal"
            role="tablist"
            aria-label="Choose a testimonial"
          >
            {renderCards.map((person, renderIndex) => {
              const idx = renderIndex % TESTIMONIALS.length;
              const isClone = isMobileLoop && (renderIndex < TESTIMONIALS.length || renderIndex >= TESTIMONIALS.length * 2);
              const isActive = idx === current;
              return (
                <button
                  key={`${person.name}-${renderIndex}`}
                  type="button"
                  className={`tst-person ${isActive ? "is-active" : ""} ${isClone ? "is-clone" : ""}`}
                  role="tab"
                  aria-selected={isClone ? undefined : isActive}
                  aria-hidden={isClone ? true : undefined}
                  tabIndex={isClone ? -1 : 0}
                  data-idx={idx}
                  onClick={() => {
                    if (idx !== current) goTo(idx);
                  }}
                  onMouseEnter={() => {
                    if (idx === currentRef.current) pauseBar();
                  }}
                  onMouseLeave={() => {
                    if (idx === currentRef.current) resumeBar();
                  }}
                >
                  <span className="tst-prog" aria-hidden="true">
                    <span
                      className="tst-prog-fill"
                      style={{
                        width: `${progWidths[idx] ?? 0}%`,
                        transition:
                          progTransitionMs > 0 && isActive
                            ? `width ${progTransitionMs}ms linear`
                            : "none",
                      }}
                    />
                  </span>
                  <span className="tst-photo">
                    <img src={person.photo} alt="" loading="lazy" />
                  </span>
                  <img
                    className={`tst-logo ${person.logoClassName ?? ""}`.trim()}
                    src={person.logo}
                    alt={person.logoAlt}
                    loading="lazy"
                  />
                  <span className="tst-name">{person.name}</span>
                  <span className="tst-role">{person.role}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container">
        <span className="sect-rule" aria-hidden="true" />
      </div>
    </>
  );
}
