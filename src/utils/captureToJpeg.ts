// 仕様書 7.9 / 14.5 / 26.1 / 26.2 撮影合成
// カメラ映像レイヤーと3Dオブジェクトレイヤーのみを合成し、UIは含めない。
// 「見たまま保存」を最優先し、画面表示サイズを基準に devicePixelRatio を考慮する。

/** 撮影用JPEG Quality（仕様書 7.9 / 26.16） */
export const JPEG_QUALITY = 0.92;

export type CaptureResult = {
  /** プレビュー表示用のObjectURL */
  url: string;
  /** 保存用Blob */
  blob: Blob;
};

/**
 * video要素(object-fit: cover表示)を、指定した出力キャンバス領域へ
 * cover相当でトリミング描画する。見たままの比率を再現する。
 */
function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  destW: number,
  destH: number,
): void {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw === 0 || vh === 0) {
    return;
  }
  const destRatio = destW / destH;
  const srcRatio = vw / vh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (srcRatio > destRatio) {
    // 映像が横に広い → 左右をトリミング
    sw = vh * destRatio;
    sx = (vw - sw) / 2;
  } else {
    // 映像が縦に長い → 上下をトリミング
    sh = vw / destRatio;
    sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);
}

/**
 * カメラ映像と3D描画結果を合成し、JPEG(Quality 0.92)を生成する。
 *
 * @param video カメラ映像のvideo要素
 * @param threeCanvas React Three Fiber の描画canvas（preserveDrawingBuffer必須）
 * @param displaySize 画面表示サイズ(CSSピクセル)。見たままのサイズ・比率で保存する
 */
export async function captureToJpeg(
  video: HTMLVideoElement,
  threeCanvas: HTMLCanvasElement,
  displaySize: { width: number; height: number },
): Promise<CaptureResult> {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // 過大な解像度を避ける
  const outW = Math.round(displaySize.width * dpr);
  const outH = Math.round(displaySize.height * dpr);

  const output = document.createElement("canvas");
  output.width = outW;
  output.height = outH;
  const ctx = output.getContext("2d");
  if (!ctx) {
    throw new Error("Canvasコンテキストを取得できませんでした。");
  }

  // 1. カメラ映像レイヤー（背景）
  drawVideoCover(ctx, video, outW, outH);
  // 2. 3Dオブジェクトレイヤー（前景）。表示サイズへフィットさせて重ねる。
  ctx.drawImage(threeCanvas, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) => {
    output.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
  });

  if (!blob) {
    throw new Error("画像の生成に失敗しました。");
  }

  return { url: URL.createObjectURL(blob), blob };
}

/** 保存ファイル名を端末ローカル時刻から生成する（仕様書 26.3）。 */
export function buildCaptureFileName(date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `ar-photo-frame-${y}${mo}${d}-${h}${mi}${s}.jpg`;
}
