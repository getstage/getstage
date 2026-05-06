import { CopySimple, Key } from "@phosphor-icons/react";

type ApiKeyRow = {
  id: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number;
  isRevoked: boolean;
};

type Feedback =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type DeveloperTabProps = {
  active: boolean;
  isPro: boolean;
  keys: ApiKeyRow[];
  keyName: string;
  isCreating: boolean;
  isRevoking: string | null;
  revealedKey: string | null;
  copied: boolean;
  feedback: Feedback;
  onKeyNameChange: (value: string) => void;
  onCreate: () => void;
  onRevoke: (keyId: string) => void;
  onCopyKey: () => void;
  onDismissRevealedKey: () => void;
  onUpgradeClick: () => void;
};

export function DeveloperTab(props: DeveloperTabProps) {
  const {
    active,
    isPro,
    keys,
    keyName,
    isCreating,
    revealedKey,
    copied,
    feedback,
    onKeyNameChange,
    onCreate,
    onCopyKey,
    onUpgradeClick,
  } = props;
  const activeKey = keys.find((key) => !key.isRevoked) ?? null;
  const displayKey = revealedKey ?? (activeKey ? `stg_live_${activeKey.id.slice(-18)}` : "");
  const generatedPrompt = [
    "# Codex Configuration",
    "",
    displayKey ? `API_KEY=${displayKey}` : "API_KEY=stg_your_key_here",
    "",
    "You are an expert product engineer working on a modern SaaS application.",
    "",
    "- Write clean, production-ready code",
    "- Maintain consistent structure and naming",
    "- Optimize for readability and scalability",
    "- Avoid breaking existing functionality",
    "",
    "UI Guidelines:",
    "- Use modern, minimal design patterns",
    "- Ensure spacing, hierarchy, and responsiveness",
    "",
    "Always return complete, usable code.",
  ].join("\n");

  async function copyGeneratedPrompt() {
    await navigator.clipboard.writeText(generatedPrompt);
  }

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-section-card">
        <div className="settings-section-title">Your API Key</div>
        <div className="settings-section-description">Manage your API key and Prompt Generated</div>

        {!isPro ? (
          <div className="settings-row-card settings-developer-upgrade">
            <div>
              <div className="settings-row-title">Developer access</div>
              <div className="settings-row-description">
                API keys are available on the Pro plan.
              </div>
            </div>
            <button type="button" className="btn-primary-gradient" onClick={onUpgradeClick}>
              Upgrade to Pro
            </button>
          </div>
        ) : null}

        <div className="settings-row-card">
          <div className="settings-row-title">API Key</div>
          {displayKey ? (
            <div className="settings-copy-field">
              <code>{displayKey}</code>
              <button
                type="button"
                className="settings-icon-button"
                onClick={revealedKey ? onCopyKey : () => navigator.clipboard.writeText(displayKey)}
              >
                <CopySimple size={16} weight="bold" />
                <span className="sr-only">{copied ? "Copied" : "Copy API key"}</span>
              </button>
            </div>
          ) : (
            <div className="settings-create-key-row">
              <input
                className="settings-input settings-input-compact"
                type="text"
                value={keyName}
                onChange={(event) => onKeyNameChange(event.target.value)}
                placeholder="Claude Code"
                disabled={isCreating || !isPro}
              />
              <button
                type="button"
                className="btn-save"
                disabled={isCreating || !isPro}
                onClick={onCreate}
              >
                {isCreating ? "Creating..." : "Create key"}
              </button>
            </div>
          )}
        </div>

        <div className="settings-row-card">
          <div className="settings-row-header">
            <div className="settings-row-title">Generated Prompt</div>
            <button type="button" className="settings-icon-button" onClick={() => void copyGeneratedPrompt()}>
              <CopySimple size={16} weight="bold" />
              <span className="sr-only">Copy generated prompt</span>
            </button>
          </div>
          <pre className="settings-generated-prompt">{generatedPrompt}</pre>
        </div>

        <div className="settings-developer-feedback">
          <Key size={14} weight="fill" />
          {feedback.kind === "idle" ? (
            <span className="card-footer-text">API keys are stored hashed and only shown once.</span>
          ) : (
            <span
              className="card-footer-text"
              style={{
                color: feedback.kind === "success" ? "#16a34a" : "var(--color-destructive, #E07070)",
              }}
            >
              {feedback.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
