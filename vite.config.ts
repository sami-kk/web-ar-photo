import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 仕様書 26.3: サブディレクトリ配信時は base path を調整する。
// GitHub Pages / 既存HP配下への移設を見据え、環境変数で切り替え可能にする。
// 例: AR_BASE_PATH=/ar-photo-frame/ npm run build
const base = process.env.AR_BASE_PATH ?? "./";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
  },
});
