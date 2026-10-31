import { useEffect, useMemo } from "react";
import "@/components/DemandCalendar.css";
import { ExchangeChart } from "./ExchangeChart";
import { blockToTime, type BlockPoint, type Exchange, type Market } from "./marketDetailData";

const BIG_CHART_H = 470;

/** One chart of the pop-up. `title` replaces "IEX · DAM" (e.g. "Fri 30 Oct"); `currentBlock`
 *  overrides the pop-up's (only today shades its block). */
export type ModalChart = { market: Market; exchange: Exchange; data: BlockPoint[]; title?: string; currentBlock?: number | null };

const rs = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN") + " /MWh";
const at = (b: number) => `Block ${b} · ${blockToTime(b)[0]}`;

/** One market on one exchange, opened full size — same look as the Supply week's day pop-up:
 *  ◀ chart ▶ + Close, Peak / Minimum / Average MCP and the cleared energy, then the big chart.
 *  ← → step through the grid's charts, Esc closes. */
export function MarketChartModal({ charts, index, onIndex, onClose, pointWidth, currentBlock }: {
  charts: ModalChart[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  pointWidth: number;
  currentBlock: number | null;
}) {
  const c = charts[index];
  const title = c.title ?? `${c.exchange} · ${c.market}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      else if (e.key === "ArrowRight" && index < charts.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, charts.length, onIndex, onClose]);

  // MCP across the blocks the API sent, and the day's cleared energy (MCV, MW per 15 min → MU).
  const kpis = useMemo(() => {
    const sent = c.data.filter((d) => d.mcpPrice !== null);
    if (!sent.length) return null;
    let pk = sent[0], mn = sent[0];
    for (const d of sent) { if (d.mcpPrice! > pk.mcpPrice!) pk = d; if (d.mcpPrice! < mn.mcpPrice!) mn = d; }
    const avg = sent.reduce((s, d) => s + d.mcpPrice!, 0) / sent.length;
    const mu = sent.reduce((s, d) => s + (d.mcvMW ?? 0), 0) / 4 / 1000;
    return [
      ["Peak MCP", rs(pk.mcpPrice!), at(pk.block)],
      ["Minimum MCP", rs(mn.mcpPrice!), at(mn.block)],
      ["Average MCP", rs(avg), `${sent.length} blocks`],
      ["Cleared energy", mu.toFixed(1) + " MU", "MCV day total"],
    ];
  }, [c.data]);

  return (
    <div className="dc-root">
      <div className="dc-ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dc-modal" role="dialog" aria-modal="true" aria-label={"Market detail for " + title}>
          <div className="dc-mhead">
            <div className="dc-monthbar">
              <button aria-label="Previous chart" disabled={index === 0} onClick={() => onIndex(index - 1)}>◀</button>
              <h3 style={{ minWidth: "14ch" }}>{title}</h3>
              <button aria-label="Next chart" disabled={index === charts.length - 1} onClick={() => onIndex(index + 1)}>▶</button>
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

          <div className="dc-note" style={{ margin: "2px 0 0" }}>Buy / Sell / MCV / ACV · MW (left) · MCP / ACP · ₹/MWh (right)</div>
          <div style={{ height: BIG_CHART_H }}>
            <ExchangeChart
              key={title} exchange={c.exchange} data={c.data} pointWidth={pointWidth * 2} currentBlock={c.currentBlock !== undefined ? c.currentBlock : currentBlock}
              height={BIG_CHART_H} tooltipOutside={false}
            />
          </div>
          <p className="dc-note">Hover for block values · click a legend item to hide it · ← → step charts · Esc closes.</p>
        </div>
      </div>
    </div>
  );
}
