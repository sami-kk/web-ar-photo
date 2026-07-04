// 仕様書 11.1 ARObjectMeta / 10.4 フィールド定義
// JSONで管理する作品メタデータの型。将来のAPI/DB化を見据えたレスポンス互換の構造。

export type ARObjectType = "frame" | "decoration";

export type ARObjectMeta = {
  /** オブジェクトID。ユニークであること */
  id: string;
  /** フレームまたは装飾 */
  type: ARObjectType;
  /** 作品名 */
  name: string;
  /** 制作者のハンドルネーム */
  authorName: string;
  /** 作品説明文 */
  description: string;
  /** GLBファイルのパス */
  glbPath: string;
  /** サムネイル画像のパス */
  thumbnailPath: string;
  /** 初回表示対象か */
  isDefault?: boolean;
  /** 将来拡張用の初期倍率。指定時は自動補正より優先する（仕様書 12.5） */
  initialScale?: number | null;
  /** 回転可能か。装飾はtrue、フレームはfalseを基本とする（仕様書 26.9） */
  rotatable?: boolean;
  /** 一覧に表示するか。未指定はtrue扱い（仕様書 10.5） */
  enabled?: boolean;
};
