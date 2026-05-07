import { app } from "electron";

export const PRODUCTION_DESKTOP_API_URL = "https://getstage.co/api/v1";
export const TESTING_DESKTOP_API_URL = "https://testing.getstage.co/api/v1";

export function getDesktopApiBaseUrl() {
  if (process.env.STAGE_DESKTOP_API_URL) {
    return process.env.STAGE_DESKTOP_API_URL.replace(/\/+$/, "");
  }

  return app.isPackaged ? PRODUCTION_DESKTOP_API_URL : TESTING_DESKTOP_API_URL;
}

export async function fetchDesktopApiJson<T>(args: {
  accessToken: string;
  path: string;
}) {
  const response = await fetch(`${getDesktopApiBaseUrl()}${args.path}`, {
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Stage API request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}
