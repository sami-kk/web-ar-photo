// 仕様書 13.2: useReducer + Context による状態管理
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { ARState } from "../types/arState";
import { arReducer, initialARState, type ARAction } from "./arReducer";

type ARContextValue = {
  state: ARState;
  dispatch: Dispatch<ARAction>;
};

const ARContext = createContext<ARContextValue | null>(null);

export function ARProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(arReducer, initialARState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ARContext.Provider value={value}>{children}</ARContext.Provider>;
}

export function useARContext(): ARContextValue {
  const ctx = useContext(ARContext);
  if (!ctx) {
    throw new Error("useARContext は ARProvider の内側で使用してください。");
  }
  return ctx;
}
