import { MODS } from "@/data/engine";
import { useHorizonModule, type RulerSel } from "@/lib/horizon";
import { cn } from "@/lib/utils";

// Overview leads the strip (it's the default landing) and lays out every module at the horizon;
// Analytics follows, then the rest in their usual order.
const RULER_MODS = [...MODS].sort((a, b) => (a.id === "analytics" ? -1 : b.id === "analytics" ? 1 : 0));
const RULER: { id: RulerSel; name: string; sub: string }[] = [
  { id: "overview", name: "Overview", sub: "Every module at a glance" },
  ...RULER_MODS.map((m) => ({ id: m.id, name: m.name, sub: m.sub })),
];

/** The module selector for the Planning-horizon page: pick a module to see it at the chosen
 *  horizon, or Overview for every module at that horizon. Segmented-ruler look; axis is the
 *  modules (Overview, Demand, Supply…). */
export function ModuleRuler() {
  const { mod, setMod } = useHorizonModule();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden shrink-0 text-xs text-muted-foreground xl:block">Module</span>
      <div role="radiogroup" aria-label="Module" className="scroll-x -mx-1 flex-1 px-1 pb-2">
        <div className="grid overflow-visible rounded-md border bg-card"
          style={{ gridTemplateColumns: `repeat(${RULER.length}, minmax(0,1fr))`, minWidth: RULER.length * 92 }}>
          {RULER.map((m, k) => {
            const on = m.id === mod;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                data-on={on}
                onClick={() => setMod(m.id)}
                className={cn("ruler-seg px-2 py-1.5 text-left transition-colors hover:bg-accent",
                  k > 0 && "border-l", k === 0 && "rounded-l-[5px]", k === RULER.length - 1 && "rounded-r-[5px]")}
              >
                <span className="block truncate text-[13px] font-semibold leading-tight">{m.name}</span>
                <span className={cn("block truncate text-[11px] leading-tight", on ? "opacity-85" : "text-muted-foreground")}>{m.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
