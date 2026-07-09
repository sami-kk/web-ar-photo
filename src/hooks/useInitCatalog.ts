// 仕様書 9.1 初回起動フロー / 7.5 初期表示
// JSON読み込み → バリデーション → デフォルトフレーム表示を一度だけ実行する。
// カタログはビルドに含めず実行時にfetchする。これにより作品(GLB/サムネイル/JSON)の
// 追加は静的ファイルの差し替えだけで反映され、再ビルドはアプリ本体の変更時のみでよい。
import { useEffect, useRef } from "react";
import { useARContext } from "../state/arContext";
import { resolveAssetPath } from "../utils/assetPath";
import { resolveDefaultFrame, validateCatalog } from "../utils/catalog";

/** 作品カタログの配置先。作品フォルダと同じ assets/ar-objects/ 配下で管理する。 */
const CATALOG_PATH = "/assets/ar-objects/catalog.json";

export function useInitCatalog() {
  const { dispatch } = useARContext();
  // StrictModeの二重実行でも初期化を1度に限定する。
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    dispatch({ type: "SET_LOADING_STATUS", status: "loading" });
    (async () => {
      try {
        // no-cache: 作品追加後の反映がブラウザキャッシュで遅れないよう毎回再検証する。
        const res = await fetch(resolveAssetPath(CATALOG_PATH), {
          cache: "no-cache",
        });
        if (!res.ok) {
          throw new Error(`catalog fetch failed: ${res.status}`);
        }
        const rawCatalog: unknown = await res.json();
        const catalog = validateCatalog(rawCatalog);
        dispatch({ type: "SET_CATALOG", catalog });

        const defaultFrame = resolveDefaultFrame(catalog);
        if (defaultFrame) {
          dispatch({ type: "ADD_OBJECT", meta: defaultFrame });
        } else {
          // 仕様書 7.5: デフォルトが無い場合はユーザーに案内する。
          console.error("[useInitCatalog] デフォルトフレームが見つかりません。");
          dispatch({ type: "SET_ERROR", message: "フレームを選択してください。" });
        }
        dispatch({ type: "SET_LOADING_STATUS", status: "ready" });
      } catch (e) {
        console.error("[useInitCatalog] カタログ読み込みに失敗しました。", e);
        dispatch({ type: "SET_LOADING_STATUS", status: "error" });
      }
    })();
  }, [dispatch]);
}
