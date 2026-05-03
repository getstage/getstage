import { useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { Briefcase, House, PaintBrushBroad, UploadSimple, UsersThree } from "@phosphor-icons/react";
import type { SaveFeedback } from "@/hooks/useFeedback";
import { FeedbackText } from "@/components/settings/FeedbackText";

const ROLE_OPTIONS = [
  { label: "Freelancer", icon: PaintBrushBroad },
  { label: "Studio", icon: Briefcase },
  { label: "In-house", icon: UsersThree },
  { label: "Agency", icon: House },
] as const;

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
  const [selectedRole, setSelectedRole] = useState<string>("In-house");

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-section-card">
        <div className="settings-section-title">Profile Details</div>

        <div className="settings-row-card">
          <div className="settings-row-copy">
            <div className="settings-row-title">Full Name</div>
            <div className="settings-row-description">
              This is your name as it will be displayed on the platform.
            </div>
          </div>
          <div className="settings-inline-control">
            <input
              className="settings-input settings-input-compact"
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
            <button type="button" className="btn-save" onClick={onSaveName} disabled={isSavingName}>
              Save
            </button>
          </div>
          <FeedbackText feedback={nameFeedback} />
        </div>

        <div className="settings-row-card">
          <div className="settings-row-copy">
            <div className="settings-row-title">Avatar</div>
            <div className="settings-row-description">This is what you will look like on the platform.</div>
          </div>
          <div className="settings-avatar-control">
            <div className="avatar-circle">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="Avatar preview" /> : avatarInitial}
            </div>
            <button
              type="button"
              className="avatar-browse"
              onClick={() => avatarInputRef.current?.click()}
            >
              <UploadSimple size={16} />
              Reupload
            </button>
            <span className="settings-spacer" />
            <button type="button" className="settings-danger-link">
              Remove
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={onSaveAvatar}
              disabled={isSavingAvatar || !avatarDataUrl}
            >
              Save
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarInputChange}
              className="hidden-file-input"
            />
          </div>
          <FeedbackText feedback={avatarFeedback} fallback="Square image recommended" />
        </div>

        <div className="settings-row-card">
          <div className="settings-row-header">
            <div className="settings-row-copy">
              <div className="settings-row-title">Role</div>
              <div className="settings-row-description">
                This helps Stage tailor the experience for you.
              </div>
            </div>
            <button type="button" className="btn-save">
              Save
            </button>
          </div>
          <div className="settings-role-grid">
            {ROLE_OPTIONS.map((role) => {
              const Icon = role.icon;
              return (
              <button
                key={role.label}
                type="button"
                className={`settings-role-option ${selectedRole === role.label ? "active" : ""}`}
                onClick={() => setSelectedRole(role.label)}
              >
                <Icon size={16} weight="fill" />
                {role.label}
              </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
