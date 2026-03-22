/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_AI_MODE: string
  readonly VITE_ADMIN_EMAILS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}