// 仕様書 26.4: サブディレクトリ配信時に /assets/... のルート相対パスが
// 期待通り動かない可能性があるため、ビルド環境の base path に追従して解決する。

/**
 * JSON等に記載された "/assets/..." のようなパスを、Viteの BASE_URL を
 * 前置した実際に取得可能なURLへ変換する。
 */
export function resolveAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL; // 例: "/", "./", "/ar-photo-frame/"
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.replace(/^\//, "");
  return `${normalizedBase}${normalizedPath}`;
}
