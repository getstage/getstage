import {
  ArrowSquareOut,
  BracketsAngle,
  Key,
  ShieldCheckered,
  Sparkle,
} from "@phosphor-icons/react";

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

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DeveloperTab({
  active,
  isPro,
  keys,
  keyName,
  isCreating,
  isRevoking,
  revealedKey,
  copied,
  feedback,
  onKeyNameChange,
  onCreate,
  onRevoke,
  onCopyKey,
  onDismissRevealedKey,
  onUpgradeClick,
}: DeveloperTabProps) {
  const activeKeys = keys.filter((k) => !k.isRevoked);
  const revokedKeys = keys.filter((k) => k.isRevoked);

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      {!isPro ? (
        <div className="settings-card developer-locked-card">
          <div className="card-body">
            <div className="developer-card-hero">
              <span className="developer-icon-chip developer-icon-chip-accent">
                <BracketsAngle size={18} weight="bold" />
              </span>
              <div>
                <div className="developer-eyebrow">Developer access</div>
                <div className="card-heading sf">Developer</div>
              </div>
            </div>
            <p className="card-desc">
              API access is available on the Pro plan. Upgrade to create API keys and integrate Stage with AI agents.
            </p>
            <div className="developer-pill-row">
              <span className="developer-pill">API keys</span>
              <span className="developer-pill">Bearer auth</span>
              <span className="developer-pill">External agents</span>
            </div>
          </div>
          <div className="card-footer">
            <button
              type="button"
              className="cursor-pointer rounded-[10px] bg-accent px-6 py-2.5 text-[14px] font-medium text-white transition-all duration-150 hover:bg-accent-hover"
              onClick={onUpgradeClick}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Create key */}
          <div className="settings-card developer-keys-card">
            <div className="card-body">
              <div className="developer-card-hero developer-card-hero-spaced">
                <div className="developer-card-hero">
                  <span className="developer-icon-chip developer-icon-chip-accent">
                    <Key size={18} weight="bold" />
                  </span>
                  <div>
                    <div className="developer-eyebrow">Developer access</div>
                    <div className="card-heading sf">API Keys</div>
                  </div>
                </div>
                <div className="developer-pill-row">
                  <span className="developer-pill developer-pill-purple">stg_ keys</span>
                  <span className="developer-pill developer-pill-blue">Bearer auth</span>
                </div>
              </div>
              <p className="card-desc">
                Create API keys to integrate Stage with Claude Code, the test AI workflow, or any compatible external agent.
                Keys are shown once at creation and cannot be retrieved later.
              </p>

              {revealedKey ? (
                <div className="developer-key-reveal developer-surface developer-surface-accent">
                  <label className="developer-label">Your new API key</label>
                  <div className="developer-key-box">
                    <code className="developer-key-value">{revealedKey}</code>
                    <button
                      type="button"
                      className="cursor-pointer rounded-[8px] border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-primary transition-all duration-150 hover:bg-bg-subtle"
                      onClick={onCopyKey}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="developer-key-warning">
                    Copy this key now. It will not be shown again.
                  </p>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={onDismissRevealedKey}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="developer-create-form developer-surface developer-surface-accent">
                  <label className="developer-label" htmlFor="dev-key-name">
                    Key name
                  </label>
                  <div className="developer-create-row">
                    <input
                      id="dev-key-name"
                      type="text"
                      className="developer-input"
                      placeholder="e.g. Claude Code, research test agent"
                      value={keyName}
                      onChange={(e) => onKeyNameChange(e.target.value)}
                      maxLength={64}
                      disabled={isCreating}
                    />
                    <button
                      type="button"
                      className="cursor-pointer rounded-[10px] bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-all duration-150 hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
                      onClick={onCreate}
                      disabled={isCreating || activeKeys.length >= 5}
                    >
                      {isCreating ? "Creating..." : "Create key"}
                    </button>
                  </div>
                  <div className="developer-microcopy-row">
                    <span className="developer-inline-note">
                      <ShieldCheckered size={14} weight="fill" />
                      Stored hashed, never shown twice
                    </span>
                    <span className="developer-inline-note">
                      <Sparkle size={14} weight="fill" />
                      Best for Claude Code or any compatible agent
                    </span>
                  </div>
                  {activeKeys.length >= 5 && (
                    <p className="developer-key-warning">
                      Maximum 5 active keys. Revoke an existing key to create a new one.
                    </p>
                  )}
                </div>
              )}
            </div>

            {feedback.kind !== "idle" && (
              <div className="card-footer developer-feedback-footer">
                <span className={`developer-feedback developer-feedback-${feedback.kind}`}>
                  {feedback.message}
                </span>
              </div>
            )}
          </div>

          {/* Key list */}
          {keys.length > 0 && (
            <div className="settings-card developer-list-card">
              <div className="card-body">
                <div className="developer-card-hero developer-card-hero-spaced">
                  <div className="developer-card-hero">
                    <span className="developer-icon-chip developer-icon-chip-green">
                      <ShieldCheckered size={18} weight="bold" />
                    </span>
                    <div>
                      <div className="developer-eyebrow">Access overview</div>
                      <div className="card-heading sf">Active Keys</div>
                    </div>
                  </div>
                  <span className="developer-pill developer-pill-green">
                    {activeKeys.length} active
                  </span>
                </div>
                <div className="developer-key-list">
                  {activeKeys.length > 0 ? (
                    activeKeys.map((k) => (
                      <div
                        key={k.id}
                        className="developer-key-row"
                      >
                        <div className="developer-key-main">
                          <span className="developer-key-icon">
                            <Key size={16} weight="bold" />
                          </span>
                          <div className="developer-key-info">
                            <div className="developer-key-title-row">
                              <span className="developer-key-name">{k.name}</span>
                              <span className="developer-status-badge active">
                                Active
                              </span>
                            </div>
                            <span className="developer-key-meta">
                              Created {formatDate(k.createdAt)}
                              {k.lastUsedAt && ` · Last used ${formatDate(k.lastUsedAt)}`}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-outline developer-revoke-button"
                          onClick={() => onRevoke(k.id)}
                          disabled={isRevoking === k.id}
                        >
                          {isRevoking === k.id ? "Revoking..." : "Revoke"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div
                      className="developer-key-row revoked"
                    >
                      <div className="developer-key-main">
                        <span className="developer-key-icon developer-key-icon-revoked">
                          <Key size={16} weight="bold" />
                        </span>
                          <div className="developer-key-info">
                            <span className="developer-key-meta">
                              No active keys. Create one above to run the API, AI workflow tests, or smoke checks.
                            </span>
                          </div>
                      </div>
                    </div>
                  )}
                </div>

                {revokedKeys.length > 0 && (
                  <div className="developer-key-list" style={{ marginTop: 16 }}>
                    <div className="developer-card-hero developer-card-hero-spaced">
                      <div className="developer-card-hero">
                        <span className="developer-icon-chip developer-icon-chip-blue">
                          <ShieldCheckered size={18} weight="bold" />
                        </span>
                        <div>
                          <div className="developer-eyebrow">History</div>
                          <div className="card-heading sf">Revoked Keys</div>
                        </div>
                      </div>
                      <span className="developer-pill">
                        {revokedKeys.length} revoked
                      </span>
                    </div>
                    {revokedKeys.map((k) => (
                      <div
                        key={k.id}
                        className="developer-key-row revoked"
                      >
                        <div className="developer-key-main">
                          <span className="developer-key-icon developer-key-icon-revoked">
                            <Key size={16} weight="bold" />
                          </span>
                          <div className="developer-key-info">
                            <div className="developer-key-title-row">
                              <span className="developer-key-name">{k.name}</span>
                              <span className="developer-status-badge revoked">
                                Revoked
                              </span>
                            </div>
                            <span className="developer-key-meta">
                              Created {formatDate(k.createdAt)}
                              {k.lastUsedAt && ` · Last used ${formatDate(k.lastUsedAt)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Docs link */}
          <div className="settings-card developer-docs-card">
            <div className="card-body">
              <div className="developer-card-hero developer-card-hero-spaced">
                <div className="developer-card-hero">
                  <span className="developer-icon-chip developer-icon-chip-blue">
                    <BracketsAngle size={18} weight="bold" />
                  </span>
                  <div>
                    <div className="developer-eyebrow">Reference</div>
                    <div className="card-heading sf">Documentation</div>
                  </div>
                </div>
                <a href="/agents/skills" className="developer-inline-link">
                  Install skill
                  <ArrowSquareOut size={14} weight="bold" />
                </a>
              </div>
              <p className="card-desc">
                Read the API docs to learn how to integrate Stage with your AI agents and tools.
              </p>
              <div className="developer-pill-row developer-pill-row-wrap">
                <span className="developer-pill developer-pill-purple">Import plan</span>
                <span className="developer-pill developer-pill-blue">Task detail</span>
                <span className="developer-pill developer-pill-amber">Action policy</span>
              </div>
            </div>
            <div className="card-footer">
              <a href="/docs" className="btn-outline developer-docs-button">
                View API Docs
              </a>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
