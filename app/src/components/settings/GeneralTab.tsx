import { useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import type { SaveFeedback } from "@/hooks/useFeedback";
import { FeedbackText } from "@/components/settings/FeedbackText";

const ROLE_OPTIONS = ["Freelancer", "Studio", "In-house", "Agency"] as const;

type GeneralTabProps = {
  active: boolean;
  name: string;
  avatarDataUrl: string | null;
  avatarInitial: string;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  isSavingName: boolean;
  isSavingAvatar: boolean;
  nameFeedback: SaveFeedback;
  avatarFeedback: SaveFeedback;
  onNameChange: (value: string) => void;
  onAvatarInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSaveName: () => void;
  onSaveAvatar: () => void;
};

export function GeneralTab({
  active,
  name,
  avatarDataUrl,
  avatarInitial,
  avatarInputRef,
  isSavingName,
  isSavingAvatar,
  nameFeedback,
  avatarFeedback,
  onNameChange,
  onAvatarInputChange,
  onSaveName,
  onSaveAvatar,
}: GeneralTabProps) {
  const [selectedRole, setSelectedRole] = useState<string>("Freelancer");

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Full name</div>
          <div className="card-desc">
            This is your name as it will be displayed on the platform.
          </div>
          <label className="settings-label">Name</label>
          <input
            className="settings-input"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>
        <div className="card-footer">
          <FeedbackText feedback={nameFeedback} />
          <button type="button" className="btn-save" onClick={onSaveName} disabled={isSavingName}>
            Save
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Avatar</div>
          <div className="card-desc">This is what you will look like on the platform.</div>
          <div className="avatar-row">
            <div className="avatar-circle">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="Avatar preview" /> : avatarInitial}
            </div>
            <button
              type="button"
              className="avatar-browse"
              onClick={() => avatarInputRef.current?.click()}
            >
              Browse
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarInputChange}
              className="hidden-file-input"
            />
          </div>
        </div>
        <div className="card-footer">
          <FeedbackText feedback={avatarFeedback} fallback="Square image recommended" />
          <button
            type="button"
            className="btn-save"
            onClick={onSaveAvatar}
            disabled={isSavingAvatar || !avatarDataUrl}
          >
            Save
          </button>
        </div>
      </div>

      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Role</div>
          <div className="card-desc">
            This helps Stage tailor the experience for you.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                type="button"
                className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  selectedRole === role
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-border-subtle bg-white text-text-secondary hover:border-border-default hover:text-text-primary"
                }`}
                onClick={() => setSelectedRole(role)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <div className="card-footer">
          <span />
          <button type="button" className="btn-save">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
