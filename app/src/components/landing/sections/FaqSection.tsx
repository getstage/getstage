import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { FAQ_ITEMS } from "./data";

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState(-1);

  return (
    <section className="landing-faq-grid-section" id="faq">
      <div className="landing-faq-lattice">
        <div className="landing-faq-lattice-row landing-faq-lattice-row-top" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="landing-faq-lattice-cell" />
          ))}
        </div>

        <div className="landing-faq-lattice-row landing-faq-lattice-row-content">
          <div className="landing-faq-lattice-cell" aria-hidden="true" />

          <div className="landing-faq-grid-intro">
            <h2 className="landing-section-title">Frequently <span className="landing-text-accent">asked</span> questions</h2>
            <p className="landing-section-subtitle">
              Quick answers to common questions about pricing, billing, and getting started.
            </p>
          </div>

          <div className="landing-faq-grid-list">
            {FAQ_ITEMS.map((item, index) => (
              <div key={item.question} className={`landing-faq-item ${openFaq === index ? "open" : ""}`}>
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq((currentOpenFaq) => (currentOpenFaq === index ? -1 : index))}
                  aria-expanded={openFaq === index}
                  aria-controls={`landing-faq-answer-${index}`}
                >
                  <span className="landing-faq-question-text">{item.question}</span>
                  <span className="landing-faq-icon" aria-hidden="true">
                    <CaretDown weight="bold" />
                  </span>
                </button>
                <div className="landing-faq-answer" id={`landing-faq-answer-${index}`}>
                  <div className="landing-faq-answer-inner">{item.answer}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-faq-lattice-cell" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
