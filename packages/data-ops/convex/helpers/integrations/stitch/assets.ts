function getExtensionFromContentType(contentType: string | null) {
  switch ((contentType ?? "").toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

export function buildGeneratedDesignKey(args: {
  userId: string;
  projectId: string;
  screenId: string;
  contentType: string | null;
}) {
  const extension = getExtensionFromContentType(args.contentType);
  return `generated-designs/projects/${args.projectId}/users/${args.userId}/images/${args.screenId}.${extension}`;
}
