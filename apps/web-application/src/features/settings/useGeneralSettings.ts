import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAction as useConvexAction, useMutation as useConvexMutation } from "convex/react";
import type { AuthUser } from "@/lib/auth";
import { api } from "@/lib/convex";
import { SAVED_FEEDBACK, useFeedback } from "@/hooks/useFeedback";
import { convexQueryKeys } from "@/lib/queryKeys";
import { prepareAvatarUpload, uploadFileToR2 } from "@/lib/r2Uploads";
import { profileNameSchema } from "@/lib/validation";
import { useSignOut } from "@/lib/auth";
import { showFriendlyFeedback } from "./feedback";

type GeneralSettingsInput = {
  user: AuthUser | null;
  profileName?: string;
  profileAvatarUrl?: string | null;
};

export function useGeneralSettings({
  user,
  profileName,
  profileAvatarUrl,
}: GeneralSettingsInput) {
  const queryClient = useQueryClient();
  const updateProfile = useConvexMutation(api.settings.updateProfile);
  const deleteAccount = useConvexAction(api.settings.deleteAccount);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const signOut = useSignOut();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { feedback: nameFeedback, showFeedback: showNameFeedback } = useFeedback();
  const { feedback: avatarFeedback, showFeedback: showAvatarFeedback } = useFeedback();
  const { feedback: deleteAccountFeedback, showFeedback: showDeleteAccountFeedback } =
    useFeedback();

  useEffect(() => {
    if (!profileName) {
      return;
    }

    setName(profileName);
    setAvatarDataUrl(profileAvatarUrl ?? null);
  }, [profileAvatarUrl, profileName]);

  const avatarInitial = name.trim().charAt(0).toUpperCase() || "S";

  function handleAvatarInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void prepareAvatarUpload(file)
      .then((prepared) => {
        setPendingAvatarFile(prepared.file);
        setAvatarDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showFriendlyFeedback(showAvatarFeedback, error, "Could not prepare this image.");
      });
  }

  async function persistName() {
    const parsed = profileNameSchema.safeParse(name);
    if (!parsed.success) {
      showNameFeedback({
        kind: "error",
        message: parsed.error.issues[0]?.message ?? "Please enter your name.",
      });
      return;
    }

    setIsSavingName(true);
    try {
      await updateProfile({ name: parsed.data });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.settingsOverview });
      setName(parsed.data);
      showNameFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showNameFeedback, error, "Could not save your name.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function persistAvatar() {
    if (!pendingAvatarFile) {
      return;
    }

    setIsSavingAvatar(true);
    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "profile-avatar",
        file: pendingAvatarFile,
      });
      await updateProfile({ avatarKey: key });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.settingsOverview });
      setPendingAvatarFile(null);
      showAvatarFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showAvatarFeedback, error, "Could not save your avatar.");
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleDeleteAccount(confirmation: string) {
    setIsDeletingAccount(true);
    try {
      await deleteAccount({ confirmation });
      showDeleteAccountFeedback(SAVED_FEEDBACK);

      try {
        await signOut();
      } catch {
        // Account deletion already removes active auth sessions, so sign-out can fail safely.
      }

      window.location.assign("/auth");
      return true;
    } catch (error) {
      showFriendlyFeedback(
        showDeleteAccountFeedback,
        error,
        "Could not delete your account right now.",
      );
      return false;
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return {
    name,
    avatarDataUrl,
    avatarInitial,
    avatarInputRef,
    isSavingName,
    isSavingAvatar,
    isDeletingAccount,
    nameFeedback,
    avatarFeedback,
    deleteAccountFeedback,
    setName,
    handleAvatarInputChange,
    persistName,
    persistAvatar,
    handleDeleteAccount,
  };
}
