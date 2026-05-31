import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Avatar } from "@/components/ui/Avatar";
import { useSettingsOverviewQuery } from "@/hooks/convex-data";
import { api } from "@/lib/convexApi";
import {
  AVATAR_ACCEPT,
  prepareAvatarUpload,
  uploadFileToR2,
} from "@/lib/r2Uploads";
import { settingsSnapshot } from "@/data/settings/settingsSnapshot";
import { profileUpdateResultSchema, userRoleSchema, type ProfileUpdateResult, type UserRole } from "@/models/settings/settings";
import { SettingsIcon } from "./SettingsIcons";
import { SaveButton, SettingsCard, SettingsRow } from "./SettingsPrimitives";

export function ProfilePanel() {
  const { profile } = settingsSnapshot;
  const overview = useSettingsOverviewQuery();
  const updateProfile = useMutation(api.settings.updateProfile);
  const generateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const savedName = overview.data?.profile.name || profile.fullName;
  const savedAvatarUrl = overview.data?.profile.avatarUrl ?? undefined;
  const savedRole: UserRole = overview.data?.profile.role ?? userRoleSchema.parse(profile.selectedRole);
  const [fullName, setFullName] = useState(savedName);
  const [selectedRole, setSelectedRole] = useState<UserRole>(savedRole);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);

  useEffect(() => {
    setFullName(savedName);
  }, [savedName]);

  useEffect(() => {
    setSelectedRole(savedRole);
  }, [savedRole]);

  async function selectAvatarFile(file: File | undefined) {
    if (!file) return;
    setProfileError(null);
    setProfileNotice(null);
    try {
      const prepared = await prepareAvatarUpload(file);
      setAvatarFile(prepared.file);
      setAvatarPreviewUrl(prepared.previewUrl);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not prepare this avatar.");
    }
  }

  function parseProfileUpdateResult(result: unknown): ProfileUpdateResult {
    return profileUpdateResultSchema.parse(result);
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      const trimmedName = fullName.trim();
      const avatarKey = avatarFile
        ? await uploadFileToR2({
            generateUploadUrl,
            syncMetadata,
            purpose: "profile-avatar",
            file: avatarFile,
          })
        : undefined;
      const result = parseProfileUpdateResult(
        await updateProfile(avatarKey ? { name: trimmedName, avatarKey } : { name: trimmedName }),
      );
      setFullName(result.name);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setProfileNotice("Profile saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function saveRole() {
    if (selectedRole === savedRole) {
      return;
    }

    setIsSavingRole(true);
    setRoleError(null);
    setRoleNotice(null);
    try {
      const result = parseProfileUpdateResult(await updateProfile({ role: selectedRole }));
      setSelectedRole(result.role);
      setRoleNotice("Role saved.");
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : "Could not save role.");
    } finally {
      setIsSavingRole(false);
    }
  }

  async function removeAvatar() {
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);
    try {
      const result = parseProfileUpdateResult(
        await updateProfile({ name: fullName.trim(), avatarUrl: "" }),
      );
      setFullName(result.name);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setProfileNotice("Avatar removed.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not remove avatar.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const avatarSrc = avatarPreviewUrl ?? savedAvatarUrl;
  const roleChanged = selectedRole !== savedRole;

  return (
    <SettingsCard title="Profile Details">
      <div className="flex flex-col gap-[4px]">
        <SettingsRow>
          <div className="mb-[12px]">
            <h3 className="text-[13px] font-medium leading-none text-[#171717]">Full Name</h3>
            <p className="mt-[4px] text-[12px] font-normal leading-none text-[#525252]">
              This is your name as it will be displayed on the platform.
            </p>
          </div>
          <div className="flex gap-[8px]">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex min-h-[30px] flex-1 items-center rounded-[6px] bg-[#F5F5F5] px-[12px] py-[8px] text-[12px] font-medium leading-none text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] outline-none"
            />
            <SaveButton onClick={() => void saveProfile()} disabled={isSavingProfile}>
              {isSavingProfile ? "Saving" : "Save"}
            </SaveButton>
          </div>
        </SettingsRow>

        <SettingsRow>
          <div className="mb-[16px]">
            <h3 className="text-[13px] font-medium leading-none text-[#171717]">Avatar</h3>
            <p className="mt-[4px] text-[12px] font-normal leading-none text-[#525252]">
              This is what you will look like on the platform.
            </p>
          </div>
          <div className="flex items-center gap-[8px]">
            <Avatar name={fullName} src={avatarSrc} size="lg" className="h-[56px] w-[56px]" />
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={(event) => {
                void selectAvatarFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center gap-[6px] pl-[12px] text-[12px] font-medium leading-none text-[#525252] transition-colors hover:text-[#171717]"
            >
              <SettingsIcon name="upload" className="h-[16px] w-[16px]" />
              Reupload
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => void removeAvatar()}
              disabled={isSavingProfile || (!avatarSrc && !avatarFile)}
              className="cursor-pointer text-[12px] font-medium leading-none text-[#EF4444] transition-colors hover:text-[#DC2626]"
            >
              Remove
            </button>
            <SaveButton onClick={() => void saveProfile()} disabled={isSavingProfile}>
              {isSavingProfile ? "Saving" : "Save"}
            </SaveButton>
          </div>
          {profileError ? <p className="mt-[10px] text-[12px] font-medium text-[#b91c1c]">{profileError}</p> : null}
          {profileNotice ? <p className="mt-[10px] text-[12px] font-medium text-[#166534]">{profileNotice}</p> : null}
        </SettingsRow>

        <SettingsRow>
          <div className="mb-[16px] flex items-end justify-between gap-[16px]">
            <div>
              <h3 className="text-[13px] font-medium leading-none text-[#171717]">Role</h3>
              <p className="mt-[4px] text-[12px] font-normal leading-none text-[#525252]">
                This helps Stage tailor the experience for you.
              </p>
            </div>
            <SaveButton
              onClick={() => void saveRole()}
              disabled={isSavingRole || !roleChanged}
            >
              {isSavingRole ? "Saving" : "Save"}
            </SaveButton>
          </div>
          <div className="grid grid-cols-4 gap-[4px]">
            {profile.roles.map((role) => {
              const active = role.id === selectedRole;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(userRoleSchema.parse(role.id));
                    setRoleError(null);
                    setRoleNotice(null);
                  }}
                  className={`flex min-h-[64px] cursor-pointer items-center justify-center gap-[8px] rounded-[6px] px-[12px] py-[24px] text-[12px] font-medium leading-none transition-colors outline-none ${
                    active
                      ? "bg-[#E8E6FF] text-[#14113F] ring-1 ring-inset ring-[#8782F5]/25"
                      : "bg-[#F5F5F5] text-[#525252] hover:bg-[#EFEFEF]"
                  }`}
                >
                  <SettingsIcon name={role.icon} className="h-[16px] w-[16px]" />
                  {role.label}
                </button>
              );
            })}
          </div>
          {roleError ? <p className="mt-[10px] text-[12px] font-medium text-[#b91c1c]">{roleError}</p> : null}
          {roleNotice ? <p className="mt-[10px] text-[12px] font-medium text-[#166534]">{roleNotice}</p> : null}
        </SettingsRow>
      </div>
    </SettingsCard>
  );
}
