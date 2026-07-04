// 仕様書 5.3 実行条件 / 18.2 非対応ブラウザ
// 必要なWeb APIが利用可能かを判定する。iOS Safari / Android Chrome を正式対応とする。

export type BrowserSupport = {
  supported: boolean;
  /** 不足している機能の一覧（デバッグ・ログ用） */
  missing: string[];
};

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * カメラ・WebGL・Canvas出力が利用可能かをまとめて判定する。
 * 個別の getUserMedia 権限（許可/拒否）はカメラ起動時に別途扱う。
 */
export function checkBrowserSupport(): BrowserSupport {
  const missing: string[] = [];

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    missing.push("getUserMedia");
  }

  if (!isWebGLAvailable()) {
    missing.push("WebGL");
  }

  const canOutputCanvas =
    typeof document !== "undefined" &&
    typeof document.createElement("canvas").toDataURL === "function";
  if (!canOutputCanvas) {
    missing.push("Canvas");
  }

  return { supported: missing.length === 0, missing };
}
