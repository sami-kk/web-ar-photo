// 仕様書 26.11 操作チュートリアル
// 初回のみ自動表示。？ボタンからいつでも再表示できる。
import { resolveAssetPath } from "../../utils/assetPath";

const STEPS = [
  "フレームや装飾をタップすると選択できます",
  "選択したオブジェクトはドラッグで移動できます",
  "ピンチイン／ピンチアウトでサイズ変更できます",
  "装飾は回転できます",
  "選択中のオブジェクトは削除できます",
  "前面／背面を切り替えられます",
  "見失ったオブジェクトは一覧から削除または中央に戻せます",
  "撮影ボタンで写真を撮れます",
  "フレーム選択から作品を追加できます",
];

export function ARTutorial({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="ar-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="操作チュートリアル"
    >
      <div className="ar-tutorial__card">
        <h2 className="ar-tutorial__title">操作方法</h2>
        <img
          className="ar-tutorial__image"
          src={resolveAssetPath("/assets/tutorial.png")}
          alt="ARフォトフレームの操作説明"
        />
        <ul className="ar-tutorial__list">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <button
          type="button"
          className="ar-button ar-button--primary"
          onClick={onClose}
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
