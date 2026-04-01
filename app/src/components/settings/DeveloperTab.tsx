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

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      {!isPro ? (
        <div className="settings-card">
          <div className="card-body">
            <h2>Developer</h2>
            <p className="card-description">
              API access is available on the Pro plan. Upgrade to create API keys and integrate Stage with AI agents.
            </p>
          </div>
          <div className="card-footer">
            <button type="button" className="btn btn-primary" onClick={onUpgradeClick}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Create key */}
          <div className="settings-card">
            <div className="card-body">
              <h2>API Keys</h2>
              <p className="card-description">
                Create API keys to integrate Stage with Claude Code, OpenClaw, or any external tool.
                Keys are shown once at creation and cannot be retrieved later.
              </p>

              {revealedKey ? (
                <div className="developer-key-reveal">
                  <label className="developer-label">Your new API key</label>
                  <div className="developer-key-box">
                    <code className="developer-key-value">{revealedKey}</code>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
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
                    className="btn btn-sm btn-secondary"
                    onClick={onDismissRevealedKey}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="developer-create-form">
                  <label className="developer-label" htmlFor="dev-key-name">
                    Key name
                  </label>
                  <div className="developer-create-row">
                    <input
                      id="dev-key-name"
                      type="text"
                      className="developer-input"
                      placeholder="e.g. Claude Code, OpenClaw agent"
                      value={keyName}
                      onChange={(e) => onKeyNameChange(e.target.value)}
                      maxLength={64}
                      disabled={isCreating}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onCreate}
                      disabled={isCreating || activeKeys.length >= 5}
                    >
                      {isCreating ? "Creating..." : "Create key"}
                    </button>
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
              <div className="card-footer">
                <span className={`feedback ${feedback.kind}`}>{feedback.message}</span>
              </div>
            )}
          </div>

          {/* Key list */}
          {keys.length > 0 && (
            <div className="settings-card">
              <div className="card-body">
                <h2>Active Keys</h2>
                <div className="developer-key-list">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className={`developer-key-row ${k.isRevoked ? "revoked" : ""}`}
                    >
                      <div className="developer-key-info">
                        <span className="developer-key-name">{k.name}</span>
                        <span className="developer-key-meta">
                          Created {formatDate(k.createdAt)}
                          {k.lastUsedAt && ` · Last used ${formatDate(k.lastUsedAt)}`}
                          {k.isRevoked && " · Revoked"}
                        </span>
                      </div>
                      {!k.isRevoked && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => onRevoke(k.id)}
                          disabled={isRevoking === k.id}
                        >
                          {isRevoking === k.id ? "Revoking..." : "Revoke"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Docs link */}
          <div className="settings-card">
            <div className="card-body">
              <h2>Documentation</h2>
              <p className="card-description">
                Read the API docs to learn how to integrate Stage with your AI agents and tools.
              </p>
            </div>
            <div className="card-footer">
              <a href="/docs" className="btn btn-secondary">
                View API Docs
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
