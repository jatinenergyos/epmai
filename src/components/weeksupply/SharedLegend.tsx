import { cn } from "@/lib/utils";

export type LegendEntry = { name: string; color: string; dashed?: boolean };

/** One legend under the grid; clicking an item hides / shows that series in every day chart. */
export function SharedLegend({ items, hidden, onToggle }: { items: LegendEntry[]; hidden: Set<string>; onToggle: (name: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1">
      {items.map((it) => {
        const off = hidden.has(it.name);
        return (
          <button
            key={it.name} type="button" aria-pressed={!off} onClick={() => onToggle(it.name)}
            className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 transition-opacity", off && "opacity-35")}
            // Inline so a parent's button styles (e.g. the calendar pop-up's .dc-root buttons) can't
            // turn the items into big bordered pills.
            style={{ border: 0, background: "transparent", padding: 0, fontSize: 11, lineHeight: 1.4, height: "auto" }}
          >
            <span className="inline-block w-4" style={{ borderTop: `${it.dashed ? 2 : 3}px ${it.dashed ? "dashed" : "solid"} ${it.color}` }} />
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
