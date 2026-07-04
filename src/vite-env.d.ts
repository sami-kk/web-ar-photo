/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 終了時の遷移先URL（仕様書 8.4）。未指定は "/"。 */
  readonly VITE_EXIT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
