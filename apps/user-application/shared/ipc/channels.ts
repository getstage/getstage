export const IPC_CHANNELS = {
  authOpenLogin: "auth:open-login",
  authGetSession: "auth:get-session",
  projectContextGetSelected: "project-context:get-selected",
  engineGetStatus: "engine:get-status",
  companionShow: "companion:show",
  companionHide: "companion:hide",
  companionSetState: "companion:set-state",
  windowToggleMaximize: "window:toggle-maximize",
  screenGetActiveApp: "screen:get-active-app",
  screenCaptureActiveWindow: "screen:capture-active-window",
  permissionsGetStatus: "permissions:get-status",
  permissionsOpenSystemSettings: "permissions:open-system-settings",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
