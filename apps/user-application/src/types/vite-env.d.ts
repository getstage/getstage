/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRANDFETCH_CLIENT_ID?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
