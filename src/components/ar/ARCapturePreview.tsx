// 仕様書 8.4 撮影プレビュー画面 / 18.5 保存失敗
import { useState } from "react";
import { useARContext } from "../../state/arContext";
import { buildCaptureFileName } from "../../utils/captureToJpeg";

export function ARCapturePreview({ onExit }: { onExit: () => void }) {
  const { state, dispatch } = useARContext();
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!state.capturedImageUrl) return null;
  const imageUrl = state.capturedImageUrl;

  const save = () => {
    setSaveError(null);
    try {
      // 端末保存: aタグのdownloadで保存する（仕様書 26.3 のファイル名）。
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = buildCaptureFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("[ARCapturePreview] 保存に失敗しました。", e);
      // 仕様書 18.5: 代替導線（別タブで開いて長押し保存）を案内する。
      setSaveError(
        "自動保存に失敗しました。画像を長押しして保存するか、下のボタンから別タブで開いてください。",
      );
    }
  };

  const retake = () => {
    // 再撮影: 配置・拡大縮小率は維持、選択解除・画像破棄（仕様書 13.3）。
    URL.revokeObjectURL(imageUrl);
    dispatch({ type: "RETAKE" });
  };

  return (
    <div className="ar-preview" role="dialog" aria-modal="true" aria-label="撮影プレビュー">
      <img className="ar-preview__image" src={imageUrl} alt="撮影した写真" />

      {saveError && (
        <div className="ar-preview__error" role="alert">
          <p>{saveError}</p>
          <a
            className="ar-button"
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
          >
            別タブで画像を開く
          </a>
        </div>
      )}

      <div className="ar-preview__actions">
        <button type="button" className="ar-button" onClick={retake}>
          再撮影
        </button>
        <button
          type="button"
          className="ar-button ar-button--primary"
          onClick={save}
        >
          保存
        </button>
        <button
          type="button"
          className="ar-button"
          onClick={() => {
            URL.revokeObjectURL(imageUrl);
            onExit();
          }}
        >
          終了
        </button>
      </div>
    </div>
  );
}
