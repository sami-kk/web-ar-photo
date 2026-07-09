// 仕様書 7.5 初期表示 / 10.5 バリデーションルール
import type { ARObjectMeta } from "../types/arObject";

/** enabled が false でないものだけを一覧対象とする（未指定はtrue扱い / 仕様書 10.5）。 */
export function getEnabledObjects(catalog: ARObjectMeta[]): ARObjectMeta[] {
  return catalog.filter((o) => o.enabled !== false);
}

/**
 * デフォルト表示するフレームを決定する（仕様書 7.5）。
 * 1. isDefault: true の最初の1件（複数指定でも最初のみ採用）
 * 2. なければ enabled な最初の frame
 * 3. それも無ければ null（呼び出し側でユーザー案内）
 */
export function resolveDefaultFrame(
  catalog: ARObjectMeta[],
): ARObjectMeta | null {
  const enabled = getEnabledObjects(catalog);
  const explicit = enabled.find((o) => o.type === "frame" && o.isDefault === true);
  if (explicit) {
    return explicit;
  }
  const firstFrame = enabled.find((o) => o.type === "frame");
  return firstFrame ?? null;
}

/**
 * 最低限のバリデーション（仕様書 10.5）。
 * 不正なエントリは除外し、警告ログのみ出す（アプリ全体は落とさない / 仕様書 20）。
 */
export function validateCatalog(raw: unknown): ARObjectMeta[] {
  if (!Array.isArray(raw)) {
    console.error("[catalog] catalog.json は配列である必要があります。");
    return [];
  }
  const seen = new Set<string>();
  const result: ARObjectMeta[] = [];
  for (const entry of raw) {
    const item = entry as Partial<ARObjectMeta>;
    if (!item || typeof item !== "object") continue;
    if (!item.id || typeof item.id !== "string") {
      console.warn("[catalog] id が不正なエントリをスキップしました。", entry);
      continue;
    }
    if (item.type !== "frame" && item.type !== "decoration") {
      console.warn(`[catalog] type が不正です: ${item.id}`);
      continue;
    }
    if (seen.has(item.id)) {
      console.warn(`[catalog] id が重複しています: ${item.id}`);
      continue;
    }
    for (const key of [
      "name",
      "authorName",
      "description",
      "glbPath",
      "thumbnailPath",
    ] as const) {
      if (typeof item[key] !== "string" || item[key] === "") {
        console.warn(`[catalog] ${key} が不正です: ${item.id}`);
      }
    }
    seen.add(item.id);
    result.push(item as ARObjectMeta);
  }
  return result;
}
