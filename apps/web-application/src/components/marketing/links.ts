// Content links are either internal paths or https URLs; external ones open in a new tab.
export function linkProps(href: string) {
  return href.startsWith("https://")
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };
}
