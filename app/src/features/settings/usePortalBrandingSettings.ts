import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { SAVED_FEEDBACK, useFeedback } from "@/hooks/useFeedback";
import { DEFAULT_PORTAL_COLOR } from "@/lib/constants";
import { api } from "@/lib/convex";
import { normalizeHex } from "@/lib/format";
import { rebaseUrlToCurrentOrigin } from "@/lib/portal";
import { savePortalPreviewBranding } from "@/lib/portalPreview";
import { convexQueryKeys } from "@/lib/queryKeys";
import {
  preparePortalLogoUpload,
  uploadFileToR2,
} from "@/lib/r2Uploads";
import { showFriendlyFeedback } from "./feedback";

const PREVIEW_PORTAL_URL = "/portal/share_acme_2026?preview=1";

type PortalBrandingInput = {
  previewPortalUrl?: string;
  portalLogoUrl?: string | null;
  portalAccentColor?: string;
};

export function usePortalBrandingSettings({
  previewPortalUrl,
  portalLogoUrl,
  portalAccentColor,
}: PortalBrandingInput) {
  const queryClient = useQueryClient();
  const updatePortalBranding = useConvexMutation(api.settings.updatePortalBranding);
  const r2GenerateUploadUrl = useConvexMutation(api.r2.generateUploadUrl);
  const r2SyncMetadata = useConvexMutation(api.r2.syncMetadata);
  const [portalLogoDataUrl, setPortalLogoDataUrl] = useState<string | null>(null);
  const [portalColor, setPortalColor] = useState(DEFAULT_PORTAL_COLOR);
  const [hexInput, setHexInput] = useState(DEFAULT_PORTAL_COLOR);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [isSavingPortalLogo, setIsSavingPortalLogo] = useState(false);
  const [isSavingPortalColor, setIsSavingPortalColor] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { feedback: portalLogoFeedback, showFeedback: showPortalLogoFeedback } = useFeedback();
  const { feedback: portalColorFeedback, showFeedback: showPortalColorFeedback } = useFeedback();

  useEffect(() => {
    setPortalLogoDataUrl(portalLogoUrl ?? null);
    setPortalColor(portalAccentColor ?? DEFAULT_PORTAL_COLOR);
    setHexInput(portalAccentColor ?? DEFAULT_PORTAL_COLOR);
  }, [portalAccentColor, portalLogoUrl]);

  function handleLogoInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void preparePortalLogoUpload(file)
      .then((prepared) => {
        setPendingLogoFile(prepared.file);
        setPortalLogoDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showFriendlyFeedback(showPortalLogoFeedback, error, "Could not prepare this image.");
      });
  }

  function handleLogoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    void preparePortalLogoUpload(file)
      .then((prepared) => {
        setPendingLogoFile(prepared.file);
        setPortalLogoDataUrl(prepared.previewUrl);
      })
      .catch((error) => {
        showFriendlyFeedback(showPortalLogoFeedback, error, "Could not prepare this image.");
      });
  }

  function handleLogoDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragActive(true);
  }

  function handlePortalColorInput(value: string) {
    const normalized = normalizeHex(value);
    if (!normalized) {
      return;
    }
    setPortalColor(normalized);
    setHexInput(normalized);
  }

  function handleHexInputChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setHexInput(value.toUpperCase());
    const normalized = normalizeHex(value);
    if (normalized) {
      setPortalColor(normalized);
    }
  }

  function handleHexInputBlur() {
    const normalized = normalizeHex(hexInput);
    if (!normalized) {
      setHexInput(portalColor);
      return;
    }
    setPortalColor(normalized);
    setHexInput(normalized);
  }

  async function persistPortalLogo() {
    if (portalLogoDataUrl === null) {
      setIsSavingPortalLogo(true);
      try {
        await updatePortalBranding({ logoUrl: null });
        void queryClient.invalidateQueries({ queryKey: convexQueryKeys.settingsOverview });
        setPendingLogoFile(null);
        showPortalLogoFeedback(SAVED_FEEDBACK);
      } catch (error) {
        showFriendlyFeedback(showPortalLogoFeedback, error, "Could not save the portal logo.");
      } finally {
        setIsSavingPortalLogo(false);
      }
      return;
    }

    if (!pendingLogoFile) {
      return;
    }

    setIsSavingPortalLogo(true);
    try {
      const key = await uploadFileToR2({
        generateUploadUrl: r2GenerateUploadUrl,
        syncMetadata: r2SyncMetadata,
        purpose: "portal-logo",
        file: pendingLogoFile,
      });
      await updatePortalBranding({ logoKey: key });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.settingsOverview });
      setPendingLogoFile(null);
      showPortalLogoFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showPortalLogoFeedback, error, "Could not save the portal logo.");
    } finally {
      setIsSavingPortalLogo(false);
    }
  }

  async function persistPortalColor() {
    setIsSavingPortalColor(true);
    try {
      await updatePortalBranding({
        accentColor: portalColor,
      });
      void queryClient.invalidateQueries({ queryKey: convexQueryKeys.settingsOverview });
      showPortalColorFeedback(SAVED_FEEDBACK);
    } catch (error) {
      showFriendlyFeedback(showPortalColorFeedback, error, "Could not save the portal color.");
    } finally {
      setIsSavingPortalColor(false);
    }
  }

  function handlePreviewPortalClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    savePortalPreviewBranding({
      accentColor: portalColor,
      logoUrl: portalLogoDataUrl,
    });
    const previewUrl = rebaseUrlToCurrentOrigin(previewPortalUrl ?? PREVIEW_PORTAL_URL);
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

  function handleLogoRemove() {
    setPendingLogoFile(null);
    setPortalLogoDataUrl(null);
  }

  return {
    portalLogoDataUrl,
    portalColor,
    hexInput,
    logoDragActive,
    logoInputRef,
    isSavingPortalLogo,
    isSavingPortalColor,
    portalLogoFeedback,
    portalColorFeedback,
    setLogoDragActive,
    handlePreviewPortalClick,
    handleLogoInputChange,
    handleLogoDrop,
    handleLogoDragOver,
    handleLogoDragLeave: () => setLogoDragActive(false),
    handleLogoRemove,
    handlePortalColorInput,
    handleHexInputChange,
    handleHexInputBlur,
    persistPortalLogo,
    persistPortalColor,
  };
}
