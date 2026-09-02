import { useEffect, useRef, useState } from "react";

const WALKTHROUGH_SRC = "/stage-v2-lp/assets/videos/stage-walkthrough.mp4";
const WALKTHROUGH_POSTER = "/stage-v2-lp/assets/videos/stage-walkthrough-poster.jpg";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  withVideo?: boolean;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-a1",
    question: "What exactly is Stage?",
    answer:
      "Stage is one app for designing websites and apps. You tell it what you want to build, and it does the hard parts for you - all the way from the first idea to a finished design. No juggling a dozen different tools. Everything happens in one place.",
    withVideo: true,
  },
  {
    id: "faq-a2",
    question: "Do I need my own AI subscription?",
    answer:
      "You bring your own AI - connect the Claude or Codex plan you already pay for and Stage does the rest. There's no second AI bill and no marked-up tokens: you keep full control of your model, your keys, and your usage.",
  },
  {
    id: "faq-a3",
    question: "Which AI models does Stage support?",
    answer:
      "Stage works with Claude and Codex today, and plugs into the tools you already use - Figma, Notion, and Paper. Connect an account once and every part of your workflow, from research to design, runs on the model you choose.",
  },
  {
    id: "faq-a4",
    question: "How does the client portal work?",
    answer:
      "Every project comes with a shareable client portal where research, strategy, and designs live behind a single link. On Pro and Team plans you can make it your own - your logo, your brand colour - so handoffs look polished and stay in one place.",
  },
  {
    id: "faq-a5",
    question: "Can I try Stage before paying?",
    answer:
      "Yes - every plan starts with a 14-day free trial. You add a card at checkout so the plan continues without interruption, and you can cancel in the billing portal any time before the trial ends, no questions asked.",
  },
  {
    id: "faq-a6",
    question: "Is my work and client data private?",
    answer:
      "Your projects are yours. Because you bring your own AI, prompts and designs run through your own model connection - not a shared pool - and Stage never trains on your work. Client data stays scoped to each project and its portal.",
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  function toggleItem(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  function openVideo(trigger: HTMLElement) {
    lastFocusedRef.current = trigger;
    setIsVideoOpen(true);
  }

  function closeVideo() {
    setIsVideoOpen(false);
    const video = modalVideoRef.current;
    if (video) video.pause();
    lastFocusedRef.current?.focus();
  }

  useEffect(() => {
    if (!isVideoOpen) {
      document.body.classList.remove("is-modal-open");
      return;
    }

    document.body.classList.add("is-modal-open");
    closeBtnRef.current?.focus();

    const video = modalVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeVideo();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("is-modal-open");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isVideoOpen]);

  return (
    <>
      <section id="faq" className="faq">
        <div className="container faq-inner">
          <header className="faq-head reveal">
            <h2 className="section-title">
              Questions,
              <br />
              answered.
            </h2>
            <p className="faq-sub">
              Everything you need to know about Stage. Can&apos;t find an answer?{" "}
              <a href="mailto:hello@getstage.co">Talk to us.</a>
            </p>
          </header>

          <div className="faq-list reveal" role="list">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className={`faq-item ${isOpen ? "is-open" : ""}`}
                  role="listitem"
                >
                  <h3 className="faq-q-wrap">
                    <button
                      className="faq-q"
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={item.id}
                      onClick={() => toggleItem(item.id)}
                    >
                      <span className="faq-q-text">{item.question}</span>
                      <span className="faq-icon" aria-hidden="true">
                        <span className="faq-icon-bar" />
                        <span className="faq-icon-bar faq-icon-bar-v" />
                      </span>
                    </button>
                  </h3>
                  <div className="faq-a" id={item.id} role="region">
                    <div className="faq-a-inner" inert={!isOpen ? true : undefined}>
                      <p>{item.answer}</p>
                      {item.withVideo ? (
                        <button
                          className="faq-video-card"
                          type="button"
                          aria-haspopup="dialog"
                          aria-label="Play the Stage walkthrough video"
                          onClick={(event) => openVideo(event.currentTarget)}
                        >
                          <span className="fvc-thumb">
                            <img src={WALKTHROUGH_POSTER} alt="" loading="lazy" />
                            <span className="fvc-play" aria-hidden="true">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
                              </svg>
                            </span>
                          </span>
                          <span className="fvc-copy">
                            <span className="fvc-title">Watch the full walkthrough</span>
                            <span className="fvc-sub">
                              See a whole design project run inside Stage - brief to Figma
                              handoff - in under a minute.
                            </span>
                            <span className="fvc-cue">
                              Play video
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M3.5 8h9m0 0L8.5 4m4 4-4 4"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div
        className={`video-modal ${isVideoOpen ? "is-open" : ""}`}
        aria-hidden={!isVideoOpen}
      >
        <div className="video-modal-backdrop" onClick={closeVideo} />
        <div
          className="video-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Stage product walkthrough"
        >
          <button
            ref={closeBtnRef}
            className="video-modal-close"
            type="button"
            aria-label="Close video"
            onClick={closeVideo}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <video
            ref={modalVideoRef}
            className="video-modal-video"
            src={WALKTHROUGH_SRC}
            poster={WALKTHROUGH_POSTER}
            playsInline
            controls
            preload="none"
          />
        </div>
      </div>
    </>
  );
}
