// 仕様書 18.3 GLB読み込み失敗: 対象は表示しないが、他の機能は継続する（アプリを落とさない）。
import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 読み込み失敗時に表示するフォールバック（プレースホルダー等） */
  fallback: ReactNode;
  onError?: (error: Error) => void;
};

type State = { hasError: boolean };

export class GLBErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[GLBErrorBoundary] GLB読み込みに失敗しました。", error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
