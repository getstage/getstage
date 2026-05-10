type DatafastCheckoutMetadata = {
  datafastVisitorId?: string;
  datafastSessionId?: string;
};

type DatafastGoalMetadataValue = string | number | boolean | null | undefined;
type DatafastGoalMetadata = Record<string, DatafastGoalMetadataValue>;

declare global {
  interface Window {
    datafast?: ((goalName: string, metadata?: Record<string, string>) => void) & {
      q?: IArguments[];
    };
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return undefined;
  }

  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

export function getDatafastCheckoutMetadata(): DatafastCheckoutMetadata {
  const datafastVisitorId = readCookie("datafast_visitor_id");
  const datafastSessionId = readCookie("datafast_session_id");

  return {
    ...(datafastVisitorId ? { datafastVisitorId } : {}),
    ...(datafastSessionId ? { datafastSessionId } : {}),
  };
}

function normalizeDatafastKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function sanitizeDatafastMetadata(metadata?: DatafastGoalMetadata) {
  if (!metadata) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(metadata)
    .map(([key, value]) => {
      const normalizedKey = normalizeDatafastKey(key);
      if (!normalizedKey || value === undefined || value === null) {
        return null;
      }

      return [normalizedKey, String(value).slice(0, 255)] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry))
    .slice(0, 10);

  return sanitizedEntries.length > 0 ? Object.fromEntries(sanitizedEntries) : undefined;
}

export function trackDatafastGoal(goalName: string, metadata?: DatafastGoalMetadata) {
  if (typeof window === "undefined" || typeof window.datafast !== "function") {
    return false;
  }

  const normalizedGoalName = normalizeDatafastKey(goalName);
  if (!normalizedGoalName) {
    return false;
  }

  window.datafast(normalizedGoalName, sanitizeDatafastMetadata(metadata));
  return true;
}

export function trackDatafastGoalOnce(
  goalName: string,
  dedupeKey: string,
  metadata?: DatafastGoalMetadata,
) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storageKey = `datafast_goal:${dedupeKey}`;
    if (window.sessionStorage.getItem(storageKey) === "1") {
      return false;
    }

    const tracked = trackDatafastGoal(goalName, metadata);
    if (tracked) {
      window.sessionStorage.setItem(storageKey, "1");
    }

    return tracked;
  } catch {
    return trackDatafastGoal(goalName, metadata);
  }
}
