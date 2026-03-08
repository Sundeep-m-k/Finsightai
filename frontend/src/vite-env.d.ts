/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_SERVICE_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
