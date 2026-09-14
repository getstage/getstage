import { useLayoutEffect } from "react";
import landingCss from "virtual:stage-landing-css";
import { resolveMacDownloadUrl } from "@/lib/macosDownload";
import "@/styles/stage-landing-isolate.css";

const LANDING_FONT_HREF = "/landing-preview/assets/fonts/InterVariable.woff2";

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
let stylesheet: HTMLStyleElement | null = null;
let fontPreload: HTMLLinkElement | null = null;
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
  if (!stylesheet) {
    stylesheet = document.createElement("style");
    stylesheet.setAttribute("data-stage-landing", "css");
    stylesheet.textContent = landingCss;
    document.head.appendChild(stylesheet);
  }
  if (!fontPreload) {
    fontPreload = document.createElement("link");
    fontPreload.rel = "preload";
    fontPreload.as = "font";
    fontPreload.type = "font/woff2";
    fontPreload.href = LANDING_FONT_HREF;
    fontPreload.crossOrigin = "anonymous";
    fontPreload.setAttribute("data-stage-landing", "font");
    document.head.appendChild(fontPreload);
  }
}

function releaseStylesheets() {
  stylesheetOwners = Math.max(0, stylesheetOwners - 1);
  if (stylesheetOwners > 0) return;
  stylesheet?.remove();
  stylesheet = null;
  fontPreload?.remove();
  fontPreload = null;
}

if (import.meta.hot) {
  import.meta.hot.accept("virtual:stage-landing-css", (mod) => {
    if (stylesheet && typeof mod?.default === "string") {
      stylesheet.textContent = mod.default;
    }
  });
}

function loadScript(src: string, reload = false) {
  const canonical = src.split("?")[0] ?? src;
  return new Promise<void>((resolve, reject) => {
    if (reload) {
      document
        .querySelectorAll(`script[data-stage-landing-src="${canonical}"]`)
        .forEach((el) => el.remove());
    } else if (document.querySelector(`script[data-stage-landing-src="${canonical}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = reload ? `${canonical}?boot=${Date.now()}` : src;
    script.async = false;
    script.setAttribute("data-stage-landing", "js");
    script.setAttribute("data-stage-landing-src", canonical);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${canonical}`));
    document.body.appendChild(script);
  });
}

async function bootScripts(experience: boolean, isCancelled: () => boolean) {
  await loadScript("/landing-preview/site.js", true);
  if (isCancelled()) return;
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
      legalUrl: "/terms",
      socialsUrl: null,
    };

    retainStylesheets();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void bootScripts(experience, () => cancelled);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      html.classList.remove("stage-landing-page", "js");
      extraBodyClasses.forEach((name) => body.classList.remove(name));
      document.title = previousTitle;
      restoreDescription?.();
      restoreTheme();
      releaseStylesheets();
    };
  }, [autoDownload, bodyClass, description, experience, title]);
}
