import { useMemo } from "react";
import { Chart, type ChartOptions } from "@highcharts/react";
import "@/components/DemandCalendar.css";
import { dayChartOptions } from "./DayChartCard";
import { BLOCKS, type DayData, type SupplyGraphType } from "./weekSupplyData";

const BOX_CHART_H = 95;

/** Total supply per block (Plants: the day's running total across plants, flat). */
function totals(day: DayData, type: SupplyGraphType): number[] {
  if (type === "plants") return new Array(BLOCKS).fill(day.plants[day.plants.length - 1]?.cumulative ?? 0);
  return Array.from({ length: BLOCKS }, (_, b) => day.seriesList.reduce((s, x) => s + x.data[b], 0));
}

/** One day of the month calendar, in the Demand month calendar's box style: day number, peak
 *  supply ("Pk") and the day's supply energy chip (MU) over a mini stacked chart. Click opens it
 *  full size. Must sit inside a `.dc-root`. */
export function MonthDayBox({ dayNum, isToday, isPast, currentBlock, type, day, isLoading, hidden, names, onOpen }: {
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  currentBlock: number;
  type: SupplyGraphType;
  day: DayData | null;
  isLoading: boolean;
  hidden: Set<string>;
  names?: string[];
  onOpen: () => void;
}) {
  const options = useMemo<ChartOptions | null>(
    () => (day ? dayChartOptions({ day, type, hidden, isToday, isPast, currentBlock, height: BOX_CHART_H, names, compact: true }) : null),
    [day, type, hidden, isToday, isPast, currentBlock, names],
  );
  const stats = useMemo(() => {
    if (!day) return null;
    const t = totals(day, type);
    // MW per 15-min block → MWh (÷4) → MU (÷1000).
    return { peak: Math.round(Math.max(...t)), mu: Math.round(t.reduce((a, b) => a + b, 0) / 4 / 1000) };
  }, [day, type]);

  return (
    <div
      role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="dc-cell"
      style={isToday ? { borderColor: "#14b8a6", boxShadow: "0 0 0 1px #14b8a6" } : undefined}
      aria-label={`Open day ${dayNum}`}
    >
      <div className="top">
        <span className="dn">{dayNum}{isToday && <small style={{ color: "#0d9488" }}>today</small>}</span>
        {stats && !isLoading && <span className="pk">Pk {stats.peak.toLocaleString("en-IN")}</span>}
        {stats && !isLoading && <span className="dc-chip nt">{stats.mu.toLocaleString("en-IN")} MU</span>}
      </div>
      <div style={{ height: BOX_CHART_H }}>
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded bg-muted" />
        ) : options ? (
          <Chart options={options} containerProps={{ style: { height: "100%", width: "100%" } }} />
        ) : (
          <div className="grid h-full place-items-center text-[11px] text-muted-foreground">No data</div>
        )}
      </div>
    </div>
  );
}
