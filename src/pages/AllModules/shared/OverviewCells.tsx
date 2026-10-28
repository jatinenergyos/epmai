import type { Status } from "@/data/engine";
import type { SubVal } from "@/data/insights";
import { VizView } from "@/components/blocks";
import { Pill } from "@/components/status";

/* Cells shared by the module Overview pages (AllModules/<Module>/<Module>Overview.tsx). */

/* status-coloured tile, matching the command-centre grid cells */
export const CELL_CARD: Record<Status, string> = {
  crit: "border-bad/45 bg-bad-soft/40 hover:border-bad/80 hover:bg-bad-soft",
  warn: "border-warn/45 bg-warn-soft/30 hover:border-warn/80 hover:bg-warn-soft",
  info: "border-border bg-card hover:border-primary/60 hover:bg-accent",
  ok: "border-border bg-card hover:border-primary/60 hover:bg-accent",
};

/* frozen first column: a solid background plus a divider so it reads as pinned while scrolling */
export const STICKY = "sticky left-0 z-10 bg-card shadow-[1px_0_0_0_hsl(var(--border))]";

export function RowLabel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-l-2 border-primary/50 pl-2.5">
      <div className="text-[13px] font-semibold leading-snug">{title}</div>
      <div className="mt-0.5 text-[11px] font-normal leading-snug text-muted-foreground">{desc}</div>
    </div>
  );
}

export function DetailCell({ v }: { v: SubVal }) {
  return (
    <div className="flex h-full min-h-[92px] flex-col rounded-lg border border-border/60 bg-card px-2.5 py-2 shadow-sm">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="min-w-0 truncate">
          <span className="num text-[15px] font-semibold">{v.big}</span>
          {v.u && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{v.u}</span>}
        </span>
        {v.tag && <Pill st={v.tag[1]} className="shrink-0">{v.tag[0]}</Pill>}
      </div>
      {v.viz && <div className="mt-2">{<VizView v={v.viz} />}</div>}
      {v.sub && <div className="mt-auto pt-1.5 text-[11px] leading-snug text-muted-foreground">{v.sub}</div>}
    </div>
  );
}
