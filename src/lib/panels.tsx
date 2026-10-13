import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ModId, TfId } from "@/data/engine";

export type Panel = { kind: "drill"; mod: ModId; tf: TfId; i: number } | { kind: "report"; id: string; tf: TfId } | null;
type Ctx = {
  panel: Panel;
  openDrill: (mod: ModId, tf: TfId, i: number) => void;
  openReport: (id: string, tf: TfId) => void;
  close: () => void;
};
const PanelCtx = createContext<Ctx | null>(null);

/** One side sheet for the whole app: period drill-downs and report previews. */
export function PanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel>(null);
  const openDrill = useCallback((mod: ModId, tf: TfId, i: number) => setPanel({ kind: "drill", mod, tf, i }), []);
  const openReport = useCallback((id: string, tf: TfId) => setPanel({ kind: "report", id, tf }), []);
  const close = useCallback(() => setPanel(null), []);
  return <PanelCtx.Provider value={{ panel, openDrill, openReport, close }}>{children}</PanelCtx.Provider>;
}
export function usePanels() {
  const c = useContext(PanelCtx);
  if (!c) throw new Error("usePanels must be used inside <PanelProvider>");
  return c;
}
