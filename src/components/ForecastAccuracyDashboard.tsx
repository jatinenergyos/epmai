// A one-off "96-Block Day-Ahead Forecast" dashboard section, built to match an
// external reference screenshot exactly (see the ported prompt in chat history).
// Everything here — KPI numbers, the 96-block series, the error-bucket tables — is
// dummy/placeholder data for a visual mockup; none of it reads from the app's real
// data model. Shown only on Demand's "Demand Forecast" page (see pages/CommandCentre/CellPage.tsx), so it
// doesn't affect any other module/horizon/sub-metric.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Area, Bar, CartesianGrid, ComposedChart, Legend as RLegend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { dLabel, NOW, type TfId } from "@/data/engine";
import { buildForecastBlocks, lastBlockForDate, type ForecastBlock } from "@/data/forecastBlocks";

/** Block-number x-axis ticks: every 3rd block across the full 96, always ending
 *  on the last one so the axis never gets cut short. */
function buildTicks(startI: number, endI: number): number[] {
  const ticks: number[] = [];
  for (let v = startI; v < endI; v += 3) ticks.push(v);
  ticks.push(endI);
  return ticks;
}

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function endOfWeek(d: Date) {
  const e = startOfWeek(d); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999);
  return e;
}

/** Day-ahead only: lets you page within the current week (Mon–Sun), default today.
 *  The chart below fills a past day fully, today up to the current block, and leaves
 *  a future day empty. */
export function DemandForecastWeekNav({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const weekStart = useMemo(() => startOfWeek(NOW), []);
  const weekEnd = useMemo(() => endOfWeek(NOW), []);
  const shift = (n: number) => {
    const d = new Date(date); d.setDate(d.getDate() + n);
    if (d >= weekStart && d <= weekEnd) onChange(d);
  };
  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
      <button type="button" aria-label="Previous day" disabled={date.getTime() <= weekStart.getTime()} onClick={() => shift(-1)}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="num px-1 font-medium">{dLabel(date)}</span>
      <button type="button" aria-label="Next day" disabled={date.getTime() >= weekEnd.getTime()} onClick={() => shift(1)}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Day-ahead only: a fixed "tomorrow" date (not navigable — day-ahead always covers
 *  the one day ahead). */
export function TomorrowLabel() {
  const d = new Date(NOW); d.setDate(d.getDate() + 1);
  return <div className="inline-flex items-center rounded-md border bg-card px-2 py-1 text-[13px] font-medium">{dLabel(d)}</div>;
}

/** Real-time, week/month/year-ahead, long-term: a free, unbounded date nav (not
 *  wired to any data — same dummy control as everywhere else) shown where it used
 *  to sit, top-right of the page header. Intra-day and Day-ahead are untouched —
 *  they keep their own current/week-bounded nav instead. */
export function FreeDateNav() {
  const [date, setDate] = useState(() => new Date(2026, 9, 21));
  const shift = (n: number) => setDate((prev) => { const d = new Date(prev); d.setDate(d.getDate() + n); return d; });
  return (
    <div className="inline-flex items-center gap-1 rounded-md border bg-card p-1 text-[13px]">
      <button type="button" aria-label="Previous day" onClick={() => shift(-1)}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span className="num px-1 font-medium">{dLabel(date)}</span>
      <button type="button" aria-label="Next day" onClick={() => shift(1)}
        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function XTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) {
  return (
    <text x={x} y={(y ?? 0) + 12} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
      {(payload?.value ?? 0) + 1}
    </text>
  );
}

function TipRow({ c, n, v }: { c: string; n: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: c }} />{n}</span>
      <span className="num font-medium">{v}</span>
    </div>
  );
}

/** Custom tooltip: just Actual / System Forecast / Roastering (the delta, not the
 *  stacked plot value) / System MAPE % — no "Likely range" band, no duplicate time. */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { payload: ForecastBlock }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  if (r.actual == null) return null;
  return (
    <div className="min-w-[180px] rounded-md border bg-popover p-2.5 text-xs text-popover-foreground shadow-lg">
      <div className="mb-1.5 font-semibold">Block {(label ?? 0) + 1}</div>
      <div className="space-y-0.5">
        <TipRow c="#e11d48" n="Actual (MW)" v={r.actual.toLocaleString("en-IN")} />
        <TipRow c="#2563eb" n="System Forecast (MW)" v={r.forecast!.toLocaleString("en-IN")} />
        <TipRow c="#fca5a5" n="Roastering" v={(r.roasteringDelta! >= 0 ? "+" : "") + r.roasteringDelta} />
        <TipRow c="#10b981" n="System MAPE %" v={r.mape + "%"} />
      </div>
    </div>
  );
}

const SYS_BUCKETS = ["0–1%", "1–2%", "2–3%", "3–4%", "4–5%", "5–6%", ">6%"];
const MAN_BUCKETS = ["0–0.5%", "0.5–1%", "1–1.5%", "1.5–2%", "2–2.5%", "2.5–3%", ">3%"];

function ErrorTable({ title, buckets, color }: { title: string; buckets: string[]; color?: string }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border">
      <div className="bg-muted/60 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">{title}</div>
      <div className="flex items-center justify-between bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
        <span>Error Range</span><span>Percent</span>
      </div>
      <div className="flex flex-1 flex-col divide-y">
        {buckets.map((b) => (
          <div key={b} className="flex flex-1 items-center justify-between px-2 text-[13px]" style={color ? { color } : undefined}>
            <span>{b}</span><span className="num">0%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForecastAccuracyDashboard({ tf, date }: { tf: TfId; date?: Date }) {
  const rows = useMemo(() => buildForecastBlocks(tf, date ? lastBlockForDate(date) : undefined), [tf, date]);
  const ticks = useMemo(() => buildTicks(rows[0]?.i ?? 0, rows[rows.length - 1]?.i ?? 95), [rows]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.9fr_1fr]">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 text-sm font-semibold">96-Block Day-Ahead Forecast</div>
        <div style={{ height: 460 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 4, right: 8, bottom: 28, left: 4 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="i" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => String(v + 1)} ticks={ticks} height={22} axisLine={false} tickLine={false} tick={<XTick />} />
              <YAxis yAxisId="mw" domain={[7500, 12000]} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 18]} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 10 }} />
              <Bar yAxisId="pct" dataKey="mape" name="System MAPE %" fill="#6ee7b7" fillOpacity={0.55} isAnimationActive={false} maxBarSize={10} />
              <Area yAxisId="mw" dataKey="roasterRange" name="Roastering" stroke="#f43f5e" strokeWidth={1} fill="#fca5a5" fillOpacity={0.38} isAnimationActive={false} connectNulls={false} />
              <Line yAxisId="mw" dataKey="actual" name="Actual (MW)" type="monotone" stroke="#e11d48" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
              <Line yAxisId="mw" dataKey="forecast" name="System Forecast (MW)" type="monotone" stroke="#2563eb" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false} />
              <Tooltip content={<ChartTip />} />
              <RLegend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex h-full flex-col rounded-lg border bg-card p-4">
        <div className="mb-2 text-sm font-semibold">Forecast Error Analysis</div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <ErrorTable title="System Forecast" buckets={SYS_BUCKETS} />
          <ErrorTable title="Manual Forecast" buckets={MAN_BUCKETS} color="#3b82f6" />
        </div>
      </div>
    </div>
  );
}
