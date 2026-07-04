// 仕様書 8.1 AR004 エラー画面 / 18.1 / 18.2
// カメラ権限拒否・非対応ブラウザなどの案内を全画面で表示する。
export type ARErrorKind = "camera-denied" | "unsupported" | "generic";

const MESSAGES: Record<ARErrorKind, { title: string; body: string }> = {
  "camera-denied": {
    title: "カメラを使用できません",
    body: "ARフォトフレームを利用するには、ブラウザのカメラ権限を許可してください。",
  },
  unsupported: {
    title: "ご利用の環境では利用できない可能性があります",
    body: "このブラウザではARフォトフレームを利用できない可能性があります。iPhoneの方はSafari、Androidの方はChromeで開いてください。",
  },
  generic: {
    title: "エラーが発生しました",
    body: "時間をおいて再度お試しください。",
  },
};

export function ARErrorView({
  kind,
  onRetry,
}: {
  kind: ARErrorKind;
  onRetry?: () => void;
}) {
  const { title, body } = MESSAGES[kind];
  return (
    <div className="ar-error" role="alert">
      <div className="ar-error__card">
        <h1 className="ar-error__title">{title}</h1>
        <p className="ar-error__body">{body}</p>
        {onRetry && (
          <button type="button" className="ar-button" onClick={onRetry}>
            再試行
          </button>
        )}
      </div>
    </div>
  );
}
