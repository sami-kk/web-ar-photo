// 仕様書 16.4 ARObjectRenderer
// 表示中オブジェクトを描画する。GLB読み込み・サイズ補正・位置/scale/回転/選択枠を反映。
import { Suspense, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useARContext } from "../../state/arContext";
import type { DisplayObject } from "../../types/arState";
import { resolveAssetPath } from "../../utils/assetPath";
import { normalizeModelScale } from "../../utils/normalizeModelScale";
import { GLBErrorBoundary } from "./GLBErrorBoundary";

/** zIndex 1段あたりのZ距離。オルソ投影のため表示サイズは変わらず、重なり順のみ制御。 */
const Z_STEP = 1000;

export function ARObjectRenderer() {
  const { state } = useARContext();
  return (
    <>
      {state.displayObjects.map((obj) => (
        <GLBErrorBoundary
          key={obj.instanceId}
          fallback={<PlaceholderObject obj={obj} />}
        >
          <Suspense fallback={null}>
            <ARObjectMesh obj={obj} />
          </Suspense>
        </GLBErrorBoundary>
      ))}
    </>
  );
}

function useInitialScale(objectId: string): number | null | undefined {
  const { state } = useARContext();
  return state.catalog.find((c) => c.id === objectId)?.initialScale;
}

function ARObjectMesh({ obj }: { obj: DisplayObject }) {
  const { size } = useThree();
  const initialScale = useInitialScale(obj.objectId);
  const gltf = useGLTF(resolveAssetPath(obj.glbPath));

  // 同一作品の複数追加に対応するためcloneする（仕様書 26.5）。
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const { baseScale, localBox } = useMemo(() => {
    const s = normalizeModelScale(
      model,
      obj.type,
      { width: size.width, height: size.height },
      initialScale,
    );
    const b = new THREE.Box3().setFromObject(model);
    return { baseScale: s, localBox: b };
  }, [model, obj.type, size.width, size.height, initialScale]);

  const scale = baseScale * obj.scale;

  return (
    <group
      position={[obj.position.x, obj.position.y, obj.zIndex * Z_STEP]}
      rotation={[0, 0, obj.rotation]}
      scale={[scale, scale, scale]}
      userData={{ instanceId: obj.instanceId }}
    >
      <primitive object={model} />
      {obj.selected && <SelectionOutline box={localBox} />}
    </group>
  );
}

/**
 * 選択中オブジェクトの視覚的フィードバック（仕様書 7.7）。
 * 操作補助UIのため、撮影時は選択解除により写り込まない（仕様書 26.2）。
 */
function SelectionOutline({ box }: { box: THREE.Box3 }) {
  const geometry = useMemo(() => {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const pad = 1.08;
    const boxGeo = new THREE.BoxGeometry(
      Math.max(size.x, 1e-3) * pad,
      Math.max(size.y, 1e-3) * pad,
      Math.max(size.z, 1e-3) * pad,
    );
    boxGeo.translate(center.x, center.y, center.z);
    return new THREE.EdgesGeometry(boxGeo);
  }, [box]);

  return (
    <lineSegments geometry={geometry} renderOrder={999}>
      <lineBasicMaterial color="#39c5ff" depthTest={false} transparent />
    </lineSegments>
  );
}

/**
 * GLB読み込み失敗時のプレースホルダー（仕様書 18.3 / 23.1）。
 * フレームは枠、装飾はボックスで代替表示する。
 */
function PlaceholderObject({ obj }: { obj: DisplayObject }) {
  const { size } = useThree();
  const base =
    obj.type === "frame"
      ? Math.min(size.width, size.height) * 0.9
      : size.width * 0.25;
  const scale = base * obj.scale;

  return (
    <group
      position={[obj.position.x, obj.position.y, obj.zIndex * Z_STEP]}
      rotation={[0, 0, obj.rotation]}
      scale={[scale, scale, scale]}
      userData={{ instanceId: obj.instanceId }}
    >
      {obj.type === "frame" ? (
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(1, 1.4)]} />
          <lineBasicMaterial color="#ff7aa2" />
        </lineSegments>
      ) : (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ffd34d" />
        </mesh>
      )}
      {obj.selected && (
        <lineSegments renderOrder={999}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.1, 1.1, 1.1)]} />
          <lineBasicMaterial color="#39c5ff" depthTest={false} transparent />
        </lineSegments>
      )}
    </group>
  );
}
