// 仕様書 7.6 オブジェクト操作 / 17.3 useObjectGesture
// タップ選択・ドラッグ移動・ピンチ拡大縮小を、カメラ上のオーバーレイ要素で処理する。
// 3Dヒットテストは SceneBridge の camera/scene を用いた raycast で行う。
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useARContext } from "../state/arContext";
import { useSceneBridge } from "../state/sceneBridge";
import type { DisplayObject } from "../types/arState";

type GestureMode = "none" | "drag" | "pinch";

type GestureState = {
  mode: GestureMode;
  instanceId: string | null;
  startClient: { x: number; y: number };
  startPos: { x: number; y: number };
  startScale: number;
  startDist: number;
};

/**
 * @param targetRef ジェスチャを受け付けるDOM要素(カメラ映像上の透明オーバーレイ)
 * @param enabled モーダル/プレビュー表示中などは無効化する
 */
export function useObjectGesture(
  targetRef: React.RefObject<HTMLElement>,
  enabled: boolean,
) {
  const { state, dispatch } = useARContext();
  const bridge = useSceneBridge();

  // イベントハンドラから最新の状態を参照するためのref。
  const displayObjectsRef = useRef<DisplayObject[]>(state.displayObjects);
  displayObjectsRef.current = state.displayObjects;
  const selectedRef = useRef<string | null>(state.selectedInstanceId);
  selectedRef.current = state.selectedInstanceId;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const gesture = useRef<GestureState>({
    mode: "none",
    instanceId: null,
    startClient: { x: 0, y: 0 },
    startPos: { x: 0, y: 0 },
    startScale: 1,
    startDist: 0,
  });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    /** clientX/Y から画面上のオブジェクトをヒットテストして instanceId を返す。 */
    const hitTest = (clientX: number, clientY: number): string | null => {
      const { camera, scene } = bridge.current;
      if (!camera || !scene) return null;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      const hits = raycaster.current.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const id = obj.userData?.instanceId as string | undefined;
          if (id) return id;
          obj = obj.parent;
        }
      }
      return null;
    };

    const clampCenter = (x: number, y: number) => {
      // 仕様書 26.7: オブジェクトの中心点は画面外に出ないよう制限する。
      const { width, height } = bridge.current.size;
      const halfW = width / 2;
      const halfH = height / 2;
      return {
        x: Math.min(halfW, Math.max(-halfW, x)),
        y: Math.min(halfH, Math.max(-halfH, y)),
      };
    };

    const findObject = (id: string | null) =>
      id ? displayObjectsRef.current.find((o) => o.instanceId === id) : undefined;

    const beginDrag = (id: string, clientX: number, clientY: number) => {
      const obj = findObject(id);
      gesture.current = {
        mode: "drag",
        instanceId: id,
        startClient: { x: clientX, y: clientY },
        startPos: obj ? { ...obj.position } : { x: 0, y: 0 },
        startScale: obj ? obj.scale : 1,
        startDist: 0,
      };
    };

    const beginPinch = () => {
      const id = selectedRef.current;
      const pts = [...pointers.current.values()];
      if (!id || pts.length < 2) return;
      const obj = findObject(id);
      gesture.current = {
        mode: "pinch",
        instanceId: id,
        startClient: { x: 0, y: 0 },
        startPos: obj ? { ...obj.position } : { x: 0, y: 0 },
        startScale: obj ? obj.scale : 1,
        startDist: distance(pts[0], pts[1]),
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!enabledRef.current) return;
      el.setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        // タップ選択（仕様書 7.7）。背景タップで選択解除。
        const hitId = hitTest(e.clientX, e.clientY);
        dispatch({ type: "SELECT_OBJECT", instanceId: hitId });
        if (hitId) {
          beginDrag(hitId, e.clientX, e.clientY);
        } else {
          gesture.current.mode = "none";
        }
      } else if (pointers.current.size === 2) {
        beginPinch();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current;

      if (g.mode === "drag" && pointers.current.size === 1 && g.instanceId) {
        // ドラッグ移動（オルソ: 1ワールド単位=1CSSpx、画面y下=ワールドy上）。
        const dx = e.clientX - g.startClient.x;
        const dy = e.clientY - g.startClient.y;
        const next = clampCenter(g.startPos.x + dx, g.startPos.y - dy);
        dispatch({
          type: "MOVE_OBJECT",
          instanceId: g.instanceId,
          x: next.x,
          y: next.y,
        });
      } else if (g.mode === "pinch" && pointers.current.size >= 2 && g.instanceId) {
        // ピンチ拡大縮小（仕様書 26.8、clampはreducer側で 0.2〜3.0）。
        const pts = [...pointers.current.values()];
        const dist = distance(pts[0], pts[1]);
        if (g.startDist > 0) {
          const factor = dist / g.startDist;
          dispatch({
            type: "SET_SCALE",
            instanceId: g.instanceId,
            scale: g.startScale * factor,
          });
        }
      }
    };

    const endPointer = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      el.releasePointerCapture?.(e.pointerId);
      if (pointers.current.size === 1) {
        // ピンチ→片手ドラッグへ復帰。残った指を起点に再設定する。
        const [remaining] = [...pointers.current.entries()];
        const id = selectedRef.current;
        if (remaining && id) {
          beginDrag(id, remaining[1].x, remaining[1].y);
        } else {
          gesture.current.mode = "none";
        }
      } else if (pointers.current.size === 0) {
        gesture.current.mode = "none";
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endPointer);
      el.removeEventListener("pointercancel", endPointer);
    };
  }, [targetRef, bridge, dispatch]);
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
