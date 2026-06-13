import { buildPublicAssetUrl, isR2Key } from "./keys";
import { r2 } from "../../lib/r2/domain";

export async function resolveAssetUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!isR2Key(value)) {
    return value;
  }

  const publicUrl = buildPublicAssetUrl(value);
  if (publicUrl) {
    return publicUrl;
  }

  return r2.getUrl(value);
}
