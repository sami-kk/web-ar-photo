// 仕様書 9.1 初回起動フロー / 7.5 初期表示
// JSON読み込み → バリデーション → デフォルトフレーム表示を一度だけ実行する。
import { useEffect, useRef } from "react";
import { useARContext } from "../state/arContext";
import rawCatalog from "../data/arObjects.json";
import { resolveDefaultFrame, validateCatalog } from "../utils/catalog";

export function useInitCatalog() {
  const { dispatch } = useARContext();
  // StrictModeの二重実行でも初期化を1度に限定する。
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    dispatch({ type: "SET_LOADING_STATUS", status: "loading" });
    try {
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
  }, [dispatch]);
}
