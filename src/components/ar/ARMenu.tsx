// 仕様書 8.2 メニュー／設定ボタン（案A: フレーム選択専用。将来拡張のため名称はARMenu）
// 画面上部の操作: フレーム選択。
// ×(閉じる)ボタンは既存HP埋め込み時の出口として設計されたが、単体公開では
// サイトルートへ遷移してしまい混乱を招くため撤去した。
import { useARContext } from "../../state/arContext";

export function ARMenu() {
  const { dispatch } = useARContext();
  return (
    <div className="ar-menu">
      <button
        type="button"
        className="ar-button ar-menu__select"
        onClick={() => dispatch({ type: "OPEN_SELECTION_MODAL" })}
      >
        フレーム一覧
      </button>
    </div>
  );
}
