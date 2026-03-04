import stageLogo from "@/assets/logos/stage-logo-light.png";

export function FooterSection() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer-shell">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <a href="#" className="landing-footer-logo">
                <img src={stageLogo} alt="Stage" />
              </a>
              <div className="landing-footer-brand-desc">
                Project management built for creative professionals. Track work, manage clients, get
                paid.
              </div>
              <div className="landing-footer-brand-meta">Made for designers and freelancers.</div>
            </div>
            <div>
              <div className="landing-footer-col-title">Product</div>
              <a href="#features" className="landing-footer-link">
                Features
              </a>
              <a href="#pricing" className="landing-footer-link">
                Pricing
              </a>
              <a href="#" className="landing-footer-link">
                Changelog
              </a>
            </div>
            <div>
              <div className="landing-footer-col-title">Company</div>
              <a href="#" className="landing-footer-link">
                About
              </a>
              <a href="#" className="landing-footer-link">
                Blog
              </a>
              <a href="#" className="landing-footer-link">
                Contact
              </a>
            </div>
            <div>
              <div className="landing-footer-col-title">Legal</div>
              <a href="#" className="landing-footer-link">
                Terms
              </a>
              <a href="#" className="landing-footer-link">
                Privacy
              </a>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© 2026 Stage</span>
            <div className="landing-footer-bottom-links">
              <a href="#features" className="landing-footer-bottom-link">
                Features
              </a>
              <a href="#faq" className="landing-footer-bottom-link">
                FAQ
              </a>
              <a href="#pricing" className="landing-footer-bottom-link">
                Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
