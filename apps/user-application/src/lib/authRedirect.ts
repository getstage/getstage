export function getSafeAuthRedirect(redirect: string | null | undefined): string | undefined {
  if (!redirect) {
    return undefined;
  }

  if (!redirect.startsWith("/") || redirect.startsWith("//") || redirect.startsWith("/auth")) {
    return undefined;
  }

  return redirect;
}

export function buildAuthRedirect(pathname: string, searchStr = "", hash = ""): string | undefined {
  return getSafeAuthRedirect(`${pathname}${searchStr}${hash}`);
}
