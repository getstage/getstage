import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/lib/convexApi";
import { familyFromFileName, type UploadedFont } from "@/lib/fonts/uploadedFonts";
import { uploadFileToR2 } from "@/lib/r2Uploads";

/**
 * Uploads a font file for a project's Style Guide. The font is registered from the
 * local file right away so the preview updates before the backend returns its URL.
 */
export function useStyleGuideFontUpload(projectId: string) {
  const generateUploadUrl = useMutation(api.r2.generateUploadUrl);
  const syncMetadata = useMutation(api.r2.syncMetadata);

  return useCallback(
    async (file: File): Promise<UploadedFont> => {
      const family = familyFromFileName(file.name);
      if (!family) throw new Error("This font file needs a name.");
      const [key] = await Promise.all([
        uploadFileToR2({ generateUploadUrl, syncMetadata, purpose: "styleguide-font", file, scopeId: projectId }),
        registerLocalFont(family, file),
      ]);
      return { family, key };
    },
    [generateUploadUrl, syncMetadata, projectId],
  );
}

async function registerLocalFont(family: string, file: File) {
  const face = new FontFace(family, await file.arrayBuffer(), { weight: "100 900" });
  try {
    document.fonts.add(await face.load());
  } catch {
    throw new Error("This file isn't a font Stage can read. Try a .woff2, .woff, .ttf or .otf file.");
  }
}
