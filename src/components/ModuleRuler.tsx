import { MODS } from "@/data/engine";
import { useHorizonModule } from "@/lib/horizon";
import { cn } from "@/lib/utils";

// Analytics leads the strip (it's the default landing); the rest follow in their usual order.
const RULER_MODS = [...MODS].sort((a, b) => (a.id === "analytics" ? -1 : b.id === "analytics" ? 1 : 0));

/** The module selector for the all-horizons page: pick a module to see it laid out across every
 *  planning horizon. Same segmented-ruler look as before, with the axis swapped from horizons to
 *  modules (Demand, Supply, Market…). */
export function ModuleRuler() {
  const { mod, setMod } = useHorizonModule();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden shrink-0 text-xs text-muted-foreground xl:block">Module</span>
      <div role="radiogroup" aria-label="Module" className="scroll-x -mx-1 flex-1 px-1 pb-2">
        <div className="grid min-w-[640px] grid-cols-7 overflow-visible rounded-md border bg-card">
          {RULER_MODS.map((m, k) => {
            const on = m.id === mod;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={on}
                data-on={on}
                onClick={() => setMod(m.id)}
                className={cn("ruler-seg px-2 py-1.5 text-left transition-colors hover:bg-accent",
                  k > 0 && "border-l", k === 0 && "rounded-l-[5px]", k === RULER_MODS.length - 1 && "rounded-r-[5px]")}
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
