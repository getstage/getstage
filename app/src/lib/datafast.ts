type DatafastCheckoutMetadata = {
  datafastVisitorId?: string;
  datafastSessionId?: string;
};

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
