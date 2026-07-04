import { ARProvider } from "./state/arContext";
import { SceneBridgeProvider } from "./state/sceneBridge";
import { ARPhotoFramePage } from "./pages/ARPhotoFramePage";
import "./styles/arPhotoFrame.css";

export default function App() {
  return (
    <ARProvider>
      {/* SceneBridge は Canvas とジェスチャ/撮影処理で共有するため上位に配置 */}
      <SceneBridgeProvider>
        <ARPhotoFramePage />
      </SceneBridgeProvider>
    </ARProvider>
  );
}
