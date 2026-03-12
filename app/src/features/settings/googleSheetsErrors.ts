export const GOOGLE_SHEETS_GUIDE_HREF = "/help/import-transactions-via-google-sheets";
export const GOOGLE_SHEETS_TRANSACTIONS_DIALOG_TITLE = "Use the Transactions tab link";
export const GOOGLE_SHEETS_TRANSACTIONS_DIALOG_MESSAGE =
  "Please check the Google Sheets guide, open the Transactions tab in Google Sheets, and copy the full browser URL from the address bar. Do not use Share -> Copy link, because that link often leaves out the tab id that Stage needs.";

function extractErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  return "";
}

export function hasGoogleSheetGid(sheetUrl: string) {
  try {
    const url = new URL(sheetUrl);
    const gidFromSearch = url.searchParams.get("gid");
    const gidFromHash = new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");
    return Boolean(gidFromSearch || gidFromHash);
  } catch {
    return false;
  }
}

export function shouldShowTransactionsTabDialog(error: unknown) {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("http 400") ||
    message.includes("missing required column") ||
    message.includes("wrong tab") ||
    message.includes("transactions tab") ||
    message.includes("web page instead of sheet data")
  );
}
