// 仕様書 13. 状態管理 / useReducer + Context 推奨
import type { ARObjectMeta } from "../types/arObject";
import {
  MAX_DISPLAY_OBJECTS,
  MAX_SCALE,
  MIN_SCALE,
  type ARState,
  type CameraStatus,
  type DisplayObject,
  type LoadingStatus,
} from "../types/arState";
import { createInstanceId } from "../utils/createInstanceId";

export const initialARState: ARState = {
  cameraStatus: "idle",
  loadingStatus: "idle",
  catalog: [],
  displayObjects: [],
  selectedInstanceId: null,
  capturedImageUrl: null,
  isSelectionModalOpen: false,
  isTutorialOpen: false,
  hasSeenTutorial: false,
  isCapturing: false,
  errorMessage: null,
};

export type ARAction =
  | { type: "SET_CAMERA_STATUS"; status: CameraStatus }
  | { type: "SET_LOADING_STATUS"; status: LoadingStatus }
  | { type: "SET_CATALOG"; catalog: ARObjectMeta[] }
  | { type: "ADD_OBJECT"; meta: ARObjectMeta }
  | { type: "REMOVE_OBJECT"; instanceId: string }
  | { type: "SELECT_OBJECT"; instanceId: string | null }
  | { type: "MOVE_OBJECT"; instanceId: string; x: number; y: number }
  | { type: "SET_SCALE"; instanceId: string; scale: number }
  | { type: "SET_ROTATION"; instanceId: string; rotation: number }
  | { type: "RESET_OBJECT"; instanceId: string } // 中央に戻す(仕様書 26.6)
  | { type: "BRING_FORWARD"; instanceId: string } // 前面へ(仕様書 26.4)
  | { type: "SEND_BACKWARD"; instanceId: string } // 背面へ(仕様書 26.4)
  | { type: "OPEN_SELECTION_MODAL" }
  | { type: "CLOSE_SELECTION_MODAL" }
  | { type: "OPEN_TUTORIAL" }
  | { type: "CLOSE_TUTORIAL" }
  | { type: "SET_HAS_SEEN_TUTORIAL"; value: boolean }
  | { type: "SET_CAPTURING"; value: boolean }
  | { type: "SET_CAPTURED_IMAGE"; url: string | null }
  | { type: "RETAKE" } // 再撮影: 配置維持・選択解除(仕様書 13.3)
  | { type: "SET_ERROR"; message: string | null };

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** zIndexを 0..n-1 に振り直し、順序を正規化する。 */
function reindex(objects: DisplayObject[]): DisplayObject[] {
  return [...objects]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((o, i) => (o.zIndex === i ? o : { ...o, zIndex: i }));
}

export function arReducer(state: ARState, action: ARAction): ARState {
  switch (action.type) {
    case "SET_CAMERA_STATUS":
      return { ...state, cameraStatus: action.status };

    case "SET_LOADING_STATUS":
      return { ...state, loadingStatus: action.status };

    case "SET_CATALOG":
      return { ...state, catalog: action.catalog };

    case "ADD_OBJECT": {
      // 仕様書 7.4: 合計最大3つ。超過時はエラー表示（追加しない）。
      if (state.displayObjects.length >= MAX_DISPLAY_OBJECTS) {
        return {
          ...state,
          errorMessage:
            "同時に表示できるのは3つまでです。不要なフレームまたは装飾を削除してください。",
        };
      }
      const { meta } = action;
      const existingIds = state.displayObjects.map((o) => o.instanceId);
      const instanceId = createInstanceId(meta.id, existingIds);
      const maxZ = state.displayObjects.reduce(
        (max, o) => Math.max(max, o.zIndex),
        -1,
      );
      // 仕様書 26.4: 後から追加したオブジェクトほど前面(最大zIndex)。
      const newObject: DisplayObject = {
        instanceId,
        objectId: meta.id,
        type: meta.type,
        name: meta.name,
        authorName: meta.authorName,
        description: meta.description,
        glbPath: meta.glbPath,
        // 装飾のみ回転可能。フレームはrotatable指定に関わらず回転不可(仕様書 26.9)。
        rotatable: meta.type === "decoration" && meta.rotatable !== false,
        position: { x: 0, y: 0 },
        scale: 1.0,
        rotation: 0,
        zIndex: maxZ + 1,
        selected: false,
      };
      // 追加直後に選択状態にする（操作しやすさ・視覚的フィードバック）。
      const displayObjects = state.displayObjects
        .map((o) => ({ ...o, selected: false }))
        .concat({ ...newObject, selected: true });
      return {
        ...state,
        displayObjects,
        selectedInstanceId: instanceId,
        errorMessage: null,
      };
    }

    case "REMOVE_OBJECT": {
      // 仕様書 13.4: displayObjectsから削除し、選択対象なら解除する。
      const filtered = state.displayObjects.filter(
        (o) => o.instanceId !== action.instanceId,
      );
      return {
        ...state,
        displayObjects: reindex(filtered),
        selectedInstanceId:
          state.selectedInstanceId === action.instanceId
            ? null
            : state.selectedInstanceId,
      };
    }

    case "SELECT_OBJECT": {
      // 仕様書 26.4: 選択したオブジェクトは操作しやすいよう前面へ移動してよい。
      const target = action.instanceId
        ? state.displayObjects.find((o) => o.instanceId === action.instanceId)
        : undefined;
      const maxZ = state.displayObjects.reduce(
        (max, o) => Math.max(max, o.zIndex),
        -1,
      );
      const displayObjects = state.displayObjects.map((o) => {
        const selected = o.instanceId === action.instanceId;
        if (target && selected && o.zIndex !== maxZ) {
          return { ...o, selected, zIndex: maxZ + 1 };
        }
        return o.selected === selected ? o : { ...o, selected };
      });
      return {
        ...state,
        displayObjects: reindex(displayObjects),
        selectedInstanceId: action.instanceId,
      };
    }

    case "MOVE_OBJECT":
      return {
        ...state,
        displayObjects: state.displayObjects.map((o) =>
          o.instanceId === action.instanceId
            ? { ...o, position: { x: action.x, y: action.y } }
            : o,
        ),
      };

    case "SET_SCALE":
      return {
        ...state,
        displayObjects: state.displayObjects.map((o) =>
          o.instanceId === action.instanceId
            ? { ...o, scale: clampScale(action.scale) }
            : o,
        ),
      };

    case "SET_ROTATION":
      return {
        ...state,
        displayObjects: state.displayObjects.map((o) =>
          // フレームは回転不可。rotatableなインスタンスのみ反映(仕様書 26.9)。
          o.instanceId === action.instanceId && o.rotatable
            ? { ...o, rotation: action.rotation }
            : o,
        ),
      };

    case "RESET_OBJECT":
      // 中央に戻す: 位置を中央、scaleを初期値1.0に戻す(仕様書 26.6 / 26.8)。
      return {
        ...state,
        displayObjects: state.displayObjects.map((o) =>
          o.instanceId === action.instanceId
            ? { ...o, position: { x: 0, y: 0 }, scale: 1.0 }
            : o,
        ),
      };

    case "BRING_FORWARD": {
      const normalized = reindex(state.displayObjects);
      const maxZ = normalized.length - 1;
      return {
        ...state,
        displayObjects: normalized.map((o) =>
          o.instanceId === action.instanceId ? { ...o, zIndex: maxZ + 1 } : o,
        ),
      };
    }

    case "SEND_BACKWARD": {
      const normalized = reindex(state.displayObjects);
      return {
        ...state,
        displayObjects: normalized.map((o) =>
          o.instanceId === action.instanceId ? { ...o, zIndex: -1 } : o,
        ),
      };
    }

    case "OPEN_SELECTION_MODAL":
      return { ...state, isSelectionModalOpen: true };

    case "CLOSE_SELECTION_MODAL":
      return { ...state, isSelectionModalOpen: false };

    case "OPEN_TUTORIAL":
      return { ...state, isTutorialOpen: true };

    case "CLOSE_TUTORIAL":
      return { ...state, isTutorialOpen: false, hasSeenTutorial: true };

    case "SET_HAS_SEEN_TUTORIAL":
      return { ...state, hasSeenTutorial: action.value };

    case "SET_CAPTURING":
      return { ...state, isCapturing: action.value };

    case "SET_CAPTURED_IMAGE":
      return { ...state, capturedImageUrl: action.url };

    case "RETAKE":
      // 仕様書 13.3: 配置・拡大縮小率は維持。選択状態と撮影画像は解除。
      return {
        ...state,
        capturedImageUrl: null,
        selectedInstanceId: null,
        displayObjects: state.displayObjects.map((o) =>
          o.selected ? { ...o, selected: false } : o,
        ),
      };

    case "SET_ERROR":
      return { ...state, errorMessage: action.message };

    default:
      return state;
  }
}
