// プレースホルダーの GLB とサムネイル PNG を生成する。
// 実物のGLB/サムネイルが用意されるまでの検証用（仕様書 23.1 / 26.13）。
// 実運用では public/assets/ar-objects/<id>/ に model.glb / thumbnail.* を配置して差し替える。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = resolve(__dirname, "../public/assets/ar-objects");

// ---------- GLB ----------

/** 頂点法線を面法線の平均から算出する（スムーズシェーディング用）。 */
function computeNormals(positions, indices) {
  const n = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const p of [a, b, c]) {
      n[p] += nx;
      n[p + 1] += ny;
      n[p + 2] += nz;
    }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return n;
}

function buildGLB({ positions, indices, color, emissive = 0.2 }) {
  const posArr = new Float32Array(positions);
  const idxArr = new Uint16Array(indices);
  const nrmArr = computeNormals(positions, indices);

  const idxBytes = idxArr.byteLength;
  const idxPadded = Math.ceil(idxBytes / 4) * 4;
  const posBytes = posArr.byteLength;
  const nrmBytes = nrmArr.byteLength;

  const bin = Buffer.alloc(idxPadded + posBytes + nrmBytes);
  Buffer.from(idxArr.buffer, idxArr.byteOffset, idxBytes).copy(bin, 0);
  Buffer.from(posArr.buffer, posArr.byteOffset, posBytes).copy(bin, idxPadded);
  Buffer.from(nrmArr.buffer, nrmArr.byteOffset, nrmBytes).copy(
    bin,
    idxPadded + posBytes,
  );

  // POSITION の min/max
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < posArr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], posArr[i + k]);
      max[k] = Math.max(max[k], posArr[i + k]);
    }
  }

  const gltf = {
    asset: { version: "2.0", generator: "ar-photo-frame placeholder" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 1, NORMAL: 2 },
            indices: 0,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [...color, 1],
          metallicFactor: 0,
          roughnessFactor: 0.55,
        },
        emissiveFactor: color.map((c) => c * emissive),
        doubleSided: true,
      },
    ],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBytes, target: 34963 },
      { buffer: 0, byteOffset: idxPadded, byteLength: posBytes, target: 34962 },
      {
        buffer: 0,
        byteOffset: idxPadded + posBytes,
        byteLength: nrmBytes,
        target: 34962,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5123,
        count: idxArr.length,
        type: "SCALAR",
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: posArr.length / 3,
        type: "VEC3",
        min,
        max,
      },
      {
        bufferView: 2,
        componentType: 5126,
        count: nrmArr.length / 3,
        type: "VEC3",
      },
    ],
  };

  let json = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonPad = (4 - (json.length % 4)) % 4;
  if (jsonPad) json = Buffer.concat([json, Buffer.alloc(jsonPad, 0x20)]);

  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = binPad ? Buffer.concat([bin, Buffer.alloc(binPad, 0)]) : bin;

  const total = 12 + 8 + json.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonHeader, json, binHeader, binChunk]);
}

/**
 * 2D輪郭（XY平面）を前後に膨らませたクッション状の立体にする。
 * 輪郭を中心へ向けて縮小しながらZへドーム状に持ち上げた同心リングを重ね、
 * 前後両面を作る。オルソ投影＋斜めライトでも陰影の勾配が出て立体的に見える。
 */
function puffedShape(outline, { dome = 0.3, rings = 5 } = {}) {
  const N = outline.length;
  const positions = [];
  const indices = [];
  const push = (x, y, z) => {
    positions.push(x, y, z);
    return positions.length / 3 - 1;
  };

  for (const sign of [1, -1]) {
    // rings本の同心リング（r=0が輪郭 → apexへ収束）を作る。
    const ringIdx = [];
    for (let r = 0; r < rings; r++) {
      const t = r / rings;
      const radiusScale = Math.cos((t * Math.PI) / 2); // 1 → 0
      const z = sign * Math.sin((t * Math.PI) / 2) * dome; // 0 → dome
      const row = [];
      for (const [x, y] of outline) {
        row.push(push(x * radiusScale, y * radiusScale, z));
      }
      ringIdx.push(row);
    }
    const apex = push(0, 0, sign * dome);
    for (let r = 0; r < rings - 1; r++) {
      for (let k = 0; k < N; k++) {
        const kn = (k + 1) % N;
        const a = ringIdx[r][k];
        const b = ringIdx[r][kn];
        const c = ringIdx[r + 1][kn];
        const d = ringIdx[r + 1][k];
        indices.push(a, b, c, a, c, d);
      }
    }
    const last = ringIdx[rings - 1];
    for (let k = 0; k < N; k++) {
      indices.push(last[k], last[(k + 1) % N], apex);
    }
  }
  return { positions, indices };
}

/** 5つ角の星の輪郭（XY平面）。 */
function starOutline(outer = 0.5, inner = 0.21, spikes = 5) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes; // 上向きの角から開始
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}

/** ハート形の輪郭（パラメトリック曲線を原点中心・最大半径0.5に正規化）。 */
function heartOutline(segments = 64) {
  const raw = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    raw.push([x, y]);
  }
  let cx = 0;
  let cy = 0;
  for (const [x, y] of raw) {
    cx += x;
    cy += y;
  }
  cx /= raw.length;
  cy /= raw.length;
  let maxR = 0;
  const centered = raw.map(([x, y]) => {
    const p = [x - cx, y - cy];
    maxR = Math.max(maxR, Math.hypot(p[0], p[1]));
    return p;
  });
  const scale = 0.5 / maxR;
  return centered.map(([x, y]) => [x * scale, y * scale]);
}

/** 星（膨らんだ立体）。 */
function starGeometry() {
  return puffedShape(starOutline(), { dome: 0.22, rings: 4 });
}

/** ハート（膨らんだ立体, ぷっくり）。 */
function heartGeometry() {
  return puffedShape(heartOutline(), { dome: 0.32, rings: 5 });
}

/** 額縁状の四角いリング（フレーム, 厚みあり）。 */
function frameGeometry(depth = 0.06) {
  const O = 0.5;
  const I = 0.4;
  const hz = depth / 2;
  const outer = [[-O, -O], [O, -O], [O, O], [-O, O]];
  const inner = [[-I, -I], [I, -I], [I, I], [-I, I]];
  const positions = [];
  const push = (x, y, z) => positions.push(x, y, z);
  for (const [x, y] of outer) push(x, y, hz); // 0-3 outer front
  for (const [x, y] of inner) push(x, y, hz); // 4-7 inner front
  for (const [x, y] of outer) push(x, y, -hz); // 8-11 outer back
  for (const [x, y] of inner) push(x, y, -hz); // 12-15 inner back
  const OF = 0;
  const IF = 4;
  const OB = 8;
  const IB = 12;
  const indices = [];
  for (let i = 0; i < 4; i++) {
    const n = (i + 1) % 4;
    indices.push(OF + i, OF + n, IF + n, OF + i, IF + n, IF + i); // 前面リング
    indices.push(OB + i, IB + n, OB + n, OB + i, IB + i, IB + n); // 背面リング
    indices.push(OF + i, OB + i, OB + n, OF + i, OB + n, OF + n); // 外周壁
    indices.push(IF + i, IF + n, IB + n, IF + i, IB + n, IB + i); // 内周壁
  }
  return { positions, indices };
}

// ---------- PNG (solid color) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function solidPng(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  // rows: filter byte(0) + size*3
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const off = y * (1 + size * 3);
    raw[off] = 0;
    for (let x = 0; x < size; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- 出力 ----------

const items = [
  {
    id: "frame_default_001",
    geo: frameGeometry(),
    color: [1.0, 0.48, 0.64],
    rgb: [255, 122, 162],
  },
  {
    id: "decoration_star_001",
    geo: starGeometry(),
    color: [1.0, 0.83, 0.3],
    rgb: [255, 211, 77],
  },
  {
    id: "decoration_heart_001",
    geo: heartGeometry(),
    color: [1.0, 0.3, 0.42],
    rgb: [255, 77, 109],
  },
];

for (const item of items) {
  const dir = resolve(OUT_ROOT, item.id);
  mkdirSync(dir, { recursive: true });
  const glb = buildGLB({
    positions: item.geo.positions,
    indices: item.geo.indices,
    color: item.color,
  });
  writeFileSync(resolve(dir, "model.glb"), glb);
  writeFileSync(resolve(dir, "thumbnail.png"), solidPng(256, item.rgb));
  console.log(`generated: ${item.id} (glb ${glb.length}B)`);
}

console.log("placeholders done.");
