export const IPC_CHANNELS = {
  authOpenLogin: "auth:open-login",
  authGetSession: "auth:get-session",
  companionShow: "companion:show",
  companionHide: "companion:hide",
  companionSetState: "companion:set-state",
  screenGetActiveApp: "screen:get-active-app",
  screenCaptureActiveWindow: "screen:capture-active-window",
  permissionsGetStatus: "permissions:get-status",
  permissionsOpenSystemSettings: "permissions:open-system-settings",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
