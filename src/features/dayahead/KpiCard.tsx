import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Row-1 KPI card: coloured top strip, small uppercase title, big value, grey caption.
 *  Pass `value={null}` to show "—". */
export function KpiCard({ title, value, caption, strip, className, children }: {
  title: string; value?: ReactNode; caption?: ReactNode; strip?: string; className?: string; children?: ReactNode;
}) {
  return (
    <div className={cn("relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border bg-card px-3 pb-2 pt-3 text-center", className)}>
      {strip && <span className="absolute inset-x-0 top-0 h-1" style={{ background: strip }} />}
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      {children ?? (
        <>
          <div className="num mt-0.5 truncate text-[17px] font-bold leading-tight">{value ?? "—"}</div>
          <div className="truncate text-[11px] text-muted-foreground">{caption ?? " "}</div>
        </>
      )}
    </div>
  );
}
