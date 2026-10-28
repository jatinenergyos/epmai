import { useEffect, useMemo } from "react";
import { Chart, type ChartOptions } from "@highcharts/react";
import "@/components/DemandCalendar.css";
import { dayChartOptions } from "./DayChartCard";
import {
  BLOCKS, blockRange,
  type DayData, type SupplyGraphType,
} from "./weekSupplyData";

const BIG_CHART_H = 470;
// No legend in the pop-up, so no series is ever hidden.
const NO_HIDDEN = new Set<string>();

export type ModalCard = { title: string; data: DayData | null; isToday: boolean; isPast: boolean };

/** Total supply per block (Plants: the day's running total across plants, flat). */
function totals(day: DayData, type: SupplyGraphType): number[] {
  if (type === "plants") return new Array(BLOCKS).fill(day.plants[day.plants.length - 1]?.cumulative ?? 0);
  return Array.from({ length: BLOCKS }, (_, b) => day.seriesList.reduce((s, x) => s + x.data[b], 0));
}

const mw = (v: number) => Math.round(v).toLocaleString("en-IN") + " MW";
const at = (b: number) => `Block ${b + 1} · ${blockRange(b).split("–")[0]}`;

/** One day of the Supply week, opened full size — same look as the Demand week's day pop-up:
 *  ◀ day ▶ + Close, Peak / Minimum / Average / Energy of total supply and a big
 *  stacked chart. ← → step through the cards, Esc closes. */
export function SupplyDayModal({ cards, index, onIndex, onClose, type, names, currentBlock }: {
  cards: ModalCard[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  type: SupplyGraphType;
  names?: string[];
  currentBlock: number;
}) {
  const card = cards[index], day = card.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      else if (e.key === "ArrowRight" && index < cards.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, cards.length, onIndex, onClose]);


  const options = useMemo<ChartOptions | null>(() => {
    if (!day) return null;
    const o = dayChartOptions({ day, type, hidden: NO_HIDDEN, isToday: card.isToday, isPast: card.isPast, currentBlock, height: BIG_CHART_H, names });
    // Keep the tooltip inside the chart: drawn "outside" it lands in a layer below the pop-up's overlay.
    return { ...o, tooltip: { ...o.tooltip, outside: false } };
  }, [day, type, card.isToday, card.isPast, currentBlock, names]);

  // KPIs of total supply across the day.
  const kpis = useMemo(() => {
    if (!day) return null;
    const t = totals(day, type);
    let pk = 0, mn = 0;
    t.forEach((v, b) => { if (v > t[pk]) pk = b; if (v < t[mn]) mn = b; });
    const sum = t.reduce((a, b) => a + b, 0);
    return [
      ["Peak", mw(t[pk]), at(pk)],
      ["Minimum", mw(t[mn]), at(mn)],
      ["Average", mw(sum / BLOCKS), "96 blocks"],
      ["Energy", (sum / 4 / 1000).toFixed(1) + " MU", "Day total"],
    ];
  }, [day, type]);

  return (
    <div className="dc-root">
      <div className="dc-ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" role="dialog" aria-modal="true" aria-label={"Supply detail for " + card.title}>
          <div className="dc-mhead">
            <div className="dc-monthbar">
              <button aria-label="Previous day" disabled={index === 0} onClick={() => onIndex(index - 1)}>◀</button>
              <h3 style={{ minWidth: "14ch" }}>{card.title}</h3>
              <button aria-label="Next day" disabled={index === cards.length - 1} onClick={() => onIndex(index + 1)}>▶</button>
            </div>
            <button onClick={onClose}>Close</button>
          </div>

          {kpis && (
            <section className="dc-kpis">
              {kpis.map((k) => (
                <div className="dc-kpi" key={k[0]}>
                  <div className="l">{k[0]}</div><div className="v">{k[1]}</div><div className="n">{k[2]}</div>
                </div>
              ))}
            </section>
          )}

          <div className="dc-note" style={{ margin: "2px 0 0" }}>Total supply · MW</div>
          <div style={{ height: BIG_CHART_H }}>
            {options ? (
              <Chart key={type + index} options={options} containerProps={{ style: { height: "100%", width: "100%" } }} />
            ) : (
              <div className="grid h-full place-items-center text-[12px] text-muted-foreground">No data</div>
            )}
          </div>
          <p className="dc-note">Hover for block values · ← → step days · Esc closes.</p>
        </div>
      </div>
    </div>
  );
}
