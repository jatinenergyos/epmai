import type { periodsOf } from "./data";

const mw = (v: number) => v.toFixed(1) + " MW";

/** Period Breakdown: peak / min / avg of the forecast for each quarter of the day. */
export function PeriodBreakdown({ rows }: { rows: ReturnType<typeof periodsOf> }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 text-[13px] font-bold">Period Breakdown</div>
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Time</span><span className="text-right">Peak</span><span className="text-right">Min</span><span className="text-right">Avg</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col divide-y">
        {rows.map((r) => (
          <div key={r.label} className="grid flex-1 grid-cols-[1.6fr_1fr_1fr_1fr] items-center text-[12px]">
            <span className="flex items-center gap-2 font-medium">
              <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />{r.label}
            </span>
            <span className="num text-right font-semibold text-red-500">{mw(r.peak)}</span>
            <span className="num text-right font-semibold text-blue-500">{mw(r.min)}</span>
            <span className="num text-right font-semibold text-green-600">{mw(r.avg)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
