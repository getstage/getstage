export function getExtensionFromMimeType(mimeType: string, fileName: string) {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/gif":
      return "gif";
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "text/plain":
      return "txt";
    case "text/html":
      return "html";
    case "text/css":
      return "css";
    case "text/csv":
    case "application/csv":
    case "application/vnd.ms-excel":
      return "csv";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "application/vnd.ms-powerpoint":
      return "ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "pptx";
    case "font/ttf":
    case "application/font-sfnt":
      return "ttf";
    case "font/otf":
      return "otf";
    case "font/woff":
      return "woff";
    case "font/woff2":
      return "woff2";
    case "application/vnd.figma":
      return "fig";
    default: {
      const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
      return match?.[1] ?? "bin";
    }
  }
}

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export function getR2PublicBaseUrl() {
  const raw = getEnv("R2_PUBLIC_BASE_URL")?.trim();
  if (!raw) {
    return null;
  }

  return raw.replace(/\/$/, "");
}

export function buildPublicAssetUrl(key: string) {
  const base = getR2PublicBaseUrl();
  if (!base) {
    return null;
  }

  const normalizedKey = key.startsWith("/") ? key.slice(1) : key;
  return `${base}/${normalizedKey}`;
}

export function isR2Key(value: string) {
  return !/^https?:\/\//i.test(value) && !value.startsWith("data:");
}

export function keyBelongsToUser(key: string, userId: string) {
  return key.startsWith(`users/${userId}/`) || key.includes(`/users/${userId}/`);
}
