// 仕様書 26.11 操作チュートリアル
// 初回のみ自動表示。？ボタンからいつでも再表示できる。
import { resolveAssetPath } from "../../utils/assetPath";

const STEPS = [
  "「フレーム一覧」から作品を追加できます",
  "フレームや装飾をタップすると選択できます",
  "選択したオブジェクトはドラッグで移動できます",
  "ピンチイン／ピンチアウトでサイズ変更できます",
  "装飾は回転（↺↻）とヨー回転（Y↺Y↻）で立体的に回せます",
  "選択中のオブジェクトは削除できます",
  "前面／背面を切り替えられます",
  "見失ったオブジェクトは「フレーム一覧」から削除または中央に戻せます",
  "撮影ボタンで写真を撮れます",
];

export function ARTutorial({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="ar-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="操作チュートリアル"
      // 背景（カード外）タップでも閉じられるようにする。カード内のタップは
      // target が card 側になるため反応しない。
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
