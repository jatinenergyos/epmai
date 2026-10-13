import { Info } from "lucide-react";
import type { Kpi } from "@/data/model";
import { termFor } from "@/lib/glossary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ACCENT = { ok: "before:bg-ok", warn: "before:bg-warn", crit: "before:bg-bad", info: "before:bg-info" } as const;

/** Row of key numbers. Each label explains itself on hover via the glossary. */
export function Kpis({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]", className)}>
      {items.map((k) => {
        const t = termFor(k.l + " " + (k.u ?? ""));
        return (
          <div
            key={k.l}
            className={cn("relative min-w-0 bg-card px-3.5 py-3 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r",
              k.st ? ACCENT[k.st] : "before:bg-transparent")}
          >
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{k.l}</span>
              {t && (
                <Tooltip>
                  <TooltipTrigger className="shrink-0 rounded text-muted-foreground/70 hover:text-foreground" aria-label={"What is " + t.term}>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-xs leading-relaxed"><b>{t.term}.</b> {t.def}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="num mt-0.5 truncate text-xl font-semibold leading-tight">
              {k.v}
              {k.u && <span className="ml-1 text-xs font-normal text-muted-foreground">{k.u}</span>}
            </div>
            {k.s && <div className="truncate text-xs text-muted-foreground">{k.s}</div>}
          </div>
        );
      })}
    </div>
  );
}
