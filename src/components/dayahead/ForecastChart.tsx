import { useEffect, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { istNow } from "@/data/engine";
import { BLOCKS, blockTime, todayIso, type Actuals } from "@/lib/dayahead";
import { InteractiveLegend, type LegendItem } from "./InteractiveLegend";

const C = { actual: "#e11d48", forecast: "#2563eb", roast: "#f472b6", mape: "#34d399", manual: "#7c3aed", manualMape: "#a78bfa" };

type Row = {
  b: number; t: string; forecast: number; actual?: number; roast?: [number, number]; roastV?: number;
  mape?: number; manual?: number; manualMape?: number;
  // Actual / Roastering split at the current block: solid up to it, dotted after (today only).
  actualSolid?: number; actualDot?: number; roastSolid?: [number, number]; roastDot?: [number, number];
};

const blockNow = () => { const d = istNow(); return Math.min(BLOCKS - 1, Math.floor((d.getHours() * 60 + d.getMinutes()) / 15)); };

/** The current 15-min block, rechecked every 30 s so the marker moves on with the clock. */
function useLiveBlock(active: boolean) {
  const [b, setB] = useState(blockNow);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setB(blockNow()), 30_000);
    return () => window.clearInterval(id);
  }, [active]);
  return b;
}

const kfmt = (v: number) => (Math.abs(v) >= 1000 ? +(v / 1000).toFixed(1) + "k" : String(Math.round(v)));

function ChartTip({ active, payload, hidden, items }: {
  active?: boolean; payload?: { payload: Row }[]; hidden: Set<string>; items: LegendItem[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const val: Record<string, string | undefined> = {
    mape: r.mape?.toFixed(2), manualMape: r.manualMape?.toFixed(2), roast: r.roastV?.toFixed(2),
    actual: r.actual?.toFixed(2), forecast: r.forecast.toFixed(2), manual: r.manual?.toFixed(2),
  };
  return (
    <div className="min-w-[200px] rounded-lg border bg-popover px-3 py-2 text-[12px] text-popover-foreground shadow-lg">
      <div className="mb-1 font-semibold">Block {r.b + 1} · {r.t}–{blockTime(r.b + 1)}</div>
      {items.filter((it) => !hidden.has(it.key) && val[it.key] != null).map((it) => (
        <div key={it.key} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground"><i className="inline-block h-2 w-2 rounded-full" style={{ background: it.color }} />{it.label}:</span>
          <span className="num font-semibold">{val[it.key]}</span>
        </div>
      ))}
    </div>
  );
}

function download(name: string, href: string) {
  const a = document.createElement("a"); a.href = href; a.download = name; a.click();
}

/** Card A: 96-block day-ahead forecast. Actual / Roastering / MAPE only when `actuals` is given
 *  (today or earlier); Manual Forecast + Manual MAPE only when that data exists. */
export function ForecastChart({ forecast, actuals, date }: { forecast: number[]; actuals: Actuals | null; date: string }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const isToday = date === todayIso();
  const liveB = useLiveBlock(isToday);
  // Past days are all "done": solid to the end. Today splits at the current block.
  const cut = isToday ? liveB : BLOCKS - 1;

  const rows = useMemo((): Row[] => Array.from({ length: BLOCKS }, (_, b) => {
    const r: Row = { b, t: blockTime(b), forecast: forecast[b] };
    if (actuals) {
      const a = actuals.actual[b], roast: [number, number] = [a, a + actuals.roastering[b]];
      Object.assign(r, { actual: a, roastV: actuals.roastering[b], roast, mape: actuals.mape[b] });
      // Both halves include the current block so the two segments join up.
      if (b <= cut) { r.actualSolid = a; r.roastSolid = roast; }
      if (b >= cut) { r.actualDot = a; r.roastDot = roast; }
    }
    if (actuals?.manual) r.manual = actuals.manual[b];
    if (actuals?.manualMape) r.manualMape = actuals.manualMape[b];
    return r;
  }), [forecast, actuals, cut]);

  const items = useMemo((): LegendItem[] => [
    ...(actuals ? [{ key: "actual", label: "Actual (MW)", color: C.actual }] : []),
    { key: "forecast", label: "System Forecast (MW)", color: C.forecast },
    ...(actuals?.manual ? [{ key: "manual", label: "Manual Forecast (MW)", color: C.manual }] : []),
    ...(actuals ? [{ key: "roast", label: "Roastering", color: C.roast }, { key: "mape", label: "System MAPE %", color: C.mape }] : []),
    ...(actuals?.manualMape ? [{ key: "manualMape", label: "Manual MAPE %", color: C.manualMape }] : []),
  ], [actuals]);

  // Left axis hugs the visible MW series: ~97% of the lowest visible value, rescaling on toggle.
  const [lo, hi] = useMemo(() => {
    const vals: number[] = [];
    rows.forEach((r) => {
      if (!hidden.has("forecast")) vals.push(r.forecast);
      if (r.actual != null && !hidden.has("actual")) vals.push(r.actual);
      if (r.roast && !hidden.has("roast")) vals.push(r.roast[1]);
      if (r.manual != null && !hidden.has("manual")) vals.push(r.manual);
    });
    if (!vals.length) return [0, 1];
    return [Math.floor((Math.min(...vals) * 0.97) / 100) * 100, Math.ceil((Math.max(...vals) * 1.02) / 100) * 100];
  }, [rows, hidden]);

  // Right axis is 0–9% by default, stretched in steps of 3 when MAPE runs higher.
  const pctMax = Math.max(9, Math.ceil(Math.max(0, ...rows.map((r) => Math.max(r.mape ?? 0, r.manualMape ?? 0))) / 3) * 3);
  const pctTicks = Array.from({ length: pctMax / 3 + 1 }, (_, k) => k * 3);

  const toggle = (k: string) => setHidden((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const on = (k: string) => !hidden.has(k) && items.some((it) => it.key === k);

  const exportCsv = () => {
    const cols = ["Time", "System Forecast (MW)", ...(actuals ? ["Actual (MW)", "Roastering", "System MAPE %"] : [])];
    const lines = rows.map((r) => [r.t, r.forecast, ...(actuals ? [r.actual, r.roastV, r.mape] : [])].join(","));
    download(`day-ahead-forecast-${date}.csv`, "data:text/csv;charset=utf-8," + encodeURIComponent([cols.join(","), ...lines].join("\n")));
    setMenu(false);
  };
  const exportPng = () => {
    const svg = boxRef.current?.querySelector("svg.recharts-surface");
    setMenu(false);
    if (!svg) return;
    const { width, height } = svg.getBoundingClientRect();
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = width * 2; c.height = height * 2;
      const ctx = c.getContext("2d")!; ctx.scale(2, 2); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
      download(`day-ahead-forecast-${date}.png`, c.toDataURL("image/png"));
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[13px] font-bold">96-Block Day-Ahead Forecast</div>
        <div className="relative">
          <button type="button" aria-label="Export chart" onClick={() => setMenu((m) => !m)}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <Menu className="h-4 w-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-8 z-20 w-36 rounded-md border bg-popover py-1 text-[12px] shadow-lg">
              <button type="button" onClick={exportCsv} className="block w-full px-3 py-1.5 text-left hover:bg-accent">Download CSV</button>
              <button type="button" onClick={exportPng} className="block w-full px-3 py-1.5 text-left hover:bg-accent">Download PNG</button>
            </div>
          )}
        </div>
      </div>
      <div ref={boxRef} className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="t" interval={1} angle={-45} textAnchor="end" height={44} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="mw" domain={[lo, hi]} allowDataOverflow tickFormatter={kfmt} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="pct" orientation="right" domain={[0, pctMax]} ticks={pctTicks} allowDataOverflow tickLine={false} axisLine={false} width={24} tick={{ fontSize: 10 }} />
            {/* bars first so they sit behind the lines */}
            {on("mape") && <Bar yAxisId="pct" dataKey="mape" fill={C.mape} fillOpacity={0.3} isAnimationActive={false} />}
            {on("manualMape") && <Area yAxisId="pct" dataKey="manualMape" stroke={C.manualMape} fill={C.manualMape} fillOpacity={0.25} isAnimationActive={false} />}
            {/* current block (today only): a plain bar over that block's own 15-min slot (x1 = x2 fills
                its whole band, e.g. 12:15–12:30), moving with the clock */}
            {isToday && (
              <ReferenceArea yAxisId="mw" x1={blockTime(liveB)} x2={blockTime(liveB)} fill="#14b8a6" fillOpacity={0.18} ifOverflow="visible" />
            )}
            {on("roast") && <Area yAxisId="mw" dataKey="roastSolid" stroke={C.roast} strokeWidth={1} fill={C.roast} fillOpacity={0.3} isAnimationActive={false} activeDot={false} />}
            {on("roast") && isToday && <Area yAxisId="mw" dataKey="roastDot" stroke={C.roast} strokeWidth={1} strokeDasharray="2 3" fill={C.roast} fillOpacity={0.12} isAnimationActive={false} activeDot={false} />}
            {on("actual") && <Line yAxisId="mw" dataKey="actualSolid" stroke={C.actual} strokeWidth={2} dot={false} isAnimationActive={false} />}
            {on("actual") && isToday && <Line yAxisId="mw" dataKey="actualDot" stroke={C.actual} strokeWidth={2} strokeDasharray="2 3" dot={false} isAnimationActive={false} />}
            {on("forecast") && <Line yAxisId="mw" dataKey="forecast" stroke={C.forecast} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />}
            {on("manual") && <Line yAxisId="mw" dataKey="manual" stroke={C.manual} strokeWidth={2} dot={false} isAnimationActive={false} />}
            {/* No slide animation: it made the box trail and jump between blocks. */}
            <Tooltip isAnimationActive={false} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "4 4" }}
              content={<ChartTip hidden={hidden} items={items} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-1"><InteractiveLegend items={items} hidden={hidden} onToggle={toggle} /></div>
    </div>
  );
}
