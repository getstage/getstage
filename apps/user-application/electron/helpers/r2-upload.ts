import { UPLOAD_RULES } from "@stage/data-ops/shared/upload-rules";

const MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(UPLOAD_RULES).map((rule: { maxBytes: number }) => rule.maxBytes),
);

function isAllowedR2UploadUrl(uploadUrl: string) {
  const parsed = new URL(uploadUrl);

  if (parsed.protocol !== "https:") {
    return false;
  }

  return parsed.hostname.endsWith(".r2.cloudflarestorage.com");
}

function toUploadBuffer(bytes: Uint8Array | Buffer | number[]) {
  if (Buffer.isBuffer(bytes)) {
    return bytes;
  }

  if (bytes instanceof Uint8Array) {
    return Buffer.from(bytes);
  }

  return Buffer.from(bytes);
}

export async function putSignedR2Upload(args: {
  uploadUrl: string;
  mimeType: string;
  bytes: Uint8Array | Buffer | number[];
}) {
  if (!isAllowedR2UploadUrl(args.uploadUrl)) {
    throw new Error("Upload destination is not an allowed R2 signed URL.");
  }

  const body = toUploadBuffer(args.bytes);
  if (body.byteLength === 0) {
    throw new Error("Upload payload is empty.");
  }

  if (body.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Upload payload exceeds the allowed size.");
  }

  const response = await fetch(args.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": args.mimeType,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed with status ${response.status}.`);
  }

  return {
    ok: true as const,
    status: response.status,
  };
}
