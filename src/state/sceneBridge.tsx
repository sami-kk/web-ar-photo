// R3F Canvas 内部の three オブジェクトを、DOMオーバーレイ側のジェスチャ処理から
// 参照するためのブリッジ。ヒットテスト(raycast)や撮影合成でcanvas/cameraを使う。
import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type SceneBridge = {
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  gl: THREE.WebGLRenderer | null;
  /** 画面表示サイズ(CSSピクセル) */
  size: { width: number; height: number };
};

const defaultBridge: SceneBridge = {
  camera: null,
  scene: null,
  gl: null,
  size: { width: 0, height: 0 },
};

const SceneBridgeContext =
  createContext<MutableRefObject<SceneBridge> | null>(null);

export function SceneBridgeProvider({ children }: { children: ReactNode }) {
  const ref = useRef<SceneBridge>({ ...defaultBridge });
  return (
    <SceneBridgeContext.Provider value={ref}>
      {children}
    </SceneBridgeContext.Provider>
  );
}

export function useSceneBridge(): MutableRefObject<SceneBridge> {
  const ref = useContext(SceneBridgeContext);
  if (!ref) {
    throw new Error("useSceneBridge は SceneBridgeProvider の内側で使用してください。");
  }
  return ref;
}

/**
 * Canvas 内部に配置し、three の camera/scene/gl/size をブリッジへ書き込む。
 * 何も描画しない。
 */
export function SceneBridgeUpdater() {
  const bridge = useSceneBridge();
  const { camera, scene, gl, size } = useThree();
  bridge.current.camera = camera;
  bridge.current.scene = scene;
  bridge.current.gl = gl;
  bridge.current.size = { width: size.width, height: size.height };
  return null;
}
