// 仕様書 18.2 非対応ブラウザ判定
import { useEffect, useState } from "react";
import { checkBrowserSupport, type BrowserSupport } from "../utils/browserSupport";

export function useBrowserSupport(): BrowserSupport | null {
  // null = 判定前
  const [support, setSupport] = useState<BrowserSupport | null>(null);
  useEffect(() => {
    setSupport(checkBrowserSupport());
  }, []);
  return support;
}
