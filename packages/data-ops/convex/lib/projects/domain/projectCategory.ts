import type { Doc } from "../../../_generated/dataModel";

export type ProjectCategory = "websites" | "web-apps" | "ios-apps";

export function resolveProjectCategory(type: Doc<"projects">["type"]): ProjectCategory {
  switch (type) {
    case "websites":
    case "web-apps":
    case "ios-apps":
      return type;
    case "web-design":
      return "websites";
    case "web-app":
      return "web-apps";
    case "app-design":
      return "ios-apps";
    default:
      throw new Error(`Project type "${type}" is not a supported project category.`);
  }
}
