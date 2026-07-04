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

function buildGLB({ positions, indices, color, emissive = 0.2 }) {
  const posArr = new Float32Array(positions);
  const idxArr = new Uint16Array(indices);

  const idxBytes = idxArr.byteLength;
  const idxPadded = Math.ceil(idxBytes / 4) * 4;
  const posBytes = posArr.byteLength;

  const bin = Buffer.alloc(idxPadded + posBytes);
  Buffer.from(idxArr.buffer, idxArr.byteOffset, idxBytes).copy(bin, 0);
  Buffer.from(posArr.buffer, posArr.byteOffset, posBytes).copy(bin, idxPadded);

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
      { primitives: [{ attributes: { POSITION: 1 }, indices: 0, material: 0 }] },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [...color, 1],
          metallicFactor: 0,
          roughnessFactor: 0.85,
        },
        emissiveFactor: color.map((c) => c * emissive),
        doubleSided: true,
      },
    ],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBytes, target: 34963 },
      { buffer: 0, byteOffset: idxPadded, byteLength: posBytes, target: 34962 },
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

/** 額縁状のリング（フレーム用プレースホルダー、XY平面）。 */
function frameGeometry() {
  const O = 0.5;
  const I = 0.42;
  const positions = [
    -O, -O, 0, O, -O, 0, O, O, 0, -O, O, 0, // outer 0-3
    -I, -I, 0, I, -I, 0, I, I, 0, -I, I, 0, // inner 4-7
  ];
  const indices = [];
  for (let i = 0; i < 4; i++) {
    const n = (i + 1) % 4;
    const oI = i;
    const oN = n;
    const iI = 4 + i;
    const iN = 4 + n;
    indices.push(oI, oN, iN, oI, iN, iI);
  }
  return { positions, indices };
}

/** 単位立方体（装飾用プレースホルダー）。 */
function cubeGeometry() {
  const s = 0.5;
  const positions = [
    -s, -s, -s, s, -s, -s, s, s, -s, -s, s, -s, // 0-3 back
    -s, -s, s, s, -s, s, s, s, s, -s, s, s, // 4-7 front
  ];
  const indices = [
    4, 5, 6, 4, 6, 7, // front
    1, 0, 3, 1, 3, 2, // back
    0, 4, 7, 0, 7, 3, // left
    5, 1, 2, 5, 2, 6, // right
    3, 7, 6, 3, 6, 2, // top
    0, 1, 5, 0, 5, 4, // bottom
  ];
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
    geo: cubeGeometry(),
    color: [1.0, 0.83, 0.3],
    rgb: [255, 211, 77],
  },
  {
    id: "decoration_heart_001",
    geo: cubeGeometry(),
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
