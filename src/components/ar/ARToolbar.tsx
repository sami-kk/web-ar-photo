// 仕様書 16.7 ARToolbar / 8.2 撮影ボタン / 26.4 前面背面 / 26.9 回転 / 26.11 ?ボタン
// 編集バーはチュートリアル画像に合わせ「アイコン＋ラベル」型のボタンで構成する。
import { useARContext } from "../../state/arContext";
import { ROTATION_STEP_DEG } from "../../types/arState";

/** ゴミ箱アイコン（削除） */
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-.9 11.1a2 2 0 0 1-2 1.9H8.9a2 2 0 0 1-2-1.9L6 9zm4 2v8h1.5v-8H10zm3 0v8h1.5v-8H13z"
      />
    </svg>
  );
}

/** 上矢印アイコン（前面へ） */
function ToFrontIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 3h14v2H5V3zm7 4 6 6h-4v8h-4v-8H6l6-6z"
      />
    </svg>
  );
}

/** 下矢印アイコン（背面へ） */
function ToBackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 19h14v2H5v-2zm7-2-6-6h4V3h4v8h4l-6 6z"
      />
    </svg>
  );
}

/** カメラアイコン（撮影ボタン） */
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 4h6l1.5 2.5H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3.5L9 4zm3 4.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
      />
    </svg>
  );
}

/** アイコン＋ラベルの編集ボタン */
function EditButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={"ar-edit-button" + (danger ? " ar-edit-button--danger" : "")}
      aria-label={ariaLabel ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ar-edit-button__icon">{icon}</span>
      <span className="ar-edit-button__label">{label}</span>
    </button>
  );
}

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

  const rotateY = (deltaDeg: number) => {
    if (!selected) return;
    const rad = selected.rotationY + (deltaDeg * Math.PI) / 180;
    dispatch({
      type: "SET_ROTATION_Y",
      instanceId: selected.instanceId,
      rotationY: rad,
    });
  };

  return (
    <>
      {/* 選択中オブジェクトの編集メニュー（削除・前面/背面・回転） */}
      {selected && (
        <div className="ar-edit-bar" role="toolbar" aria-label="選択中オブジェクトの操作">
          <EditButton
            icon={<TrashIcon />}
            label="削除"
            danger
            onClick={() =>
              dispatch({ type: "REMOVE_OBJECT", instanceId: selected.instanceId })
            }
          />
          <EditButton
            icon={<ToFrontIcon />}
            label="前面"
            ariaLabel="前面へ"
            disabled={isFront}
            onClick={() =>
              dispatch({ type: "BRING_FORWARD", instanceId: selected.instanceId })
            }
          />
          <EditButton
            icon={<ToBackIcon />}
            label="背面"
            ariaLabel="背面へ"
            disabled={isBack}
            onClick={() =>
              dispatch({ type: "SEND_BACKWARD", instanceId: selected.instanceId })
            }
          />
          {/* 回転は装飾のみ（仕様書 26.9） */}
          {selected.rotatable && (
            <>
              <EditButton
                icon={<span aria-hidden="true">↺</span>}
                label="回転"
                ariaLabel="左に回転"
                onClick={() => rotate(-ROTATION_STEP_DEG)}
              />
              <EditButton
                icon={<span aria-hidden="true">↻</span>}
                label="回転"
                ariaLabel="右に回転"
                onClick={() => rotate(ROTATION_STEP_DEG)}
              />
              {/* Y軸（画面縦軸）回転。立体モデルの奥行きを見せる */}
              <EditButton
                icon={<span aria-hidden="true">Y↺</span>}
                label="ヨー"
                ariaLabel="左へヨー回転"
                onClick={() => rotateY(-ROTATION_STEP_DEG)}
              />
              <EditButton
                icon={<span aria-hidden="true">Y↻</span>}
                label="ヨー"
                ariaLabel="右へヨー回転"
                onClick={() => rotateY(ROTATION_STEP_DEG)}
              />
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
        <span className="capture-button__inner" aria-hidden="true">
          <CameraIcon />
        </span>
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
