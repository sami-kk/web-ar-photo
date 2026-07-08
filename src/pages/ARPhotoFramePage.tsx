// 仕様書 16.1 ARPhotoFramePage
// カメラ画面・モーダル・プレビュー・エラー画面を切り替える親コンポーネント。
import { useEffect, useRef } from "react";
import { useARContext } from "../state/arContext";
import { useBrowserSupport } from "../hooks/useBrowserSupport";
import { useCameraStream } from "../hooks/useCameraStream";
import { useInitCatalog } from "../hooks/useInitCatalog";
import { useObjectGesture } from "../hooks/useObjectGesture";
import { useCaptureCanvas } from "../hooks/useCaptureCanvas";
import { ARCameraView } from "../components/ar/ARCameraView";
import { ARCanvasLayer } from "../components/ar/ARCanvasLayer";
import { ARMenu } from "../components/ar/ARMenu";
import { ARToolbar } from "../components/ar/ARToolbar";
import { ARObjectSelectionModal } from "../components/ar/ARObjectSelectionModal";
import { ARCapturePreview } from "../components/ar/ARCapturePreview";
import { ARTutorial } from "../components/ar/ARTutorial";
import { ARErrorView } from "../components/ar/ARErrorView";
import { ARLoadingView } from "../components/ar/ARLoadingView";

const TUTORIAL_STORAGE_KEY = "ar-photo-frame:hasSeenTutorial";
// 仕様書 8.4: 終了時の遷移先。未定のため定数/環境変数で管理する。
const EXIT_URL = import.meta.env.VITE_EXIT_URL ?? "/";

export function ARPhotoFramePage() {
  const { state, dispatch } = useARContext();
  const support = useBrowserSupport();
  const { videoRef, status: cameraStatus, startCamera } = useCameraStream();
  const overlayRef = useRef<HTMLDivElement>(null);
  const autoTutorialShown = useRef(false);

  // JSON読み込み・デフォルトフレーム表示（仕様書 9.1）。
  useInitCatalog();

  // 撮影処理。
  const { capture } = useCaptureCanvas(videoRef);

  // モーダル/プレビュー表示中はジェスチャを無効化する。
  const gestureEnabled =
    !state.isSelectionModalOpen &&
    !state.capturedImageUrl &&
    !state.isTutorialOpen;
  useObjectGesture(overlayRef, gestureEnabled);

  // カメラ起動（対応環境の場合のみ）。
  useEffect(() => {
    if (support?.supported) {
      void startCamera();
    }
  }, [support?.supported, startCamera]);

  // カメラ状態をグローバル状態へ反映（エラー画面判定用）。
  useEffect(() => {
    dispatch({ type: "SET_CAMERA_STATUS", status: cameraStatus });
  }, [cameraStatus, dispatch]);

  // チュートリアル表示履歴を localStorage から復元（仕様書 26.11）。
  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
    dispatch({ type: "SET_HAS_SEEN_TUTORIAL", value: seen });
  }, [dispatch]);

  // 初回のみ: カメラ起動＆デフォルトフレーム表示後にチュートリアルを自動表示。
  useEffect(() => {
    if (
      !autoTutorialShown.current &&
      cameraStatus === "active" &&
      state.loadingStatus === "ready" &&
      !state.hasSeenTutorial
    ) {
      autoTutorialShown.current = true;
      dispatch({ type: "OPEN_TUTORIAL" });
    }
  }, [cameraStatus, state.loadingStatus, state.hasSeenTutorial, dispatch]);

  // チュートリアルを閉じたら履歴を保存。
  useEffect(() => {
    if (state.hasSeenTutorial) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    }
  }, [state.hasSeenTutorial]);

  const exit = () => {
    window.location.href = EXIT_URL;
  };

  // --- 画面切り替え ---

  // 非対応ブラウザ（仕様書 18.2）。
  if (support && !support.supported) {
    return <ARErrorView kind="unsupported" />;
  }

  // カメラ権限拒否・エラー（仕様書 18.1）。
  if (cameraStatus === "denied") {
    return <ARErrorView kind="camera-denied" onRetry={() => void startCamera()} />;
  }
  if (cameraStatus === "error") {
    return <ARErrorView kind="unsupported" onRetry={() => void startCamera()} />;
  }

  return (
    <div className="ar-root">
      {/* 背景: カメラ映像 */}
      <ARCameraView ref={videoRef} />

      {/* 前景: 3Dオブジェクト（pointer-eventsはCSSで無効化し、操作はオーバーレイで受ける） */}
      <ARCanvasLayer />

      {/* ジェスチャ受け取り用オーバーレイ（タップ選択/ドラッグ/ピンチ） */}
      <div ref={overlayRef} className="ar-interaction" />

      {/* UIレイヤー（撮影画像には含めない / 仕様書 26.2） */}
      <div className="ar-ui">
        <ARMenu />
        <ARToolbar onCapture={() => void capture()} />
      </div>

      {/* カメラ起動中ローディング */}
      {(cameraStatus === "idle" || cameraStatus === "requesting") && (
        <ARLoadingView message="カメラを起動しています..." />
      )}

      {/* エラーメッセージ（最大数超過など） */}
      {state.errorMessage && (
        <div className="ar-toast" role="alert">
          <span>{state.errorMessage}</span>
          <button
            type="button"
            className="ar-icon-button"
            aria-label="閉じる"
            onClick={() => dispatch({ type: "SET_ERROR", message: null })}
          >
            ×
          </button>
        </div>
      )}

      {/* フレーム選択モーダル */}
      <ARObjectSelectionModal />

      {/* チュートリアル */}
      {state.isTutorialOpen && (
        <ARTutorial onClose={() => dispatch({ type: "CLOSE_TUTORIAL" })} />
      )}

      {/* 撮影プレビュー */}
      <ARCapturePreview onExit={exit} />
    </div>
  );
}
