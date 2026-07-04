// 仕様書 7.1 カメラ起動 / 17.1 useCameraStream
import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraStatus } from "../types/arState";

export type UseCameraStreamResult = {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  error: Error | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
};

/**
 * 背面カメラを優先してMediaStreamを取得し、video要素へ流し込む。
 * iOS Safari対策として playsInline / muted / autoPlay は video要素側に付与する。
 */
export function useCameraStream(): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setStatus("error");
      setError(new Error("getUserMedia が利用できません。"));
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 仕様書 7.1: 背面カメラを優先。取得できない場合はブラウザ判断に任せる。
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS Safariでは明示的に play() が必要な場合がある。
        try {
          await videoRef.current.play();
        } catch {
          /* 自動再生制限。ユーザー操作後に再試行される想定 */
        }
      }
      setStatus("active");
    } catch (e) {
      const err = e as DOMException;
      // 権限拒否とその他エラーを区別する（仕様書 18.1 / 18.2）。
      if (
        err &&
        (err.name === "NotAllowedError" || err.name === "SecurityError")
      ) {
        setStatus("denied");
      } else {
        setStatus("error");
      }
      setError(err instanceof Error ? err : new Error(String(e)));
    }
  }, []);

  // アンマウント時にカメラを停止（リソース解放 / 仕様書 19.1）。
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return { videoRef, status, error, startCamera, stopCamera };
}
