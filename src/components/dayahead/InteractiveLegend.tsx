import { cn } from "@/lib/utils";

export type LegendItem = { key: string; label: string; color: string; dashed?: boolean };

/** Clickable legend. "chip": pill with a coloured dot (forecast chart). "line": short coloured
 *  line then the label (weather chart). Hidden series show faded. */
export function InteractiveLegend({ items, hidden, onToggle, variant = "chip" }: {
  items: LegendItem[]; hidden: Set<string>; onToggle: (key: string) => void; variant?: "chip" | "line";
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {items.map((it) => {
        const off = hidden.has(it.key);
        return (
          <button key={it.key} type="button" onClick={() => onToggle(it.key)} aria-pressed={!off}
            className={cn("inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity",
              variant === "chip" ? "rounded-full bg-muted px-2.5 py-1" : "px-1.5 py-0.5",
              off && "opacity-40 line-through")}>
            {variant === "chip" ? (
              <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
            ) : (
              <span className="inline-block w-4 border-t-2" style={{ borderColor: it.color, borderStyle: it.dashed ? "dashed" : "solid" }} />
            )}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
