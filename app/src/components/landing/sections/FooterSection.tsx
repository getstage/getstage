import { Link } from "@tanstack/react-router";
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
                Plan phases, share progress, and keep payments in view from one calm workspace.
              </div>
              <div className="landing-footer-brand-meta">
                Made for designers, freelancers, and small studios.
              </div>
            </div>
            <div>
              <div className="landing-footer-col-title">Product</div>
              <a href="#features" className="landing-footer-link">
                Features
              </a>
              <a href="#pricing" className="landing-footer-link">
                Pricing
              </a>
              <Link to="/agents" className="landing-footer-link">
                Agents
              </Link>
              <Link to="/docs" className="landing-footer-link">
                REST API
              </Link>
            </div>
            <div>
              <div className="landing-footer-col-title">Integrations</div>
              <Link to="/agents/stitch" className="landing-footer-link">
                Stitch
              </Link>
              <Link to="/agents/skills" className="landing-footer-link">
                Agent Skills
              </Link>
              <Link to="/openclaw" className="landing-footer-link">
                OpenClaw
              </Link>
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
              <Link to="/agents" className="landing-footer-bottom-link">
                Agents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
