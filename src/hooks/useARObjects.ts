// 仕様書 17.2 useARObjects
// JSON読み込み・デフォルトフレーム選択・追加/削除/選択などの操作をまとめて提供する。
import { useCallback } from "react";
import { useARContext } from "../state/arContext";
import type { ARObjectMeta } from "../types/arObject";

/**
 * 表示中オブジェクトへの操作をまとめて提供する（仕様書 17.2）。
 * JSON読み込み・デフォルト表示は useInitCatalog に分離している。
 */
export function useARObjects() {
  const { state, dispatch } = useARContext();

  const addObject = useCallback(
    (meta: ARObjectMeta) => dispatch({ type: "ADD_OBJECT", meta }),
    [dispatch],
  );
  const removeObject = useCallback(
    (instanceId: string) => dispatch({ type: "REMOVE_OBJECT", instanceId }),
    [dispatch],
  );
  const selectObject = useCallback(
    (instanceId: string | null) =>
      dispatch({ type: "SELECT_OBJECT", instanceId }),
    [dispatch],
  );
  const resetObject = useCallback(
    (instanceId: string) => dispatch({ type: "RESET_OBJECT", instanceId }),
    [dispatch],
  );

  /** 指定作品の現在の表示中インスタンス数（仕様書 26.6 モーダル表示用）。 */
  const countInstances = useCallback(
    (objectId: string) =>
      state.displayObjects.filter((o) => o.objectId === objectId).length,
    [state.displayObjects],
  );

  return {
    catalog: state.catalog,
    displayObjects: state.displayObjects,
    selectedInstanceId: state.selectedInstanceId,
    addObject,
    removeObject,
    selectObject,
    resetObject,
    countInstances,
  };
}
