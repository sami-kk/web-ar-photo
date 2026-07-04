// 仕様書 8.2 メニュー／設定ボタン（案A: フレーム選択専用。将来拡張のため名称はARMenu）
// 画面上部の操作: 閉じる / フレーム選択。
import { useARContext } from "../../state/arContext";

export function ARMenu({ onExit }: { onExit: () => void }) {
  const { dispatch } = useARContext();
  return (
    <div className="ar-menu">
      <button
        type="button"
        className="ar-icon-button ar-menu__close"
        aria-label="閉じる"
        onClick={onExit}
      >
        ×
      </button>
      <button
        type="button"
        className="ar-button ar-menu__select"
        onClick={() => dispatch({ type: "OPEN_SELECTION_MODAL" })}
      >
        フレーム選択
      </button>
    </div>
  );
}
