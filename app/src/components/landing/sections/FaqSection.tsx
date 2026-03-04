import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { FAQ_ITEMS } from "./data";

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section className="landing-faq" id="faq">
      <div className="landing-container">
        <div className="landing-faq-layout">
          <div className="landing-faq-header">
            <div className="landing-section-label">FAQ</div>
            <h2 className="landing-section-title">Frequently asked questions</h2>
            <p className="landing-section-subtitle">
              Quick answers to common questions about pricing, billing, and getting started.
            </p>
          </div>
          <div className="landing-faq-list">
            {FAQ_ITEMS.map((item, index) => (
              <div key={item.question} className={`landing-faq-item ${openFaq === index ? "open" : ""}`}>
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  aria-expanded={openFaq === index}
                  aria-controls={`landing-faq-answer-${index}`}
                >
                  <span className="landing-faq-question-text">{item.question}</span>
                  <span className="landing-faq-icon" aria-hidden="true">
                    <Plus weight="bold" />
                  </span>
                </button>
                <div className="landing-faq-answer" id={`landing-faq-answer-${index}`}>
                  <div className="landing-faq-answer-inner">{item.answer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
