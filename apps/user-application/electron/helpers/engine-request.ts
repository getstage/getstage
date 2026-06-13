import type { DesktopAuthController } from "../auth";
import {
  clearSessionAndNotify,
  DesktopSessionExpiredError,
} from "../desktop-api/auth-failure";
import { fetchEngineJson } from "./sidecar";

export async function fetchEngineJsonAuthed<T>(args: {
  authController: DesktopAuthController;
  method?: "GET" | "POST";
  path: string;
  port: number;
  body?: unknown;
  timeoutMs?: number;
}): Promise<{ data: T; accessToken: string }> {
  const accessToken = await args.authController.getAccessToken();
  if (!accessToken) {
    await clearSessionAndNotify(args.authController);
    throw new DesktopSessionExpiredError();
  }

  try {
    const data = await fetchEngineJson<T>({
      method: args.method,
      path: args.path,
      port: args.port,
      body: args.body,
      accessToken,
      timeoutMs: args.timeoutMs,
    });
    return { data, accessToken };
  } catch (error) {
    if (
      error instanceof Error &&
      /Stage Engine request failed with (401|403)/.test(error.message)
    ) {
      await clearSessionAndNotify(args.authController);
      throw new DesktopSessionExpiredError();
    }
    throw error;
  }
}
