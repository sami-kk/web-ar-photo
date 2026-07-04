// 仕様書 26.6: instanceId は "作品ID__連番" の形式で個別インスタンスを一意に識別する。
//   objectId:   "frame_sakura_001"
//   instanceId: "frame_sakura_001__001"

/**
 * 指定した objectId に対する新しい instanceId を生成する。
 * @param objectId JSON上の作品ID
 * @param existingIds 現在表示中の全 instanceId（同一作品の連番衝突を避けるため）
 */
export function createInstanceId(
  objectId: string,
  existingIds: string[],
): string {
  const prefix = `${objectId}__`;
  let maxSeq = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const seq = Number.parseInt(id.slice(prefix.length), 10);
      if (Number.isFinite(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  const next = String(maxSeq + 1).padStart(3, "0");
  return `${prefix}${next}`;
}
