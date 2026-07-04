// 仕様書 12. 表示サイズ補正
// GLBごとのサイズ差をシステム側で吸収し、種別ごとの基準サイズへ自動補正する。
import * as THREE from "three";
import type { ARObjectType } from "../types/arObject";

/** フレームの初期表示: 画面の短辺に対する占有率（画面全体を囲う）。仕様書 12.3 */
const FRAME_SCREEN_RATIO = 1.0;
/** 装飾の初期表示: 画面幅の約25%。仕様書 12.4 */
const DECORATION_SCREEN_RATIO = 0.25;

/**
 * GLBのBounding Boxから、種別ごとの基準サイズへスケーリングする係数を求める。
 * オルソグラフィックカメラ(1ワールド単位=1px)前提で、目標ピクセル数に合わせる。
 *
 * @param object 読み込んだGLBのルートオブジェクト
 * @param type frame / decoration
 * @param viewport { width, height } 画面表示サイズ(CSSピクセル)
 * @param initialScale JSONで指定された初期倍率(仕様書12.5)。指定時はこれを基準倍率とする
 * @returns グループに掛けるべき基準スケール(baseScale)
 */
export function normalizeModelScale(
  object: THREE.Object3D,
  type: ARObjectType,
  viewport: { width: number; height: number },
  initialScale?: number | null,
): number {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (type === "frame") {
    // フレームは画面全体を囲う。モデルの幅・高さを画面幅・高さに合わせ、
    // はみ出さないよう小さい方の倍率を採用する。
    const targetW = viewport.width * FRAME_SCREEN_RATIO;
    const targetH = viewport.height * FRAME_SCREEN_RATIO;
    const scaleW = size.x > 1e-6 ? targetW / size.x : 1;
    const scaleH = size.y > 1e-6 ? targetH / size.y : 1;
    const base = Math.min(scaleW, scaleH);
    return applyInitial(base, initialScale);
  }

  // 装飾は最大寸法(幅/高さ)を画面幅の約25%に合わせる。
  const target = viewport.width * DECORATION_SCREEN_RATIO;
  const maxDim = Math.max(size.x, size.y, 1e-6);
  const base = target / maxDim;
  return applyInitial(base, initialScale);
}

function applyInitial(autoScale: number, initialScale?: number | null): number {
  // initialScale が指定されていれば優先(仕様書12.5)。自動補正結果に乗算する。
  if (typeof initialScale === "number" && Number.isFinite(initialScale)) {
    return autoScale * initialScale;
  }
  return autoScale;
}
