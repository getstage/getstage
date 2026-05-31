export function shouldRenderWorkspaceChrome(pathname: string) {
  return pathname !== "/projects/create" && pathname !== "/subscriptions";
}

export function shouldHideCompanion(pathname: string) {
  return pathname === "/auth" || pathname === "/projects/create" || pathname === "/subscriptions";
}
