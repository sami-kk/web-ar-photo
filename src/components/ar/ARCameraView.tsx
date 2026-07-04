// 仕様書 16.2 ARCameraView / 14.3 カメラ映像
// カメラ映像を背景として表示する。iOS Safari対策で playsInline / muted を付与。
import { forwardRef } from "react";

export const ARCameraView = forwardRef<HTMLVideoElement>((_props, ref) => {
  return (
    <video
      ref={ref}
      className="camera-video"
      autoPlay
      playsInline
      muted
      // 撮影対象はvideoの現在フレーム。UI操作はオーバーレイ側で受ける。
    />
  );
});

ARCameraView.displayName = "ARCameraView";
