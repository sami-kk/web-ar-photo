// 仕様書 7.1 / 19.1: カメラ起動中・読み込み中のローディング表示。
export function ARLoadingView({ message }: { message?: string }) {
  return (
    <div className="ar-loading" role="status" aria-live="polite">
      <div className="ar-loading__spinner" aria-hidden="true" />
      <p className="ar-loading__text">{message ?? "読み込み中..."}</p>
    </div>
  );
}
