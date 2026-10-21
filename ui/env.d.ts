/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_VERSION: string;
}

// biome-ignore lint/correctness/noUnusedVariables: <explanation>
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
