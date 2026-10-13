import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Palette = "ocean" | "arctic" | "minimal" | "tech";
export type Mode = "system" | "light" | "dark";

/** Palettes from the theme-factory skill. Swatches feed the theme menu. */
export const PALETTES: { id: Palette; name: string; note: string; swatch: string[] }[] = [
  { id: "ocean", name: "Ocean Depths", note: "Navy, teal, seafoam", swatch: ["#1a2332", "#2d8b8b", "#a8dadc", "#f1faee"] },
  { id: "arctic", name: "Arctic Frost", note: "Steel blue, ice", swatch: ["#24364f", "#4a6fa5", "#d4e4f7", "#fafafa"] },
  { id: "minimal", name: "Modern Minimalist", note: "Charcoal greyscale", swatch: ["#36454f", "#708090", "#d3d3d3", "#ffffff"] },
  { id: "tech", name: "Tech Innovation", note: "Dark, electric blue", swatch: ["#1e1e1e", "#0066ff", "#00ffff", "#ffffff"] },
];

type Ctx = { palette: Palette; mode: Mode; setPalette: (p: Palette) => void; setMode: (m: Mode) => void };
const ThemeCtx = createContext<Ctx | null>(null);

const read = <T extends string>(k: string, fallback: T): T => {
  try { return (localStorage.getItem(k) as T) || fallback; } catch { return fallback; }
};
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState<Palette>(() => read("epm.palette", "ocean"));
  const [mode, setMode] = useState<Mode>(() => read("epm.mode", "system"));

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.palette = palette;
    write("epm.palette", palette);
  }, [palette]);

  useEffect(() => {
    const el = document.documentElement;
    if (mode === "system") delete el.dataset.theme;
    else el.dataset.theme = mode;
    write("epm.mode", mode);
  }, [mode]);

  return <ThemeCtx.Provider value={{ palette, mode, setPalette, setMode }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be used inside <ThemeProvider>");
  return c;
}
