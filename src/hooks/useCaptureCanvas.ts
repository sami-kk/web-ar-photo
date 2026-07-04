// 仕様書 17.4 useCaptureCanvas / 7.9 / 26.2
// video要素と3D Canvasを合成してJPEGを生成する。UIレイヤーは含めない。
import { useCallback } from "react";
import { useARContext } from "../state/arContext";
import { useSceneBridge } from "../state/sceneBridge";
import { captureToJpeg } from "../utils/captureToJpeg";

export function useCaptureCanvas(
  videoRef: React.RefObject<HTMLVideoElement>,
) {
  const { state, dispatch } = useARContext();
  const bridge = useSceneBridge();

  const capture = useCallback(async () => {
    // 仕様書 8.2: 撮影処理中は二重押下を防止する。
    if (state.isCapturing) return;
    const video = videoRef.current;
    const gl = bridge.current.gl;
    const size = bridge.current.size;
    if (!video || !gl) {
      dispatch({
        type: "SET_ERROR",
        message: "撮影できませんでした。カメラの起動状態を確認してください。",
      });
      return;
    }

    dispatch({ type: "SET_CAPTURING", value: true });
    // 撮影時は選択枠を写さない（仕様書 26.2）。選択状態を解除しておく。
    dispatch({ type: "SELECT_OBJECT", instanceId: null });

    try {
      // 状態更新(選択解除)を1フレーム描画へ反映させてから合成する。
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const threeCanvas = gl.domElement;
      const result = await captureToJpeg(video, threeCanvas, size);
      dispatch({ type: "SET_CAPTURED_IMAGE", url: result.url });
    } catch (e) {
      console.error("[useCaptureCanvas] 撮影に失敗しました。", e);
      dispatch({
        type: "SET_ERROR",
        message: "撮影に失敗しました。もう一度お試しください。",
      });
    } finally {
      dispatch({ type: "SET_CAPTURING", value: false });
    }
  }, [state.isCapturing, videoRef, bridge, dispatch]);

  return { capture };
}
