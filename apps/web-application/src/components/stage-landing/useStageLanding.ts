import { useLayoutEffect } from "react";
import { resolveMacDownloadUrl } from "@/lib/macosDownload";
import "@/styles/stage-landing-isolate.css";

const LANDING_STYLESHEETS = [
  "/landing-preview/styles.css",
  "/landing-preview/sections.css",
  "/landing-preview/navigation.css",
  "/landing-preview/experience.css",
  "/landing-preview/mobile.css",
];

type StageConfig = {
  installerUrl: string | null;
  installerFilename: string;
  loginUrl: string | null;
  contactUrl: string | null;
  legalUrl: string | null;
  socialsUrl: string | null;
};

declare global {
  interface Window {
    STAGE_CONFIG?: StageConfig;
  }
}

export type StageLandingBoot = {
  title?: string;
  description?: string;
  bodyClass?: string;
  experience?: boolean;
  autoDownload?: boolean;
};

let stylesheetOwners = 0;
let stylesheets: HTMLLinkElement[] = [];
let siteScriptLoaded = false;
let experienceScriptLoaded = false;

function upsertMeta(name: string, content: string) {
  const selector = `meta[name="${name}"]`;
  const existing = document.head.querySelector(selector);
  const previous = existing?.getAttribute("content") ?? null;
  if (existing) {
    existing.setAttribute("content", content);
  } else {
    const meta = document.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    meta.setAttribute("data-stage-landing", "meta");
    document.head.appendChild(meta);
  }
  return () => {
    if (existing) {
      if (previous === null) existing.remove();
      else existing.setAttribute("content", previous);
      return;
    }
    document.head.querySelector(`${selector}[data-stage-landing="meta"]`)?.remove();
  };
}

function retainStylesheets() {
  stylesheetOwners += 1;
  if (stylesheets.length === 0) {
    stylesheets = LANDING_STYLESHEETS.map((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-stage-landing", "css");
      document.head.appendChild(link);
      return link;
    });
  }
}

function releaseStylesheets() {
  stylesheetOwners = Math.max(0, stylesheetOwners - 1);
  if (stylesheetOwners > 0) return;
  stylesheets.forEach((link) => link.remove());
  stylesheets = [];
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-stage-landing-src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute("data-stage-landing", "js");
    script.setAttribute("data-stage-landing-src", src);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function bootScripts(experience: boolean) {
  if (!siteScriptLoaded) {
    siteScriptLoaded = true;
    await loadScript("/landing-preview/site.js");
  }
  if (experience && !experienceScriptLoaded) {
    experienceScriptLoaded = true;
    await loadScript("/landing-preview/assets/vendor/lenis.min.js");
    await loadScript("/landing-preview/experience.js");
  }
}

export function useStageLanding({
  title,
  description,
  bodyClass = "",
  experience = false,
  autoDownload = false,
}: StageLandingBoot) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const extraBodyClasses = bodyClass.split(/\s+/).filter(Boolean);
    const previousTitle = document.title;

    html.classList.add("stage-landing-page", "js");
    extraBodyClasses.forEach((name) => body.classList.add(name));
    if (title) document.title = title;
    const restoreDescription = description
      ? upsertMeta("description", description)
      : undefined;
    const restoreTheme = upsertMeta("theme-color", "#f5f5f5");

    window.STAGE_CONFIG = {
      installerUrl: autoDownload ? resolveMacDownloadUrl() : null,
      installerFilename: "Stage.dmg",
      loginUrl: "/auth",
      contactUrl: null,
      legalUrl: null,
      socialsUrl: null,
    };

    retainStylesheets();
    void bootScripts(experience);

    return () => {
      html.classList.remove("stage-landing-page", "js");
      extraBodyClasses.forEach((name) => body.classList.remove(name));
      document.title = previousTitle;
      restoreDescription?.();
      restoreTheme();
      releaseStylesheets();
    };
  }, [autoDownload, bodyClass, description, experience, title]);
}
