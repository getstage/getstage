import type { Context } from "hono";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "api_error",
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function inferStatus(message: string) {
  if (message.includes("Too many API requests") || message.includes("rate limit")) {
    return 429;
  }
  if (message === "Not authenticated" || message.includes("API key")) {
    return 401;
  }
  if (message.includes("Not authorized")) {
    return 403;
  }
  if (message.endsWith("not found.") || message === "Route not found.") {
    return 404;
  }
  if (
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("invalid") ||
    message.includes("Could not")
  ) {
    return 400;
  }
  return 500;
}

function inferCode(status: number) {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 429:
      return "rate_limited";
    default:
      return "internal_error";
  }
}

export function jsonError(
  c: Context,
  status: number,
  message: string,
  code = inferCode(status),
  details?: unknown,
) {
  return c.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status: status as 400 },
  );
}

// Errors thrown inside Convex functions arrive as "[Request ID: …] Server Error\nUncaught Error: <message>\n    at <file>:<line>".
// API callers (and AI tools) get the message only, never internal file paths.
export function publicMessage(raw: string) {
  return /Uncaught (?:\w*Error): ([^\n]+)/.exec(raw)?.[1] ?? raw;
}

export function handleApiError(error: unknown, c: Context) {
  if (error instanceof ApiError) {
    return jsonError(c, error.status, error.message, error.code, error.details);
  }

  const message = error instanceof Error ? publicMessage(error.message) : "Internal server error.";
  const status = inferStatus(message);

  if (status >= 500) {
    console.error("[stage-api]", error);
  }

  return jsonError(c, status, message);
}

export const validationHook = (result: { success: boolean; error?: { issues: unknown } }, c: Context) => {
  if (result.success) {
    return;
  }

  // Name the first problem in the message so the caller can fix it without reading the details.
  const [first] = (result.error?.issues ?? []) as { path?: PropertyKey[]; message?: string }[];
  const message = first?.message ? `${first.path?.length ? `${first.path.join(".")}: ` : ""}${first.message}` : "Invalid request.";
  return jsonError(c, 400, message, "validation_error", result.error?.issues);
};
