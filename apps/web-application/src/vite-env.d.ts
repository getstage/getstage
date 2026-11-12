/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRANDFETCH_CLIENT_ID?: string;
}

declare module "virtual:stage-landing-css" {
  const css: string;
  export default css;
}
