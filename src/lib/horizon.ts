import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { isMod, isTf, type ModId, type TfId } from "@/data/engine";

export const DEFAULT_TF: TfId = "id";
// The module strip's selection on the Planning-horizon page is either a real module or the
// "Overview" tab, which lays out every module at the chosen horizon. The page lands on Overview.
export type RulerSel = ModId | "overview";
export const DEFAULT_MOD: RulerSel = "overview";
const isSel = (v: unknown): v is RulerSel => v === "overview" || isMod(v);

// Last selections are remembered in localStorage so they survive reloads and navigating away and
// back, instead of snapping to the defaults. The URL still wins when it carries a value.
const KEY_H = "epm.h", KEY_M = "epm.m", KEY_MOD = "epm.mod";
const loadTf = (key: string): TfId | null => {
  try { const v = localStorage.getItem(key); return isTf(v) ? v : null; } catch { return null; }
};
const loadSel = (key: string): RulerSel | null => {
  try { const v = localStorage.getItem(key); return isSel(v) ? v : null; } catch { return null; }
};
const persist = (key: string, v: string) => {
  try { localStorage.setItem(key, v); } catch { /* storage unavailable — ignore */ }
};

/** Planning-horizon selection (?h=): drives the all-modules Horizon page, its nav + ruler and the
 *  snapshot. Independent of the module horizon below, so the two header menus don't affect each other. */
export function useHorizon() {
  const search = useSearch({ strict: false }) as { h?: TfId };
  const navigate = useNavigate();
  const tf: TfId = search.h ?? loadTf(KEY_H) ?? DEFAULT_TF;
  useEffect(() => { if (search.h) persist(KEY_H, search.h); }, [search.h]);
  const setTf = (h: TfId) => {
    persist(KEY_H, h);
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, h }), replace: true });
  };
  return { tf, setTf };
}

/** Module-horizon selection (?m=): which horizon a single module page shows. Separate from the
 *  planning horizon (?h=) so the "All modules" and "Planning horizon" menus are decoupled. */
export function useModuleTf() {
  const search = useSearch({ strict: false }) as { m?: TfId };
  const navigate = useNavigate();
  const tf: TfId = search.m ?? loadTf(KEY_M) ?? DEFAULT_TF;
  useEffect(() => { if (search.m) persist(KEY_M, search.m); }, [search.m]);
  const setTf = (m: TfId) => {
    persist(KEY_M, m);
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, m }), replace: true });
  };
  return { tf, setTf };
}

/** Which module the all-horizons page (/horizon) is focused on (?mod=). The ruler on that page
 *  picks the module; the page then lays it out across every planning horizon. */
export function useHorizonModule() {
  const search = useSearch({ strict: false }) as { mod?: RulerSel };
  const navigate = useNavigate();
  const mod: RulerSel = (isSel(search.mod) ? search.mod : loadSel(KEY_MOD)) ?? DEFAULT_MOD;
  useEffect(() => { if (isSel(search.mod)) persist(KEY_MOD, search.mod); }, [search.mod]);
  const setMod = (m: RulerSel) => {
    persist(KEY_MOD, m);
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, mod: m }), replace: true });
  };
  return { mod, setMod };
}

/** The open tab on a cell page (?t=): "overview" or one of the module's detail-metric ids. The
 *  cell tab strip in the header sets it; the cell page reads it. */
export function useCellTab() {
  const search = useSearch({ strict: false }) as { t?: string };
  const navigate = useNavigate();
  const tab = search.t ?? "overview";
  const setTab = (t: string) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, t }), replace: true });
  return { tab, setTab };
}

/** Pass to <Link search={keepH}> to carry the planning horizon across the horizon/snapshot pages. */
export const keepH = (prev: { h?: TfId }) => ({ h: prev.h });
/** Pass to <Link search={keepM}> to carry the module horizon across the single-module pages. */
export const keepM = (prev: { m?: TfId }) => ({ m: prev.m });
