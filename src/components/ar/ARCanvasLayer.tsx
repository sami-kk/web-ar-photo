// 仕様書 16.3 ARCanvasLayer / 14.4 3D描画
// カメラ映像と同じ領域に重ねる、透過背景のReact Three Fiber Canvas。
import { Canvas } from "@react-three/fiber";
import { SceneBridgeUpdater } from "../../state/sceneBridge";
import { ARObjectRenderer } from "./ARObjectRenderer";

export function ARCanvasLayer() {
  return (
    <Canvas
      className="ar-canvas"
      // オルソグラフィック: 1ワールド単位=1CSSpx、原点は画面中央。2D的な配置に扱いやすい。
      orthographic
      camera={{ position: [0, 0, 10000], near: 1, far: 20000, zoom: 1 }}
      // 撮影合成でcanvasを読み出すため preserveDrawingBuffer は必須。
      gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
      // 背景は透過（カメラ映像を透過させる）。
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      dpr={[1, 2]}
    >
      {/* three内部参照をDOM側へ橋渡し（raycast/撮影用） */}
      <SceneBridgeUpdater />
      {/* 法線が無いプレースホルダーGLBでも見えるよう環境光を強めに設定 */}
      <ambientLight intensity={1.3} />
      <directionalLight position={[0, 0, 10000]} intensity={0.8} />
      <ARObjectRenderer />
    </Canvas>
  );
}
