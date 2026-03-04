import type { ChangeEvent, DragEvent, MouseEvent, RefObject } from "react";
import type { SaveFeedback } from "@/hooks/useFeedback";
import { FeedbackText } from "@/components/settings/FeedbackText";

type PortalTabProps = {
  active: boolean;
  previewPortalUrl: string;
  portalLogoDataUrl: string | null;
  portalColor: string;
  hexInput: string;
  logoDragActive: boolean;
  logoInputRef: RefObject<HTMLInputElement | null>;
  isSavingPortalLogo: boolean;
  isSavingPortalColor: boolean;
  portalLogoFeedback: SaveFeedback;
  portalColorFeedback: SaveFeedback;
  onPreviewPortalClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  onLogoInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLogoDrop: (event: DragEvent<HTMLDivElement>) => void;
  onLogoDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onLogoDragLeave: () => void;
  onLogoRemove: () => void;
  onPortalColorInput: (value: string) => void;
  onHexInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onHexInputBlur: () => void;
  onSavePortalLogo: () => void;
  onSavePortalColor: () => void;
};

export function PortalTab({
  active,
  previewPortalUrl,
  portalLogoDataUrl,
  portalColor,
  hexInput,
  logoDragActive,
  logoInputRef,
  isSavingPortalLogo,
  isSavingPortalColor,
  portalLogoFeedback,
  portalColorFeedback,
  onPreviewPortalClick,
  onLogoInputChange,
  onLogoDrop,
  onLogoDragOver,
  onLogoDragLeave,
  onLogoRemove,
  onPortalColorInput,
  onHexInputChange,
  onHexInputBlur,
  onSavePortalLogo,
  onSavePortalColor,
}: PortalTabProps) {
  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="portal-header">
        <div />
        <a className="portal-preview-link" href={previewPortalUrl} onClick={onPreviewPortalClick}>
          Preview portal
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 17L17 7M17 7H9M17 7V15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Logo</div>
          <div className="card-desc">
            Upload your logo to display on the client portal. PNG or SVG recommended.
          </div>
          <div
            className={`logo-upload-area ${portalLogoDataUrl ? "has-logo" : ""} ${logoDragActive ? "drag-active" : ""}`}
            onClick={() => {
              if (!portalLogoDataUrl) {
                logoInputRef.current?.click();
              }
            }}
            onDragOver={onLogoDragOver}
            onDragLeave={onLogoDragLeave}
            onDrop={onLogoDrop}
          >
            {portalLogoDataUrl ? (
              <div className="logo-preview">
                <img src={portalLogoDataUrl} alt="Portal logo preview" />
                <button
                  type="button"
                  className="logo-remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    onLogoRemove();
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <svg
                  className="logo-upload-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="logo-upload-text">
                  Drag &amp; drop or <span>browse</span>
                </div>
              </>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={onLogoInputChange}
            className="hidden-file-input"
          />
        </div>
        <div className="card-footer">
          <FeedbackText feedback={portalLogoFeedback} fallback="Max 2 MB · PNG, SVG, or JPG" />
          <button
            type="button"
            className="btn-save"
            onClick={onSavePortalLogo}
            disabled={isSavingPortalLogo}
          >
            Save
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Brand color</div>
          <div className="card-desc">
            Choose a primary color for buttons, links, and accents on your client portal.
          </div>
          <div className="color-picker-row">
            <div className="color-swatch" style={{ background: portalColor }}>
              <input
                type="color"
                value={portalColor}
                onChange={(event) => onPortalColorInput(event.target.value)}
              />
            </div>
            <input
              className="hex-input"
              type="text"
              value={hexInput}
              maxLength={7}
              onChange={onHexInputChange}
              onBlur={onHexInputBlur}
            />
          </div>
          <div className="brand-preview-label">Preview</div>
          <div className="brand-preview-strip">
            <div className="brand-preview-progress">
              <div className="brand-preview-progress-fill" style={{ background: portalColor }} />
            </div>
            <div className="brand-preview-check-row">
              <div className="brand-preview-check" style={{ background: portalColor }}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="brand-preview-check-label">Project milestone completed</span>
            </div>
            <a className="brand-preview-link" style={{ color: portalColor }}>
              View deliverables →
            </a>
          </div>
        </div>
        <div className="card-footer">
          <FeedbackText
            feedback={portalColorFeedback}
            fallback="Applied to buttons, links, and progress indicators"
          />
          <button
            type="button"
            className="btn-save"
            onClick={onSavePortalColor}
            disabled={isSavingPortalColor}
          >
            Save
          </button>
        </div>
      </div>

      <div className="settings-card locked">
        <div className="card-body">
          <div className="card-heading-row">
            <div className="card-heading sf domain-heading">Custom domain</div>
            <span className="pro-badge">PRO</span>
            <span className="coming-soon-badge">Coming soon</span>
          </div>
          <div className="card-desc">
            Use your own domain for the client portal (e.g. portal.yourstudio.com).
          </div>
          <label className="settings-label">Domain</label>
          <input
            className="settings-input disabled"
            type="text"
            value="portal.yourstudio.com"
            disabled
          />
        </div>
        <div className="card-footer">
          <span className="card-footer-text">Coming soon · requires DNS configuration</span>
          <button
            type="button"
            className="btn-save"
            disabled
            title="Custom domains are not available yet"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
