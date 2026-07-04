// 仕様書 16.7 ARToolbar / 8.2 撮影ボタン / 26.4 前面背面 / 26.9 回転 / 26.11 ?ボタン
import { useARContext } from "../../state/arContext";
import { ROTATION_STEP_DEG } from "../../types/arState";

export function ARToolbar({ onCapture }: { onCapture: () => void }) {
  const { state, dispatch } = useARContext();

  const selected = state.displayObjects.find(
    (o) => o.instanceId === state.selectedInstanceId,
  );

  // 前面/背面のdisabled判定（仕様書 26.4）。
  const maxZ = state.displayObjects.reduce((m, o) => Math.max(m, o.zIndex), -1);
  const minZ = state.displayObjects.reduce(
    (m, o) => Math.min(m, o.zIndex),
    Number.POSITIVE_INFINITY,
  );
  const isFront = selected ? selected.zIndex === maxZ : true;
  const isBack = selected ? selected.zIndex === minZ : true;

  const rotate = (deltaDeg: number) => {
    if (!selected) return;
    const rad = selected.rotation + (deltaDeg * Math.PI) / 180;
    dispatch({ type: "SET_ROTATION", instanceId: selected.instanceId, rotation: rad });
  };

  return (
    <>
      {/* 選択中オブジェクトの編集メニュー（削除・前面/背面・回転） */}
      {selected && (
        <div className="ar-edit-bar" role="toolbar" aria-label="選択中オブジェクトの操作">
          <button
            type="button"
            className="ar-button ar-button--danger"
            onClick={() =>
              dispatch({ type: "REMOVE_OBJECT", instanceId: selected.instanceId })
            }
          >
            削除
          </button>
          <button
            type="button"
            className="ar-button"
            disabled={isBack}
            onClick={() =>
              dispatch({ type: "SEND_BACKWARD", instanceId: selected.instanceId })
            }
          >
            背面へ
          </button>
          <button
            type="button"
            className="ar-button"
            disabled={isFront}
            onClick={() =>
              dispatch({ type: "BRING_FORWARD", instanceId: selected.instanceId })
            }
          >
            前面へ
          </button>
          {/* 回転は装飾のみ（仕様書 26.9） */}
          {selected.rotatable && (
            <>
              <button
                type="button"
                className="ar-button"
                aria-label="左に回転"
                onClick={() => rotate(-ROTATION_STEP_DEG)}
              >
                ↺
              </button>
              <button
                type="button"
                className="ar-button"
                aria-label="右に回転"
                onClick={() => rotate(ROTATION_STEP_DEG)}
              >
                ↻
              </button>
            </>
          )}
        </div>
      )}

      {/* 撮影ボタン（画面下中央、二重押下防止） */}
      <button
        type="button"
        className="capture-button"
        aria-label="撮影する"
        disabled={state.isCapturing}
        onClick={onCapture}
      >
        <span className="capture-button__inner" aria-hidden="true" />
      </button>

      {/* ？ボタン（右下常駐、チュートリアル再表示 / 仕様書 26.11） */}
      <button
        type="button"
        className="ar-help-button"
        aria-label="操作方法を表示"
        onClick={() => dispatch({ type: "OPEN_TUTORIAL" })}
      >
        ？
      </button>
    </>
  );
}
