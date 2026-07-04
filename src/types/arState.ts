// 仕様書 11.2 DisplayObject / 11.3 ARState
import type { ARObjectMeta, ARObjectType } from "./arObject";

/**
 * 画面上に表示されている個別インスタンス。
 * 同一作品を複数追加できるため、objectId(作品ID)ではなく instanceId で管理する。
 * 仕様書 26.5 / 26.6 / 30-6
 */
export type DisplayObject = {
  /** 画面上に表示されている個別インスタンスID */
  instanceId: string;
  /** JSON上の作品ID */
  objectId: string;
  type: ARObjectType;
  name: string;
  authorName: string;
  description: string;
  glbPath: string;
  /** 回転可能か（装飾のみtrue） */
  rotatable: boolean;
  /**
   * 表示位置。オルソグラフィックカメラのワールド座標(=CSSピクセル、原点は画面中央)。
   * {x:0, y:0} が画面中央（仕様書 26.6「中央に戻す」の基準）。
   */
  position: {
    x: number;
    y: number;
  };
  /**
   * ユーザー操作による倍率。自動補正後サイズを 1.0 とし、0.2〜3.0 にclampする。
   * 仕様書 26.8
   */
  scale: number;
  /** Z軸回転(ラジアン)。装飾のみ変更可能（仕様書 26.9） */
  rotation: number;
  /** 重なり順。大きいほど前面。後から追加したものほど大きい（仕様書 26.4） */
  zIndex: number;
  /** 選択中か（仕様書 7.7） */
  selected: boolean;
};

export type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "error";

export type LoadingStatus = "idle" | "loading" | "ready" | "error";

/** 仕様書 11.3 ARState */
export type ARState = {
  cameraStatus: CameraStatus;
  loadingStatus: LoadingStatus;
  /** JSONから読み込んだ作品メタデータ一覧 */
  catalog: ARObjectMeta[];
  /** 表示中オブジェクト一覧 */
  displayObjects: DisplayObject[];
  selectedInstanceId: string | null;
  /** 撮影プレビュー画像のObjectURL */
  capturedImageUrl: string | null;
  isSelectionModalOpen: boolean;
  isTutorialOpen: boolean;
  hasSeenTutorial: boolean;
  isCapturing: boolean;
  errorMessage: string | null;
};

/** 同時表示できるオブジェクトの上限（仕様書 7.4） */
export const MAX_DISPLAY_OBJECTS = 3;

/** ユーザー操作によるscaleの下限・上限（仕様書 26.8） */
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3.0;

/** 回転ボタン1回あたりの角度（度）。仕様書 26.9 最小実装 */
export const ROTATION_STEP_DEG = 15;
