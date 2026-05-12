import { Link } from "@tanstack/react-router";
import stageLogo from "@/assets/logos/stage-logo-light.png";

export function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
      <div className="landing-nav-inner">
        <a href="#" className="landing-nav-logo">
          <img src={stageLogo} alt="Stage" />
        </a>
        <div className="landing-nav-right">
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">
              Features
            </a>
            <a href="#pricing" className="landing-nav-link">
              Pricing
            </a>
            <a href="#faq" className="landing-nav-link">
              FAQ
            </a>
            <Link to="/agents" className="landing-nav-link">
              Agents
            </Link>
          </div>
          <div className="landing-nav-auth">
            <Link to="/auth" className="landing-nav-signin">
              Sign in
            </Link>
            <Link to="/auth" className="landing-btn landing-btn-cta">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
